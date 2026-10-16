# One reader for the name/address/phone values in js/config.js.
#
# Both fill-static-nap.ps1 (which writes them into the footer markup) and
# check.ps1 (which fails the build if the markup and the config disagree)
# source this file, so there is exactly one place that knows how to parse
# config.js. Two parsers would be two things to keep in step, which is the
# problem this is here to prevent.
#
# This is a deliberately narrow regex reader, not a JavaScript evaluator. It
# reads five scalar strings and the five address fields, and it THROWS if any
# of them is missing rather than returning an empty string -- a blank phone
# number silently written into twenty footers is exactly the failure worth
# being noisy about.

function Get-ConfigString {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Key,
    [switch]$Optional
  )
  # `key: 'value'` or `key: "value"`, taking the FIRST occurrence. The address
  # fields `city` and `state` also appear later under serviceAreas; the
  # contact block is earlier in the file, so first-match is correct here and
  # the caller slices the address block out before asking, below.
  $m = [regex]::Match($Text, ('(?m)^\s*' + [regex]::Escape($Key) + "\s*:\s*'([^']*)'"))
  if (-not $m.Success) {
    $m = [regex]::Match($Text, ('(?m)^\s*' + [regex]::Escape($Key) + '\s*:\s*"([^"]*)"'))
  }
  if (-not $m.Success) {
    if ($Optional) { return $null }
    throw "config.js: could not read '$Key'"
  }
  return $m.Groups[1].Value
}

function Read-Nap {
  param([Parameter(Mandatory = $true)][string]$ProjectRoot)

  $cfgPath = Join-Path $ProjectRoot 'js\config.js'
  if (-not (Test-Path $cfgPath)) { throw "missing $cfgPath" }
  $cfg = [IO.File]::ReadAllText($cfgPath)

  # Slice the address object so `city`/`state` cannot be picked up from the
  # serviceAreas entries further down the file.
  $aStart = $cfg.IndexOf('address: {')
  if ($aStart -lt 0) { throw 'config.js: no `address: {` block' }
  $aEnd = $cfg.IndexOf('},', $aStart)
  if ($aEnd -lt 0) { throw 'config.js: unterminated address block' }
  $addr = $cfg.Substring($aStart, $aEnd - $aStart)

  $parts = @(
    (Get-ConfigString -Text $addr -Key 'street'),
    (Get-ConfigString -Text $addr -Key 'locality'),
    (Get-ConfigString -Text $addr -Key 'city'),
    (Get-ConfigString -Text $addr -Key 'state'),
    (Get-ConfigString -Text $addr -Key 'postalCode')
  ) | Where-Object { $_ -and $_ -ne 'PLACEHOLDER' }

  $nap = @{
    name           = (Get-ConfigString -Text $cfg -Key 'name')
    phoneDisplay   = (Get-ConfigString -Text $cfg -Key 'phoneDisplay')
    phoneDial      = (Get-ConfigString -Text $cfg -Key 'phoneDial')
    whatsappNumber = (Get-ConfigString -Text $cfg -Key 'whatsappNumber')
    email          = (Get-ConfigString -Text $cfg -Key 'email')
    # Must match js/config.js addressOneLine(): street, locality, city,
    # state, postalCode -- the set ones only, joined with ", ".
    addressLine    = ($parts -join ', ')
  }

  foreach ($k in @('phoneDisplay', 'phoneDial', 'whatsappNumber', 'email', 'addressLine')) {
    if (-not $nap[$k] -or $nap[$k] -eq 'PLACEHOLDER') {
      throw "config.js: '$k' is empty or still PLACEHOLDER -- refusing to write a blank into the footer"
    }
  }
  return $nap
}
