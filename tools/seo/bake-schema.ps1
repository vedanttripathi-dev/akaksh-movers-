# Put the JSON-LD into the served HTML, instead of only building it in the
# browser.
#
# WHY
# ---
# js/schema.js built the structured data at runtime and appended it to
# <head>. Probed against the static files, index.html contained ZERO
# application/ld+json blocks. Googlebot renders JavaScript so it got there
# eventually, but Bing's renderer is much weaker and most of the fourteen AI
# crawlers robots.txt deliberately welcomes do not render at all. To those,
# the MovingCompany node -- address, telephone, opening hours, areaServed,
# sameAs -- did not exist.
#
# THERE IS STILL ONLY ONE THING THAT BUILDS THE GRAPH
# ---------------------------------------------------
# This script does NOT reimplement schema.js. Re-deriving the graph in
# PowerShell would be a second source of truth that drifts the first time
# someone edits the JavaScript, which is exactly the failure this codebase is
# built to avoid.
#
# Instead, tools/seo/schema-data.json holds the output CAPTURED from running
# the real pages in a browser against the dev server. This script only
# reassembles each page's graph from that capture, in the same order
# buildSchema() uses, and writes it into the page.
#
# The reassembly is not trusted either: the capture records the SHA-256 of
# the exact JSON string schema.js produced for each page, and a page is
# skipped with an error if the reassembled string does not hash to it. So a
# mistake in the ordering below cannot reach a page silently.
#
# HOW TO RE-CAPTURE (needed whenever js/config.js or js/schema.js changes)
# ------------------------------------------------------------------------
#   1. .\serve.ps1 -Port 8796 -NoCsp
#      -NoCsp matters: the capture loads each page in an iframe, and the
#      production CSP sets frame-ancestors 'none', which blocks that. The
#      flag affects only this local server.
#   2. Open http://localhost:8796/ and, for every path in schema-data.json,
#      load it in an iframe, wait for
#        script[type="application/ld+json"][data-schema]
#      to be populated, and record:
#        - the full JSON string's SHA-256        -> "sha256"
#        - the node whose @id ends #webpage      -> "webpage"
#        - the node whose @id ends #breadcrumbs  -> "breadcrumb" (or null)
#        - the node whose @id ends #faq          -> "faq" (or null)
#        - whether any Service nodes are present -> "hasServices"
#      The organization, website and the eight Service nodes are identical on
#      every page and live once under "shared".
#      IMPORTANT: capture the homepage by loading "/", not "/index.html".
#   3. Re-run this script. Any transcription mistake fails the hash check.
#
# Idempotent: an existing baked block is replaced, not stacked.

param(
  # Report what would change without writing anything.
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Split-Path (Split-Path $here -Parent) -Parent

$dataPath = Join-Path $here 'schema-data.json'
if (-not (Test-Path $dataPath)) { throw "missing capture: $dataPath" }
$data = [IO.File]::ReadAllText($dataPath) | ConvertFrom-Json

# ---------------------------------------------------------------------------
# JSON serialisation that matches JSON.stringify()
# ---------------------------------------------------------------------------
# ConvertTo-Json cannot be used here. It reorders nothing but it escapes
# differently (it emits < for '<' and turns non-ASCII into \uXXXX), it
# adds whitespace, and below -Depth it silently stringifies objects. The hash
# check would fail on every page and the cause would not be obvious.
#
# This writes the same bytes JSON.stringify() does: no whitespace, only the
# escapes the JSON spec requires plus the control characters, and every other
# character -- em dashes, rupee signs, accented names -- emitted literally as
# UTF-8.
function ConvertTo-CompactJson {
  param([Parameter(Mandatory = $true)]$Value)

  $sb = New-Object System.Text.StringBuilder
  Write-JsonValue -Value $Value -Builder $sb
  return $sb.ToString()
}

function Write-JsonString {
  param([string]$Text, [System.Text.StringBuilder]$Builder)
  $null = $Builder.Append('"')
  foreach ($ch in $Text.ToCharArray()) {
    switch ($ch) {
      '"'      { $null = $Builder.Append('\"');  continue }
      '\'      { $null = $Builder.Append('\\');  continue }
      "`b"     { $null = $Builder.Append('\b');  continue }
      "`f"     { $null = $Builder.Append('\f');  continue }
      "`n"     { $null = $Builder.Append('\n');  continue }
      "`r"     { $null = $Builder.Append('\r');  continue }
      "`t"     { $null = $Builder.Append('\t');  continue }
      default  {
        if ([int]$ch -lt 0x20) {
          $null = $Builder.Append(('\u{0:x4}' -f [int]$ch))
        } else {
          $null = $Builder.Append($ch)
        }
        continue
      }
    }
  }
  $null = $Builder.Append('"')
}

function Write-JsonValue {
  param($Value, [System.Text.StringBuilder]$Builder)

  if ($null -eq $Value) { $null = $Builder.Append('null'); return }

  if ($Value -is [bool]) {
    $null = $Builder.Append($(if ($Value) { 'true' } else { 'false' })); return
  }
  if ($Value -is [string]) { Write-JsonString -Text $Value -Builder $Builder; return }
  if ($Value -is [int] -or $Value -is [long] -or $Value -is [double] -or $Value -is [decimal]) {
    $null = $Builder.Append(([string]$Value)); return
  }

  if ($Value -is [System.Collections.IEnumerable]) {
    $null = $Builder.Append('[')
    $first = $true
    foreach ($item in $Value) {
      if (-not $first) { $null = $Builder.Append(',') }
      Write-JsonValue -Value $item -Builder $Builder
      $first = $false
    }
    $null = $Builder.Append(']')
    return
  }

  # PSCustomObject from ConvertFrom-Json keeps the source file's key order.
  $null = $Builder.Append('{')
  $first = $true
  foreach ($prop in $Value.PSObject.Properties) {
    if (-not $first) { $null = $Builder.Append(',') }
    Write-JsonString -Text $prop.Name -Builder $Builder
    $null = $Builder.Append(':')
    Write-JsonValue -Value $prop.Value -Builder $Builder
    $first = $false
  }
  $null = $Builder.Append('}')
  return
}

function Get-Sha256Hex {
  param([string]$Text)
  $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return (($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join '') }
  finally { $sha.Dispose() }
}

# ---------------------------------------------------------------------------
# Reassemble and write
# ---------------------------------------------------------------------------
$written = 0; $unchanged = 0; $failed = 0

foreach ($prop in $data.pages.PSObject.Properties) {
    $path = $prop.Name
    $page = $prop.Value

    $file = Join-Path $proj ($path.TrimStart('/') -replace '/', '\')
    if (-not (Test-Path $file)) { throw "capture names a page that does not exist: $path" }

    # Same order as buildSchema(): organization, website, webpage, breadcrumb,
    # faq, then the Service nodes.
    $graph = New-Object System.Collections.ArrayList
    $null = $graph.Add($data.shared.org)
    $null = $graph.Add($data.shared.site)
    $null = $graph.Add($page.webpage)
    if ($page.breadcrumb) { $null = $graph.Add($page.breadcrumb) }
    if ($page.faq)        { $null = $graph.Add($page.faq) }
    if ($page.hasServices) { foreach ($s in $data.shared.services) { $null = $graph.Add($s) } }

    $payload = [ordered]@{ '@context' = 'https://schema.org'; '@graph' = $graph.ToArray() }
    $json = ConvertTo-CompactJson ([pscustomobject]$payload)

    $actual = Get-Sha256Hex $json
    if ($actual -ne $page.sha256) {
        Write-Host ("  HASH MISMATCH  {0}" -f $path) -ForegroundColor Red
        Write-Host ("    captured from the browser: {0}" -f $page.sha256) -ForegroundColor DarkGray
        Write-Host ("    reassembled here:          {0}" -f $actual) -ForegroundColor DarkGray
        Write-Host "    nothing written for this page." -ForegroundColor DarkGray
        $failed++
        continue
    }

    $block = '<script type="application/ld+json" data-schema>' + $json + '</script>'

    $text = [IO.File]::ReadAllText($file)
    $existing = [regex]::Match($text, '<script type="application/ld\+json" data-schema>.*?</script>', 'Singleline')

    if ($existing.Success) {
        if ($existing.Value -eq $block) { $unchanged++; continue }
        $new = $text.Remove($existing.Index, $existing.Length).Insert($existing.Index, $block)
    } else {
        # Immediately before </head>, so it is in the first response and ahead
        # of the module script that will later replace it.
        $at = $text.IndexOf('</head>')
        if ($at -lt 0) { throw "no </head> in $path" }
        $new = $text.Insert($at, $block + "`r`n")
    }

    if ($WhatIf) {
        Write-Host ("  would write {0}  ({1:N0} B of JSON)" -f $path, $json.Length)
    } else {
        [IO.File]::WriteAllText($file, $new, (New-Object Text.UTF8Encoding $false))
        Write-Host ("  baked {0,-42} {1,6:N0} B" -f $path, $json.Length)
    }
    $written++
}

# ---------------------------------------------------------------------------
# Staleness manifest
# ---------------------------------------------------------------------------
# The capture is a snapshot of what two files produced. Record what they
# looked like, so check.ps1 can say "re-capture" instead of letting a stale
# graph sit in twenty pages looking perfectly valid.
if (-not $WhatIf -and $failed -eq 0) {
    $manifest = [ordered]@{
        bakedAt    = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        pages      = $data.pages.PSObject.Properties.Name.Count
        configSha  = Get-Sha256Hex ([IO.File]::ReadAllText((Join-Path $proj 'js\config.js')))
        schemaSha  = Get-Sha256Hex ([IO.File]::ReadAllText((Join-Path $proj 'js\schema.js')))
        note       = 'If either hash no longer matches the file, the capture in schema-data.json is stale. Re-capture per the header of bake-schema.ps1, then re-run it.'
    }
    $out = ($manifest.GetEnumerator() | ForEach-Object { '  "{0}": "{1}"' -f $_.Key, $_.Value }) -join ",`r`n"
    [IO.File]::WriteAllText((Join-Path $here 'schema-manifest.json'), "{`r`n$out`r`n}`r`n",
                            (New-Object Text.UTF8Encoding $false))
}

Write-Host ""
Write-Host ("baked: {0}   already current: {1}   failed: {2}" -f $written, $unchanged, $failed)
if ($failed -gt 0) {
    Write-Host "A hash mismatch means the reassembly above does not match what the browser produced." -ForegroundColor Yellow
    Write-Host "Either schema-data.json was edited by hand, or buildSchema()'s node order changed." -ForegroundColor Yellow
    exit 1
}
Write-Host "Note: assemble.ps1 does NOT carry these blocks, so re-run this after it."
