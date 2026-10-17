<#
.SYNOPSIS
    Builds the site's inner pages from content fragments.

.DESCRIPTION
    THIS IS AN AUTHORING AID, NOT A BUILD STEP.

    The site deploys as plain static HTML with no build process — exactly
    like the homepage. This script exists only so that the shared chrome
    (the <head> boilerplate, the icon sprite, the header and the footer) does
    not have to be hand-copied into fifteen files, where it would drift out
    of step the first time anything changed.

    It reads the chrome straight out of index.html, so index.html remains the
    single source of truth for it. Then, for each fragment in tools/pages/,
    it writes a complete, standalone .html file.

    You do NOT need to run this to deploy. The generated .html files are the
    deliverable and can be edited directly afterwards. Run it again only if
    you change the header, the footer or the sprite and want those changes
    pushed back out to every page — and note that doing so will overwrite
    any edits made directly to the generated files.

.PARAMETER Check
    Report what would be written without writing anything.

.EXAMPLE
    .\tools\assemble.ps1
.EXAMPLE
    .\tools\assemble.ps1 -Check
#>

[CmdletBinding()]
param([switch]$Check)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$indexPath = Join-Path $root 'index.html'

if (-not (Test-Path $indexPath)) { throw "Cannot find index.html at $indexPath" }
$index = [IO.File]::ReadAllText($indexPath)

# ---------------------------------------------------------------------------
# Pull the shared chrome out of index.html.
# ---------------------------------------------------------------------------
function Slice {
    param([string]$Text, [string]$StartPattern, [string]$EndPattern)
    $m1 = [regex]::Match($Text, $StartPattern)
    if (-not $m1.Success) { throw "Chrome marker not found: $StartPattern" }
    $m2 = [regex]::Match($Text.Substring($m1.Index), $EndPattern)
    if (-not $m2.Success) { throw "Chrome end marker not found: $EndPattern" }
    return $Text.Substring($m1.Index, $m2.Index + $m2.Length)
}

$sprite = Slice $index '<svg class="sprite"' '</svg>\s*'
$header = Slice $index '<header class="header"' '</header>'
$footer = Slice $index '<footer class="footer"' '</footer>'
# The scripts block used to start at the GSAP tag. GSAP went with the journey
# section, so the marker is now the one module every page loads.
$scripts = Slice $index '<script type="module" src="/js/main.js"' '</body>'
$scripts = $scripts -replace '</body>\s*$', ''

Write-Host ("chrome extracted: sprite {0}B, header {1}B, footer {2}B" -f `
    $sprite.Length, $header.Length, $footer.Length) -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
# Build each page.
# ---------------------------------------------------------------------------
$pagesDir = Join-Path $PSScriptRoot 'pages'
if (-not (Test-Path $pagesDir)) { throw "No fragments found at $pagesDir" }

# The live domain. This is ALSO in js/config.js (web.origin) and in the <head>
# of index.html, because a crawler must see it without running JavaScript.
# Change it in all three or the canonical tags will disagree with each other.
$origin = 'https://akashmovers.com'
$written = 0

foreach ($file in Get-ChildItem $pagesDir -Filter '*.part' | Sort-Object Name) {

    $raw = [IO.File]::ReadAllText($file.FullName)
    $split = $raw -split "(?m)^---\s*$", 2
    if ($split.Count -lt 2) { throw "$($file.Name): missing '---' separator between metadata and content" }

    $meta = @{}
    foreach ($line in ($split[0] -split "`r?`n")) {
        if ($line -match '^\s*([A-Z]+)\s*:\s*(.*)$') { $meta[$matches[1]] = $matches[2].Trim() }
    }
    $body = $split[1].Trim()

    foreach ($required in @('SLUG', 'TITLE', 'DESC')) {
        if (-not $meta.ContainsKey($required)) { throw "$($file.Name): missing $required" }
    }

    $slug = $meta['SLUG']
    $canonical = "$origin/$slug"

    # Breadcrumbs: "Label|href ; Label|"  (empty href = current page)
    #
    # The separator requires WHITESPACE BEFORE the semicolon, and that is not
    # fussiness. The old pattern was '\s*;\s*', which also split on the
    # semicolon that ends an HTML entity: "Loading &amp; unloading" became two
    # crumbs, "Loading &amp" and "unloading", both marked aria-current="page".
    # It shipped that way on the loading-unloading and packing-unpacking
    # pages, in the visible trail and in the BreadcrumbList structured data.
    # An entity's semicolon never has a space in front of it; the separator
    # always does.
    $crumbHtml = ''
    if ($meta.ContainsKey('CRUMBS') -and $meta['CRUMBS']) {
        $items = foreach ($crumb in ($meta['CRUMBS'] -split '\s+;\s*')) {
            $parts = $crumb -split '\|', 2
            $label = $parts[0].Trim()
            $href = if ($parts.Count -gt 1) { $parts[1].Trim() } else { '' }
            if ($href) { "          <li><a href=`"$href`">$label</a></li>" }
            else { "          <li><span aria-current=`"page`">$label</span></li>" }
        }
        $crumbHtml = @"
      <nav class="crumbs" aria-label="Breadcrumb">
        <ol>
$($items -join "`r`n")
        </ol>
      </nav>
"@
    }

    $heading = if ($meta.ContainsKey('HEADING')) { $meta['HEADING'] } else { $meta['TITLE'] }
    $lead = if ($meta.ContainsKey('LEAD')) { "        <p class=`"lead`">$($meta['LEAD'])</p>" } else { '' }

    $pageHead = @"
  <section class="page-head">
    <div class="wrap">
$crumbHtml
      <div class="wrap-narrow">
        <h1>$heading</h1>
$lead
      </div>
    </div>
  </section>
"@

    $html = @"
<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>$($meta['TITLE'])</title>
<meta name="description" content="$($meta['DESC'])">
<link rel="canonical" href="$canonical">
<meta name="robots" content="index, follow, max-image-preview:large">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Akash Movers">
<meta property="og:title" content="$($meta['TITLE'])">
<meta property="og:description" content="$($meta['DESC'])">
<meta property="og:url" content="$canonical">
<meta property="og:image" content="$origin/assets/images/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="$($meta['TITLE'])">
<meta name="twitter:description" content="$($meta['DESC'])">
<meta name="twitter:image" content="$origin/assets/images/og-image.png">

<meta name="theme-color" content="#7f011f">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">

<link rel="preload" href="/assets/fonts/playfair-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/style.css">

<script>document.documentElement.classList.add('js');</script>
</head>

<body>
<a class="skip" href="#main">Skip to main content</a>

$sprite

$header

<main id="main">
$pageHead
$body
</main>

$footer

$scripts
</body>
</html>
"@

    $outPath = Join-Path $root $slug
    $outDir = Split-Path $outPath -Parent
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

    if ($Check) {
        Write-Host ("would write  {0,-42} {1} KB" -f $slug, [math]::Round($html.Length / 1KB, 1)) -ForegroundColor Yellow
    } else {
        [IO.File]::WriteAllText($outPath, $html, (New-Object Text.UTF8Encoding $false))
        Write-Host ("wrote  {0,-42} {1} KB" -f $slug, [math]::Round($html.Length / 1KB, 1)) -ForegroundColor Green
        $written++
    }
}

Write-Host ""
Write-Host ("$written page(s) written.") -ForegroundColor Cyan
Write-Host "Reminder: these are plain static files. You can edit them directly;" -ForegroundColor DarkGray
Write-Host "re-running this script will overwrite those edits." -ForegroundColor DarkGray

# This script rebuilds each page from its fragment, which discards the baked
# JSON-LD block along with everything else that was not in the fragment. It
# is NOT re-baked automatically, and that is deliberate: if the fragment's
# content changed, the existing capture is stale, and re-stamping it would
# quietly publish structured data that no longer matches the visible page.
# Re-capture first when the content changed; see the header of
# tools/seo/bake-schema.ps1. tools/check.ps1 fails until this is done.
Write-Host ""
Write-Host "NEXT: the structured data was removed from these pages." -ForegroundColor Yellow
Write-Host "      Run  tools\seo\bake-schema.ps1  to put it back." -ForegroundColor Yellow
Write-Host "      If you changed page CONTENT (titles, descriptions, FAQs), re-capture" -ForegroundColor Yellow
Write-Host "      first -- see the header of that script. check.ps1 will tell you." -ForegroundColor Yellow
