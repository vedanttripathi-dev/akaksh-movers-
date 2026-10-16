# Build the photo gallery from the client's supplied photographs.
#
# Produces three things:
#   1. Web-sized JPEGs under assets/images/gallery/   (two widths each)
#   2. tools/pages/gallery.part -- STATIC HTML, so every <img> and its alt
#      text is in the served markup and does not depend on JavaScript
#   3. An image pack on the client's own PC, so the optimised photographs
#      and their metadata are usable for brochures, the Business Profile
#      and social posts without going back to the website.
#
# WebP: this machine has no WebP encoder (no cwebp, no WIC encoder, none in
# System.Drawing -- all three were checked). The optimised files are JPEG.
# See the README this script writes for what that costs and how to change it.

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'imglib.ps1')

$src   = 'C:\Users\VEDANT TIWARI\OneDrive\Pictures\akash photo gallery'
$proj  = 'C:\Users\VEDANT TIWARI\triangle code\movers'
$pack  = 'C:\Users\VEDANT TIWARI\OneDrive\Pictures\akash-movers-image-pack'
$webDir = Join-Path $proj 'assets\images\gallery'

$meta = & (Join-Path $here 'gallery-data.ps1')
$files = Get-ChildItem -Path $src -File | Sort-Object Name

if ($files.Count -ne $meta.Count) {
  throw ("photo count {0} does not match metadata count {1} -- the two would be out of step" -f $files.Count, $meta.Count)
}

foreach ($d in @($webDir, $pack, (Join-Path $pack 'Original-Images'), (Join-Path $pack 'Optimized-JPEG'))) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

$rows = @()
$totalIn = 0; $totalOut = 0

for ($i = 0; $i -lt $files.Count; $i++) {
  $f = $files[$i]
  $m = $meta[$i]
  $slug = $m.slug

  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $bmp = New-Object System.Drawing.Bitmap $img
  $img.Dispose()

  $thumb = Resize-Longest $bmp 400
  $full  = Resize-Longest $bmp 1000

  $thumbPath = Join-Path $webDir ($slug + '-400.jpg')
  $fullPath  = Join-Path $webDir ($slug + '-1000.jpg')
  Save-Jpeg $thumb $thumbPath 78
  Save-Jpeg $full  $fullPath  80

  # The client's own copies.
  Copy-Item $f.FullName (Join-Path $pack ('Original-Images\' + $slug + '.jpg')) -Force
  Save-Jpeg $full (Join-Path $pack ('Optimized-JPEG\' + $slug + '.jpg')) 82

  $inKB  = [math]::Round($f.Length / 1KB, 1)
  $outKB = [math]::Round(((Get-Item $thumbPath).Length + (Get-Item $fullPath).Length) / 1KB, 1)
  $totalIn += $f.Length
  $totalOut += (Get-Item $thumbPath).Length + (Get-Item $fullPath).Length

  $rows += [PSCustomObject]@{
    order          = $m.n
    slug           = $slug
    original_file  = $f.Name
    web_thumb      = 'assets/images/gallery/' + $slug + '-400.jpg'
    web_full       = 'assets/images/gallery/' + $slug + '-1000.jpg'
    thumb_width    = $thumb.Width
    thumb_height   = $thumb.Height
    full_width     = $full.Width
    full_height    = $full.Height
    alt_text       = $m.alt
    caption        = $m.cap
    original_kb    = $inKB
    web_total_kb   = $outKB
  }

  $thumb.Dispose(); $full.Dispose(); $bmp.Dispose()
}

Write-Output ("photos processed : {0}" -f $rows.Count)
Write-Output ("originals        : {0:N1} MB" -f ($totalIn / 1MB))
Write-Output ("web output       : {0:N1} MB  (both sizes, all photos)" -f ($totalOut / 1MB))

# ---------------------------------------------------------------------------
# Metadata files for the client's pack
# ---------------------------------------------------------------------------
$rows | Export-Csv -Path (Join-Path $pack 'image-seo-metadata.csv') -NoTypeInformation -Encoding UTF8
$rows | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $pack 'image-seo-metadata.json') -Encoding UTF8

$md = New-Object System.Collections.Generic.List[string]
$md.Add('# Akash Movers - photograph descriptions')
$md.Add('')
$md.Add('One entry per photograph. The alt text is what the website serves to')
$md.Add('screen readers and to image search; the caption is what a visitor sees')
$md.Add('printed under the picture. Both describe only what is visible in the')
$md.Add('frame - no customer names, no addresses, no dates.')
$md.Add('')
foreach ($r in $rows) {
  $md.Add(("## {0:D2}. {1}" -f $r.order, $r.slug))
  $md.Add('')
  $md.Add(('- **Alt text:** ' + $r.alt_text))
  if ($r.caption) { $md.Add(('- **Caption:** ' + $r.caption)) }
  $md.Add(('- **Original:** ' + $r.original_file))
  $md.Add(('- **Web sizes:** ' + $r.thumb_width + 'x' + $r.thumb_height + ' and ' + $r.full_width + 'x' + $r.full_height))
  $md.Add('')
}
[IO.File]::WriteAllLines((Join-Path $pack 'image-descriptions.md'), $md)

Write-Output ("image pack       : {0}" -f $pack)
