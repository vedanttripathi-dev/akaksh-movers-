<#
.SYNOPSIS
    Local development server for this static site.

.DESCRIPTION
    A dependency-free static file server for Windows PowerShell. This project
    has no build step and no Node or Python requirement, so this script exists
    so you can still preview the site over real HTTP.

    HTTP matters here — you cannot just double-click index.html. The site uses
    ES modules (import/export), and browsers refuse to load modules over the
    file:// protocol for security reasons. Opening the file directly gives you
    an unstyled page and a console full of CORS errors.

    What it does:
      * Serves this folder on http://localhost:8787
      * Sends the correct Content-Type for each file, including the
        text/javascript that ES modules require
      * Applies the same Content-Security-Policy as production, so a CSP
        mistake shows up here instead of after deployment
      * Answers POST /api/lead with a clearly-labelled MOCK response, because
        the real Cloudflare Pages Function cannot run outside Cloudflare
      * Never caches, so a refresh always shows your latest edit

.PARAMETER Port
    Port to listen on. Default 8787.

.PARAMETER NoCsp
    Serve without the Content-Security-Policy header. Use this to confirm
    whether a problem is genuinely caused by the CSP.

.PARAMETER MockApi
    How POST /api/lead should behave, for testing the form's three outcomes:
      delivered  (default) ok, WhatsApp notification reported as sent
      stored               ok, but WhatsApp reported as NOT delivered — the
                           form should offer the click-to-chat fallback
      fail                 a 502, so the form shows its error state

.EXAMPLE
    .\serve.ps1
    Start on http://localhost:8787 with the production CSP.

.EXAMPLE
    .\serve.ps1 -MockApi stored
    Check that the form tells the truth when WhatsApp delivery fails.

.NOTES
    Press Ctrl+C to stop.

    This script is for local development only. It is not hardened and must
    never be exposed to a network — it binds to localhost deliberately.
#>

[CmdletBinding()]
param(
    [int]$Port = 8787,
    [switch]$NoCsp,
    [ValidateSet('delivered', 'stored', 'fail')]
    [string]$MockApi = 'delivered'
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

# --- MIME types -------------------------------------------------------------
# Getting .js wrong is the classic failure: a module served as text/plain is
# rejected by the browser with a strict-MIME-checking error.
$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.mjs'  = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.avif' = 'image/avif'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
    '.txt'  = 'text/plain; charset=utf-8'
    '.xml'  = 'application/xml; charset=utf-8'
    '.glb'  = 'model/gltf-binary'
    '.gltf' = 'model/gltf+json'
    '.sql'  = 'text/plain; charset=utf-8'
    '.webmanifest' = 'application/manifest+json'
}

# Kept in step with _headers. If you change the CSP there, change it here too.
$csp = "default-src 'self'; script-src 'self' 'sha256-/x7W7R75k8Roq0WaVRQX9blP4OufE5xbAdzklGxsgpw='; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; media-src 'self'; frame-src https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "Could not bind port $Port." -ForegroundColor Red
    Write-Host "Another program is probably using it. Try:  .\serve.ps1 -Port 8900" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  Serving  $root" -ForegroundColor Gray
Write-Host "  Open     http://localhost:$Port/" -ForegroundColor Cyan
if ($NoCsp) {
    Write-Host "  CSP      off (-NoCsp)" -ForegroundColor Yellow
} else {
    Write-Host "  CSP      on, matching production" -ForegroundColor Gray
}
Write-Host "  Mock API POST /api/lead -> $MockApi" -ForegroundColor Gray
Write-Host "  Stop     Ctrl+C" -ForegroundColor Gray
Write-Host ""

function Write-Reply {
    param($Response, [int]$Status, [string]$ContentType, [byte[]]$Bytes)

    $Response.StatusCode = $Status
    $Response.ContentType = $ContentType
    # Always fresh: a cached asset during development wastes an afternoon.
    $Response.Headers.Add('Cache-Control', 'no-store, must-revalidate')
    $Response.Headers.Add('X-Content-Type-Options', 'nosniff')
    if (-not $NoCsp) { $Response.Headers.Add('Content-Security-Policy', $csp) }

    $Response.ContentLength64 = $Bytes.Length
    $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
    $Response.OutputStream.Close()
}

while ($listener.IsListening) {

    try {
        $context = $listener.GetContext()
    } catch {
        break
    }

    $request = $context.Request
    $response = $context.Response
    $path = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
    $method = $request.HttpMethod

    try {
        # ------------------------------------------------------------------
        # Mock lead endpoint.
        #
        # The real handler is functions/api/lead.js and it only runs on
        # Cloudflare. This stands in for it so the form can be exercised
        # end to end locally. It validates nothing and stores nothing.
        # ------------------------------------------------------------------
        if ($path -eq '/api/lead') {

            if ($method -ne 'POST') {
                $body = '{"ok":false,"message":"Method not allowed."}'
                Write-Reply $response 405 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($body))
                Write-Host ("  405  {0} {1}" -f $method, $path) -ForegroundColor DarkYellow
                continue
            }

            $reader = New-Object IO.StreamReader($request.InputStream, [Text.Encoding]::UTF8)
            $raw = $reader.ReadToEnd()
            $reader.Close()
            Write-Host ("  POST /api/lead  ({0} bytes received)" -f $raw.Length) -ForegroundColor Magenta

            $stamp = (Get-Date).ToString('yyMMdd')
            $suffix = -join ((1..6) | ForEach-Object { '{0:X}' -f (Get-Random -Minimum 0 -Maximum 16) })
            $leadId = "LD-$stamp-$suffix"

            if ($MockApi -eq 'fail') {
                $body = '{"ok":false,"message":"MOCK: simulated server failure."}'
                $status = 502
            } elseif ($MockApi -eq 'stored') {
                $body = "{""ok"":true,""leadId"":""$leadId"",""whatsappDelivered"":false,""stored"":true}"
                $status = 200
            } else {
                $body = "{""ok"":true,""leadId"":""$leadId"",""whatsappDelivered"":true,""stored"":true}"
                $status = 200
            }

            Write-Reply $response $status 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($body))
            Write-Host ("       -> $MockApi  $leadId") -ForegroundColor Magenta
            continue
        }

        # ------------------------------------------------------------------
        # Static files
        # ------------------------------------------------------------------
        $relative = $path.TrimStart('/')
        if ($relative -eq '') { $relative = 'index.html' }

        $full = Join-Path $root $relative

        # A directory means its index.html.
        if ((Test-Path $full -PathType Container)) {
            $full = Join-Path $full 'index.html'
        }

        # Allow /about for /about.html, matching how Cloudflare Pages behaves.
        if (-not (Test-Path $full -PathType Leaf)) {
            $withHtml = $full + '.html'
            if (Test-Path $withHtml -PathType Leaf) { $full = $withHtml }
        }

        # Directory-traversal guard. Resolve and confirm the result is still
        # inside the served folder before reading anything.
        $safe = $false
        if (Test-Path $full -PathType Leaf) {
            $resolved = (Resolve-Path -LiteralPath $full).Path
            $rootResolved = (Resolve-Path -LiteralPath $root).Path
            if ($resolved.StartsWith($rootResolved, [StringComparison]::OrdinalIgnoreCase)) {
                $safe = $true
                $full = $resolved
            }
        }

        if (-not $safe) {
            $notFound = Join-Path $root '404.html'
            if (Test-Path $notFound -PathType Leaf) {
                $bytes = [IO.File]::ReadAllBytes($notFound)
                Write-Reply $response 404 $mime['.html'] $bytes
            } else {
                $bytes = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
                Write-Reply $response 404 'text/plain; charset=utf-8' $bytes
            }
            Write-Host ("  404  {0}" -f $path) -ForegroundColor DarkYellow
            continue
        }

        $extension = [IO.Path]::GetExtension($full).ToLowerInvariant()
        $type = $mime[$extension]
        if (-not $type) { $type = 'application/octet-stream' }

        $bytes = [IO.File]::ReadAllBytes($full)
        Write-Reply $response 200 $type $bytes
        Write-Host ("  200  {0}  ({1} KB)" -f $path, [math]::Round($bytes.Length / 1KB, 1)) -ForegroundColor DarkGray

    } catch {
        Write-Host ("  500  {0} :: {1}" -f $path, $_.Exception.Message) -ForegroundColor Red
        try {
            $bytes = [Text.Encoding]::UTF8.GetBytes('500 Internal Server Error')
            Write-Reply $response 500 'text/plain; charset=utf-8' $bytes
        } catch { }
    }
}

$listener.Stop()
$listener.Close()
Write-Host "Stopped." -ForegroundColor Gray
