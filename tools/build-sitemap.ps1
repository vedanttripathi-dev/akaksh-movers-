<#
.SYNOPSIS
    Regenerates sitemap.xml from the pages actually on disk.

.DESCRIPTION
    A sitemap that lists a page which does not exist, or misses one that
    does, is worse than no sitemap — so this never takes a hand-maintained
    list. It walks the folder for .html files and writes an entry for each.

    Excluded deliberately:
      404.html   a soft-404 in a sitemap tells search engines to index an
                 error page
      tools/     authoring files, not part of the site

    Run it after adding or removing a page. It is not part of deployment.

.PARAMETER Origin
    The site's canonical origin, with no trailing slash. Change this when a
    real domain is connected — and change it in robots.txt too.

.EXAMPLE
    .\tools\build-sitemap.ps1
.EXAMPLE
    .\tools\build-sitemap.ps1 -Origin "https://example.com"
#>

[CmdletBinding()]
param([string]$Origin = 'https://akashmovers.com')

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$Origin = $Origin.TrimEnd('/')
$today = (Get-Date).ToString('yyyy-MM-dd')

$files = Get-ChildItem -Path $root -Recurse -Filter *.html |
    Where-Object { $_.Name -ne '404.html' -and $_.FullName -notmatch '\\tools\\' } |
    ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\', '/') } |
    Sort-Object

if (-not $files) { throw "No .html pages found under $root" }

$entries = foreach ($f in $files) {
    $loc = if ($f -eq 'index.html') { "$Origin/" } else { "$Origin/$f" }

    # Priority is a hint about relative importance within this site only.
    # It does not raise rankings; it tells a crawler what to look at first.
    $priority =
        if     ($f -eq 'index.html')                  { '1.0' }
        elseif ($f -like 'services*')                 { '0.8' }
        elseif ($f -like 'locations*')                { '0.8' }
        elseif ($f -eq 'contact.html')                { '0.7' }
        elseif ($f -like 'guides/*')                  { '0.6' }
        elseif ($f -in @('privacy.html','terms.html')){ '0.3' }
        else                                          { '0.6' }

    $freq = if ($f -in @('privacy.html', 'terms.html')) { 'yearly' } else { 'monthly' }

    "  <url>`r`n    <loc>$loc</loc>`r`n    <lastmod>$today</lastmod>`r`n    <changefreq>$freq</changefreq>`r`n    <priority>$priority</priority>`r`n  </url>"
}

$xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<!--
  Generated from the .html files actually present in this folder, so it can
  never list a page that does not exist or miss one that does.
  Regenerate with tools/build-sitemap.ps1 after adding or removing a page,
  and update the domain here and in robots.txt when you connect a real one.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
$($entries -join "`r`n")
</urlset>
"@

$out = Join-Path $root 'sitemap.xml'
[IO.File]::WriteAllText($out, $xml, (New-Object Text.UTF8Encoding $false))

Write-Host "sitemap.xml written with $($files.Count) URLs." -ForegroundColor Green
Write-Host "Remember: robots.txt must point at the same domain." -ForegroundColor DarkGray
