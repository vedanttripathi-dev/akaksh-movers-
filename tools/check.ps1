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
# 3b. Static name/address/phone
# ---------------------------------------------------------------------------
# The footer's contact details used to be empty elements filled by main.js at
# runtime, which meant that anything not executing JavaScript -- Bing's
# renderer, and most of the fourteen AI crawlers robots.txt deliberately
# invites -- saw a footer with no phone number and no address on 19 of the 20
# pages. They are now written into the markup, and main.js writes the same
# strings over the top.
#
# That is two copies of the same fact, so it gets a guard rather than good
# intentions: this reads js/config.js through the same parser the filler uses
# and fails if the markup has drifted from it. Re-run
# tools/seo/fill-static-nap.ps1 and then tools/assemble.ps1 to fix a failure.
Section 'Static name/address/phone'

. (Join-Path $PSScriptRoot 'seo\nap.ps1')
$nap = Read-Nap $root

$napPages = Get-ChildItem -Path $root -Recurse -Filter *.html |
    Where-Object { $_.FullName -notmatch '\\tools\\' -and $_.Name -ne '404.html' }

$napOk = 0
foreach ($file in $napPages) {
    $text = [IO.File]::ReadAllText($file.FullName)
    $rel = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
    $missing = @()
    if ($text -notmatch [regex]::Escape($nap['addressLine']))  { $missing += 'address' }
    if ($text -notmatch [regex]::Escape($nap['phoneDisplay'])) { $missing += 'phone' }
    if ($text -notmatch [regex]::Escape($nap['email']))        { $missing += 'email' }
    if ($text -notmatch [regex]::Escape($nap['name']))         { $missing += 'business name' }
    if ($missing.Count) {
        Fail 'nap' "$rel : static markup is missing $($missing -join ', ') — re-run tools/seo/fill-static-nap.ps1 then tools/assemble.ps1"
    } else { $napOk++ }
}
# A hidden attribute on these would make the details invisible to a reader
# while still being in the markup, which is cloaking-shaped. Catch it.
$homeText = [IO.File]::ReadAllText((Join-Path $root 'index.html'))
foreach ($attr in @('data-footer-phone', 'data-footer-email', 'data-footer-address')) {
    if ($homeText -match ($attr + '\s+hidden')) {
        Fail 'nap' "index.html: $attr is still marked hidden — the details would be in the markup but not on the page"
    }
}
Write-Host ("  name, address, phone and email present in the markup of {0} of {1} pages" -f $napOk, $napPages.Count)
Write-Host ("  address line matches config.js: {0}" -f $nap['addressLine'])

# ---------------------------------------------------------------------------
# 3c. Structured data served in the HTML
# ---------------------------------------------------------------------------
# The JSON-LD used to be built by js/schema.js and appended at runtime, so
# index.html contained zero application/ld+json blocks. It is now baked into
# each page by tools/seo/bake-schema.ps1 from a capture of what schema.js
# actually produced, and injectSchema() replaces that block rather than
# appending to it.
#
# Three things can go wrong, and all three are silent, so all three are
# checked here rather than left to a validator somebody remembers to run:
#
#   1. A page loses its block, or ends up with two (duplicate conflicting
#      markup is what earns a structured-data manual action).
#   2. The baked JSON stops agreeing with js/config.js -- the phone number
#      changes in config and twenty pages keep publishing the old one.
#   3. js/config.js or js/schema.js changes and nobody re-bakes, so every
#      page serves a stale graph that still parses perfectly.
Section 'Structured data'

$schemaPages = Get-ChildItem -Path $root -Recurse -Filter *.html |
    Where-Object { $_.FullName -notmatch '\\tools\\' -and $_.Name -ne '404.html' }

$schemaOk = 0
$faqNodeCounts = @{}
foreach ($file in $schemaPages) {
    $text = [IO.File]::ReadAllText($file.FullName)
    $rel = $file.FullName.Substring($root.Length + 1).Replace('\', '/')

    $blocks = [regex]::Matches($text, '<script type="application/ld\+json"[^>]*>(.*?)</script>', 'Singleline')
    if ($blocks.Count -ne 1) {
        Fail 'schema' "$rel : $($blocks.Count) JSON-LD blocks in the markup, expected exactly 1 — run tools/seo/bake-schema.ps1"
        continue
    }

    $json = $blocks[0].Groups[1].Value
    try { $graph = ($json | ConvertFrom-Json).'@graph' }
    catch { Fail 'schema' "$rel : the baked JSON-LD does not parse"; continue }

    $biz = $graph | Where-Object { $_.'@type' -eq 'MovingCompany' -or $_.'@type' -eq 'Organization' } | Select-Object -First 1
    if (-not $biz) { Fail 'schema' "$rel : no MovingCompany/Organization node"; continue }

    # Agreement with config.js, through the same reader fill-static-nap uses.
    if ($biz.telephone -ne $nap['phoneDial']) {
        Fail 'schema' "$rel : baked telephone '$($biz.telephone)' does not match config.js '$($nap['phoneDial'])' — re-bake"
    }
    if ($biz.email -ne $nap['email']) {
        Fail 'schema' "$rel : baked email '$($biz.email)' does not match config.js '$($nap['email'])' — re-bake"
    }
    if ($biz.name -ne $nap['name']) {
        Fail 'schema' "$rel : baked business name '$($biz.name)' does not match config.js '$($nap['name'])' — re-bake"
    }

    # Review markup stays absent. See the note above verifiedReviews() in
    # js/schema.js: every review on this site is self-serving by Google's
    # definition, so marking any of it up risks a manual action.
    if ($json -match '"aggregateRating"' -or $json -match '"review"\s*:') {
        Fail 'schema' "$rel : review or aggregateRating markup is present — self-serving reviews must never be marked up"
    }

    # The baked graph must still describe THIS page. The manifest below
    # catches js/config.js and js/schema.js changing, but not the page's own
    # content changing: edit a fragment, re-run assemble.ps1 without
    # re-baking, and the block would keep the old title and the old FAQ while
    # parsing perfectly.
    #
    # The FAQ half is not housekeeping. Google requires that the answer in
    # FAQPage markup is visible on the page, which faqNode() guarantees by
    # reading the questions out of the DOM. Baking a copy breaks that
    # guarantee unless something re-checks it, so this does.
    $page = $graph | Where-Object { $_.'@id' -like '*#webpage' } | Select-Object -First 1
    if ($page) {
        $title = [regex]::Match($text, '<title>(.*?)</title>', 'Singleline').Groups[1].Value
        $title = [System.Net.WebUtility]::HtmlDecode($title).Trim()
        if ($title -and $page.name -ne $title) {
            Fail 'schema' "$rel : baked WebPage name does not match the page's <title> — re-bake"
        }
        $desc = [regex]::Match($text, '<meta name="description" content="(.*?)">', 'Singleline').Groups[1].Value
        $desc = [System.Net.WebUtility]::HtmlDecode($desc).Trim()
        if ($desc -and $page.description -ne $desc) {
            Fail 'schema' "$rel : baked WebPage description does not match the page's meta description — re-bake"
        }
    }

    $faqNode = $graph | Where-Object { $_.'@type' -eq 'FAQPage' } | Select-Object -First 1
    if ($faqNode) {
        # The JSON-LD block has to come out first. It is part of the page's
        # HTML, so searching the whole file for a marked-up question finds it
        # in the markup that is being checked and the test passes no matter
        # what. Caught by deliberately renaming a baked question and watching
        # this say nothing.
        $visible = [regex]::Replace($text, '<script type="application/ld\+json".*?</script>', '', 'Singleline')
        $visible = [System.Net.WebUtility]::HtmlDecode($visible)
        foreach ($entry in $faqNode.mainEntity) {
            if ($visible -notmatch [regex]::Escape($entry.name)) {
                Fail 'schema' "$rel : the baked FAQ asks `"$($entry.name)`" but that question is not on the page — re-bake (marked-up answers must be visible)"
            }
        }
    }

    # @() matters. A Where-Object that matches exactly one PSCustomObject
    # returns the object itself, and .Count on it is $null, not 1 — so
    # without this the duplicate-FAQPage guard below compared $null -gt 1 and
    # could never fire, while the summary reported 0 nodes on pages that
    # plainly had one.
    $faqNodeCounts[$rel] = @($graph | Where-Object { $_.'@type' -eq 'FAQPage' }).Count
    $schemaOk++
}

# One FAQPage per page at most. /faq.html is the one worth naming: faqNode()
# emits a FAQPage built from the visible questions, and pageType() deliberately
# does NOT also type the WebPage node as FAQPage, because two FAQPage nodes
# with different @ids in one graph is the duplicate markup to avoid.
foreach ($entry in $faqNodeCounts.GetEnumerator()) {
    if ($entry.Value -gt 1) {
        Fail 'schema' "$($entry.Key) : $($entry.Value) FAQPage nodes in one graph, expected at most 1"
    }
}

# Staleness. A baked graph that no longer reflects the files it came from
# still parses, still validates, and is still wrong.
$manifestPath = Join-Path $PSScriptRoot 'seo\schema-manifest.json'
if (-not (Test-Path $manifestPath)) {
    Fail 'schema' 'tools/seo/schema-manifest.json is missing — run tools/seo/bake-schema.ps1'
} else {
    $manifest = [IO.File]::ReadAllText($manifestPath) | ConvertFrom-Json
    function Get-FileSha([string]$p) {
        $sha = [Security.Cryptography.SHA256]::Create()
        try { return (($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes([IO.File]::ReadAllText($p))) |
                       ForEach-Object { $_.ToString('x2') }) -join '') }
        finally { $sha.Dispose() }
    }
    if ((Get-FileSha (Join-Path $root 'js\config.js')) -ne $manifest.configSha) {
        Fail 'schema' 'js/config.js has changed since the structured data was baked — re-capture and re-run tools/seo/bake-schema.ps1 (see its header)'
    }
    if ((Get-FileSha (Join-Path $root 'js\schema.js')) -ne $manifest.schemaSha) {
        Fail 'schema' 'js/schema.js has changed since the structured data was baked — re-capture and re-run tools/seo/bake-schema.ps1 (see its header)'
    }
}

$faqTotal = ($faqNodeCounts.Values | Measure-Object -Sum).Sum
Write-Host ("  JSON-LD served in the markup of {0} of {1} pages, one block each" -f $schemaOk, $schemaPages.Count)
Write-Host ("  business name, telephone and email agree with js/config.js")
Write-Host ("  page titles and descriptions agree with the baked WebPage nodes")
Write-Host ("  every marked-up FAQ question is visible on its page ({0} FAQPage nodes)" -f $faqTotal)
Write-Host ("  no aggregateRating or review markup; at most one FAQPage per graph")

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
