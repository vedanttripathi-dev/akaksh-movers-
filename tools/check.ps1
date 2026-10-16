<#
.SYNOPSIS
    The project's test suite. Run it before every deploy.

.DESCRIPTION
    This site has no unit tests, and that is an honest consequence of its
    architecture rather than an oversight: there is no Node, no package
    manager and no build step, so there is no test runner to hang them on.
    What a static marketing site can actually get wrong is a different list
    anyway — a broken link, a duplicate title, a page that stopped returning
    200, a stray unverified claim, a mojibake em dash. This checks those.

    It needs the local dev server running:

        .\serve.ps1                   (in another terminal)
        .\tools\check.ps1

    Exit code 0 = everything passed. Non-zero = that many problems, so this
    can be wired into CI later without changing anything.

.PARAMETER BaseUrl
    Where the site is being served. Defaults to the dev server's address.

.PARAMETER SkipHttp
    Run only the checks that read files from disk. Useful when the dev server
    is not running and you just want the fast static checks.

.EXAMPLE
    .\tools\check.ps1
.EXAMPLE
    .\tools\check.ps1 -BaseUrl "https://akashmovers.pages.dev"
.EXAMPLE
    .\tools\check.ps1 -SkipHttp
#>

[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:8787',
    [switch]$SkipHttp
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$BaseUrl = $BaseUrl.TrimEnd('/')

$problems = New-Object System.Collections.ArrayList
function Fail([string]$area, [string]$message) {
    [void]$problems.Add([pscustomobject]@{ Area = $area; Message = $message })
}
function Section([string]$name) {
    Write-Host ""
    Write-Host "== $name" -ForegroundColor Cyan
}

# ---------------------------------------------------------------------------
# 1. Text encoding
# ---------------------------------------------------------------------------
# Windows PowerShell 5.1 reads a BOM-less .ps1 as ANSI. A script that writes
# page text can therefore turn every em dash into "a-hat-euro" without any
# error. It has happened on this project; this is the guard against it.
Section 'Encoding'

$mojibake = [string][char]0xE2 + [char]0x20AC
$checked = 0
Get-ChildItem -Path $root -Recurse -Include *.html, *.css, *.js, *.txt, *.part, *.xml, *.md, *.webmanifest |
    Where-Object { $_.FullName -notmatch '\\vendor\\' } |
    ForEach-Object {
        $checked++
        $text = [IO.File]::ReadAllText($_.FullName)
        $hits = ([regex]::Matches($text, [regex]::Escape($mojibake))).Count
        # README documents the mojibake sequence on purpose, as an example.
        if ($hits -gt 0 -and $_.Name -ne 'README.md') {
            Fail 'encoding' "$($_.Name): $hits mis-encoded character(s)"
        }
    }
Write-Host "  $checked text files scanned"

foreach ($ps1 in Get-ChildItem -Path $root -Recurse -Filter *.ps1) {
    $bytes = [IO.File]::ReadAllBytes($ps1.FullName)
    $hasBom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
    if (-not $hasBom) { Fail 'encoding' "$($ps1.Name) has no byte-order mark (PS 5.1 will read it as ANSI)" }
}

# ---------------------------------------------------------------------------
# 2. Claims that must never be published without evidence
# ---------------------------------------------------------------------------
# Every one of these appears on a third-party directory for this business and
# none is backed by a document. See README.md for the full account.
Section 'Unverifiable claims'

$banned = @{
    'ISO certifi'     = 'ISO certification is claimed on one directory and has never been verified'
    'IBA approve'     = 'IBA approval has never been verified'
    'IBA certifi'     = 'IBA certification has never been verified'
    '500\+ employee'  = 'employee count is contradicted between sources (500+ vs 21-50)'
    '15,000'          = 'the "15,000 shifts" figure has no source'
    '95% satisf'      = 'the "95% satisfaction" figure has no source'
    'fully insured'   = 'transit cover is optional and confirmed per quote, never automatic'
    '4\.3 ?(star|/5|out of)' = 'do not hard-code a rating; ratings belong on the platforms that collected them'
    'aggregateRating' = 'no aggregate rating may be published'
}
foreach ($page in Get-ChildItem -Path $root -Recurse -Filter *.html) {
    $text = [IO.File]::ReadAllText($page.FullName)
    foreach ($pattern in $banned.Keys) {
        if ($text -match $pattern) {
            Fail 'claims' "$($page.Name): matched /$pattern/ — $($banned[$pattern])"
        }
    }
}
Write-Host "  $(@(Get-ChildItem -Path $root -Recurse -Filter *.html).Count) pages scanned for unverifiable claims"

# ---------------------------------------------------------------------------
# 2b. Review honesty
# ---------------------------------------------------------------------------
# The site shows reviews from two different places, and the whole arrangement
# rests on a visitor being able to tell which is which. These are the
# invariants that keep that true. They are cheap to check and expensive to
# notice the loss of.
Section 'Review honesty'

$ownContent = Join-Path $root 'js\own-content.js'
if (Test-Path $ownContent) {
    $text = [IO.File]::ReadAllText($ownContent)
    if ($text -notmatch 'Shared with us directly') {
        Fail 'reviews' 'own-content.js no longer badges testimonials "Shared with us directly" — a testimonial the office collected would be indistinguishable from a Google review'
    }
    if ($text -match "'Google review'" -or $text -match '"Google review"') {
        Fail 'reviews' 'own-content.js can emit a "Google review" label — it renders the business''s OWN testimonials and must never claim Google as the source'
    }
}

# Nothing in the editable content files may claim Google as its source.
foreach ($name in @('content\testimonials.json', 'content\photos.json')) {
    $path = Join-Path $root $name
    if (-not (Test-Path $path)) { Fail 'reviews' "$name is missing — the 'Our customers, our work' section reads it at runtime"; continue }
    $text = [IO.File]::ReadAllText($path)
    if ($text -match '(?i)"source"\s*:\s*"google"') {
        Fail 'reviews' "$name marks an entry as a Google review. This file is for testimonials the business collected itself; Google's own reviews come from the Business Profile."
    }
    try { $null = ConvertFrom-Json $text } catch { Fail 'reviews' "$name is not valid JSON — the section will silently render nothing" }
}

# schema.js must not emit review markup. Every review on this site is a review
# of this business on this business's own site, which is what Google's
# guidelines call self-serving and exclude from rich results.
$schema = Join-Path $root 'js\schema.js'
if (Test-Path $schema) {
    $text = [IO.File]::ReadAllText($schema)
    if ($text -match "'@type'\s*:\s*'Review'") {
        Fail 'reviews' 'schema.js emits Review structured data. Self-serving reviews are excluded by Google''s guidelines; marking them up risks a manual action for a star rating that would not be shown anyway.'
    }
}
Write-Host "  review source labelling and structured-data rules intact"

# ---------------------------------------------------------------------------
# 3. Secrets
# ---------------------------------------------------------------------------
Section 'Secrets'

# Real WhatsApp Cloud API tokens begin EAA; Cloudflare and Google keys have
# their own recognisable shapes. None of these belongs in a file that ships.
$secretPatterns = @('EAA[A-Za-z0-9]{40,}', 'AIza[0-9A-Za-z_\-]{30,}', 'sk_live_[0-9a-zA-Z]{10,}', 'xox[baprs]-[0-9A-Za-z\-]{10,}')
foreach ($file in Get-ChildItem -Path $root -Recurse -Include *.js, *.html, *.json, *.txt | Where-Object { $_.FullName -notmatch '\\vendor\\' }) {
    $text = [IO.File]::ReadAllText($file.FullName)
    foreach ($pattern in $secretPatterns) {
        if ($text -match $pattern) { Fail 'secrets' "$($file.Name): looks like a live credential (/$pattern/)" }
    }
}
if (Test-Path (Join-Path $root '.env')) { Fail 'secrets' '.env exists in the project folder — it would be uploaded and served publicly' }
Write-Host "  no live-looking credentials found"

# ---------------------------------------------------------------------------
# 4. HTTP checks
# ---------------------------------------------------------------------------
if ($SkipHttp) {
    Write-Host ""
    Write-Host "Skipping HTTP checks (-SkipHttp)." -ForegroundColor DarkGray
} else {
    Section 'Pages'

    $pages = Get-ChildItem -Path $root -Recurse -Filter *.html |
        Where-Object { $_.FullName -notmatch '\\tools\\' } |
        Sort-Object FullName |
        ForEach-Object { '/' + $_.FullName.Substring($root.Length + 1).Replace('\', '/') }

    $seenTitles = @{}
    $seenDescs = @{}
    $linkTargets = @{}
    $reachable = $true

    foreach ($path in $pages) {
        try {
            $response = Invoke-WebRequest -Uri ($BaseUrl + $path) -UseBasicParsing -TimeoutSec 20
        } catch {
            if ($reachable) {
                Fail 'pages' "cannot reach $BaseUrl — is the dev server running? (.\serve.ps1)"
                $reachable = $false
            }
            continue
        }

        $html = $response.Content
        if ($response.StatusCode -ne 200) { Fail 'pages' "$path returned $($response.StatusCode)" }

        $title = [regex]::Match($html, '(?s)<title>(.*?)</title>').Groups[1].Value
        $desc  = [regex]::Match($html, '<meta name="description" content="(.*?)">').Groups[1].Value
        $canon = [regex]::Match($html, '<link rel="canonical" href="(.*?)">').Groups[1].Value

        if (-not $title) { Fail 'seo' "$path has no <title>" }
        if (-not $desc)  { Fail 'seo' "$path has no meta description" }

        if ($title -and $seenTitles.ContainsKey($title)) { Fail 'seo' "$path duplicates the title of $($seenTitles[$title])" }
        elseif ($title) { $seenTitles[$title] = $path }

        if ($desc -and $seenDescs.ContainsKey($desc)) { Fail 'seo' "$path duplicates the description of $($seenDescs[$desc])" }
        elseif ($desc) { $seenDescs[$desc] = $path }

        # Comments are stripped first: an <h1> inside a comment is not an h1.
        $h1Count = ([regex]::Matches(($html -replace '(?s)<!--.*?-->', ''), '<h1[\s>]')).Count
        if ($h1Count -ne 1) { Fail 'seo' "$path has $h1Count <h1> elements, expected exactly 1" }

        if ($path -eq '/404.html') {
            if ($html -notmatch 'noindex') { Fail 'seo' '404.html must carry a noindex directive' }
            if ($canon) { Fail 'seo' '404.html must not declare a canonical URL' }
        } elseif (-not $canon) {
            Fail 'seo' "$path has no canonical URL"
        }

        # Visible words, after removing script, style, svg and comments.
        $visible = $html -replace '(?s)<script.*?</script>', ' ' -replace '(?s)<style.*?</style>', ' ' `
                         -replace '(?s)<svg.*?</svg>', ' ' -replace '(?s)<!--.*?-->', ' ' -replace '<[^>]+>', ' '
        $words = ($visible -split '\s+' | Where-Object { $_ -match '\w' }).Count
        if ($words -lt 300 -and $path -ne '/404.html') { Fail 'content' "$path has only $words visible words (thin content)" }

        foreach ($match in [regex]::Matches($html, 'href="(/[^"#?]*)')) {
            $href = $match.Groups[1].Value
            if ($href -match '\.(css|js|woff2?|svg|png|jpe?g|ico|webmanifest|xml|txt)$') { continue }
            if (-not $linkTargets.ContainsKey($href)) { $linkTargets[$href] = $path }
        }
    }

    if ($reachable) {
        Write-Host "  $($pages.Count) pages checked"

        Section 'Internal links'
        $broken = 0
        foreach ($href in ($linkTargets.Keys | Sort-Object)) {
            try { $null = Invoke-WebRequest -Uri ($BaseUrl + $href) -UseBasicParsing -TimeoutSec 15 }
            catch { Fail 'links' "$href is linked from $($linkTargets[$href]) but does not resolve"; $broken++ }
        }
        Write-Host "  $($linkTargets.Count) distinct internal targets, $broken broken"

        Section 'Sitemap'
        $sitemapPath = Join-Path $root 'sitemap.xml'
        if (-not (Test-Path $sitemapPath)) {
            Fail 'sitemap' 'sitemap.xml is missing — run tools\build-sitemap.ps1'
        } else {
            $listed = ([regex]::Matches([IO.File]::ReadAllText($sitemapPath), '<loc>([^<]+)</loc>')).Count
            $expected = ($pages | Where-Object { $_ -ne '/404.html' }).Count
            if ($listed -ne $expected) {
                Fail 'sitemap' "sitemap lists $listed URLs but there are $expected indexable pages — run tools\build-sitemap.ps1"
            }
            if ([IO.File]::ReadAllText($sitemapPath) -match '404\.html') {
                Fail 'sitemap' 'sitemap.xml lists 404.html'
            }
            Write-Host "  $listed URLs listed, matching $expected indexable pages"
        }
    }
}

# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------
Write-Host ""
if ($problems.Count -eq 0) {
    Write-Host "PASS - no problems found." -ForegroundColor Green
    exit 0
}

Write-Host "$($problems.Count) problem(s):" -ForegroundColor Red
$problems | Group-Object Area | Sort-Object Name | ForEach-Object {
    Write-Host "  [$($_.Name)]" -ForegroundColor Yellow
    $_.Group | ForEach-Object { Write-Host "    - $($_.Message)" }
}
exit $problems.Count
