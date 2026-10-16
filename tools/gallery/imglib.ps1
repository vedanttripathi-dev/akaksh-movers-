# Shared image helpers. Dot-sourced by the asset scripts.
Add-Type -AssemblyName System.Drawing

function New-Canvas([int]$w, [int]$h, [System.Drawing.Color]$bg) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($bg)
  $g.Dispose()
  return $bmp
}

function Get-Graphics($bmp) {
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return $g
}

# Scale to an exact size, preserving quality.
function Resize-Image($src, [int]$w, [int]$h) {
  $dst = New-Canvas $w $h ([System.Drawing.Color]::Transparent)
  $g = Get-Graphics $dst
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  # A wrap-mode of TileFlipXY stops the bicubic filter sampling transparent
  # pixels from beyond the edge, which otherwise haloes the outline.
  $attr = New-Object System.Drawing.Imaging.ImageAttributes
  $attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $g.DrawImage($src, $dstRect, 0, 0, $src.Width, $src.Height, [System.Drawing.GraphicsUnit]::Pixel, $attr)
  $g.Dispose()
  $attr.Dispose()
  return $dst
}

# Scale down so the longest side is at most $max. Never scales up.
function Resize-Longest($src, [int]$max) {
  $scale = [Math]::Min(1.0, $max / [double][Math]::Max($src.Width, $src.Height))
  $w = [int][Math]::Round($src.Width * $scale)
  $h = [int][Math]::Round($src.Height * $scale)
  return Resize-Image $src $w $h
}

# Draw $src centred inside a $w x $h canvas of $bg, filling $coverage of the
# smaller dimension. Aspect ratio is preserved -- the logo is never stretched.
function Compose-Centred($src, [int]$w, [int]$h, [System.Drawing.Color]$bg, [double]$coverage) {
  $canvas = New-Canvas $w $h $bg
  $g = Get-Graphics $canvas
  $scale = [Math]::Min(($w * $coverage) / $src.Width, ($h * $coverage) / $src.Height)
  $dw = [int][Math]::Round($src.Width * $scale)
  $dh = [int][Math]::Round($src.Height * $scale)
  $x = [int](($w - $dw) / 2)
  $y = [int](($h - $dh) / 2)
  $rect = New-Object System.Drawing.Rectangle $x, $y, $dw, $dh
  $attr = New-Object System.Drawing.Imaging.ImageAttributes
  $attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $g.DrawImage($src, $rect, 0, 0, $src.Width, $src.Height, [System.Drawing.GraphicsUnit]::Pixel, $attr)
  $g.Dispose()
  $attr.Dispose()
  return $canvas
}

function Save-Jpeg($bmp, [string]$path, [int]$quality) {
  # Flatten onto white first: JPEG has no alpha, and an unflattened save
  # turns every transparent pixel black.
  $flat = New-Canvas $bmp.Width $bmp.Height ([System.Drawing.Color]::White)
  $g = Get-Graphics $flat
  $g.DrawImage($bmp, 0, 0, $bmp.Width, $bmp.Height)
  $g.Dispose()

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ps = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter (
    [System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)
  $flat.Save($path, $codec, $ps)
  $ps.Dispose()
  $flat.Dispose()
}

function Save-Png($bmp, [string]$path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

# Trim fully-transparent margins, leaving $pad transparent pixels all round.
function Trim-Alpha($src, [int]$pad) {
  $w = $src.Width; $h = $src.Height
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $d = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($d.Stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($d.Scan0, $bytes, 0, $bytes.Length)
  $src.UnlockBits($d)
  $stride = $d.Stride

  $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $w; $x++) {
      if ([int]$bytes[$row + $x * 4 + 3] -gt 8) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { return $src.Clone() }

  $minX = [Math]::Max(0, $minX - $pad); $minY = [Math]::Max(0, $minY - $pad)
  $maxX = [Math]::Min($w - 1, $maxX + $pad); $maxY = [Math]::Min($h - 1, $maxY + $pad)
  $cw = $maxX - $minX + 1; $ch = $maxY - $minY + 1

  $dst = New-Canvas $cw $ch ([System.Drawing.Color]::Transparent)
  $g = Get-Graphics $dst
  $srcRect = New-Object System.Drawing.Rectangle $minX, $minY, $cw, $ch
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $cw, $ch
  $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $dst
}

function Crop-Image($src, [int]$x, [int]$y, [int]$w, [int]$h) {
  $dst = New-Canvas $w $h ([System.Drawing.Color]::Transparent)
  $g = Get-Graphics $dst
  $srcRect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $dst
}

# Write a real multi-image .ico whose entries are PNG payloads. Every browser
# in use understands PNG-in-ICO; it keeps the file small and the alpha clean.
function Save-Ico([object[]]$bitmaps, [string]$path) {
  $blobs = @()
  foreach ($b in $bitmaps) {
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $blobs += , @{ size = $b.Width; data = $ms.ToArray() }
    $ms.Dispose()
  }

  $out = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter $out
  $bw.Write([uint16]0)                  # reserved
  $bw.Write([uint16]1)                  # type: icon
  $bw.Write([uint16]$blobs.Count)

  $offset = 6 + 16 * $blobs.Count
  foreach ($e in $blobs) {
    # 0 in the width/height byte means 256; our sizes are all below that.
    $bw.Write([byte]$e.size)
    $bw.Write([byte]$e.size)
    $bw.Write([byte]0)                  # palette entries
    $bw.Write([byte]0)                  # reserved
    $bw.Write([uint16]1)                # colour planes
    $bw.Write([uint16]32)               # bits per pixel
    $bw.Write([uint32]$e.data.Length)
    $bw.Write([uint32]$offset)
    $offset += $e.data.Length
  }
  foreach ($e in $blobs) { $bw.Write($e.data) }

  $bw.Flush()
  [System.IO.File]::WriteAllBytes($path, $out.ToArray())
  $bw.Dispose(); $out.Dispose()
}
