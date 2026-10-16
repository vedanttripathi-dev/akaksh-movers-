# Put real photographs on the service, about and location pages.
#
# Before this ran, every page except the homepage and the gallery carried
# exactly two images: the logo in the header and the logo in the footer. The
# client supplied 44 photographs of their own work and none of them appeared
# anywhere a customer was actually deciding something.
#
# WHICH PHOTOGRAPH GOES WHERE IS NOT AUTOMATIC. The mapping below was made
# by looking at the pictures. A photograph only appears on a page if it
# genuinely shows that service:
#
#   * vehicle-transport gets NO strip. Not one of the 44 photographs shows a
#     vehicle being carried. The nearest is packed goods in a garage that
#     happens to have a car in it, and putting that on the car-transport page
#     would imply something the picture does not show.
#
#   * the About page gets the three frames with a crew member in them,
#     because that page is about the people.
#
# Reuses the .workshots / .workshot classes that own-content.js already
# styles, so this adds no CSS.
#
# Idempotent: a page that already has a strip is skipped, so re-running after
# editing the mapping does not stack two of them.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Split-Path (Split-Path $here -Parent) -Parent
Add-Type -AssemblyName System.Drawing

$meta = & (Join-Path $here 'gallery-data.ps1')
$bySlug = @{}
foreach ($m in $meta) { $bySlug[$m.slug] = $m }

# page fragment -> heading, lead, and the slugs to show
$plan = @(
  @{ file = 'service-home-shifting.part'
     head = 'Household goods, packed by our crews'
     lead = 'Three frames from household jobs in Kanpur. Every piece is sheeted, filmed and labelled before it is carried.'
     shots = @('wrapped-sofa-and-armchairs', 'packed-consignment-in-room', 'packed-cartons-and-furniture') }

  @{ file = 'service-office-relocation.part'
     head = 'Records and equipment, crated and strapped'
     lead = 'Boxed records strapped into stacks and moved on a trolley, and trunks finished with edge protection.'
     shots = @('strapped-cartons-on-trolley', 'cartons-loaded-at-doorway', 'trunks-with-edge-protection') }

  @{ file = 'service-local-shifting.part'
     head = 'A local move, staged and ready'
     lead = 'Goods gathered outside in loading order, so the vehicle is packed once rather than three times.'
     shots = @('wrapped-items-ready-outdoors', 'wrapped-sofa-and-ottoman', 'wrapped-items-against-railing') }

  @{ file = 'service-intercity-relocation.part'
     head = 'Packed for the distance'
     lead = 'Long-distance consignments get the same sheeting and the same edge protection, strapped so nothing shifts on the road.'
     shots = @('packed-items-beside-vehicle', 'stack-with-edge-protection', 'strapped-soft-items') }

  @{ file = 'service-packing-unpacking.part'
     head = 'The packing itself'
     lead = 'Stretch film drawn on by hand, corrugated sheet on the edges, and a label on the top face before anything moves.'
     shots = @('crew-wrapping-furniture', 'panel-with-edge-protection', 'wrapped-centre-table') }

  @{ file = 'service-loading-unloading.part'
     head = 'Carrying and loading'
     lead = 'Heavy flat items carried by hand through doorways, stacked goods moved on a trolley.'
     shots = @('crew-moving-wrapped-panel', 'strapped-cartons-on-trolley', 'crew-with-wrapped-panels') }

  @{ file = 'service-storage-warehousing.part'
     head = 'Inventoried in, inventoried out'
     lead = 'Goods going into storage are wrapped and marked the same way as goods going onto a vehicle.'
     shots = @('packed-goods-stacked-indoors', 'wrapped-stack-in-hallway', 'tall-carton-marked-for-handling') }

  @{ file = 'about.part'
     head = 'The people who do the work'
     lead = 'Our own crews, on our own jobs. The same teams go out on every move.'
     shots = @('crew-wrapping-furniture', 'crew-with-wrapped-armchair', 'crew-with-wrapped-panels') }

  @{ file = 'location-kanpur.part'
     head = 'Moves we have run in Kanpur'
     lead = 'Staged on Kanpur driveways and in Kanpur parking areas, loaded at Kanpur doorways.'
     shots = @('wrapped-items-ready-outdoors', 'packed-items-beside-vehicle', 'packed-goods-in-garage') }

  @{ file = 'services.part'
     head = 'What the work looks like'
     lead = 'Whichever service you need, the packing standard is the same one. These are from household and office jobs in Kanpur.'
     shots = @('crew-wrapping-furniture', 'trunks-with-edge-protection', 'packed-goods-stacked-indoors') }

  @{ file = 'locations.part'
     head = 'Loaded and delivered across the city'
     lead = 'Consignments staged outside Kanpur homes, ready for the vehicle.'
     shots = @('wrapped-items-against-railing', 'wrapped-sofa-and-ottoman', 'packed-items-beside-vehicle') }
)

function Esc([string]$s) {
  return $s.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;')
}

$done = 0; $skipped = 0
foreach ($p in $plan) {
  $path = Join-Path $proj ('tools\pages\' + $p.file)
  if (-not (Test-Path $path)) { throw "missing fragment: $($p.file)" }

  $text = [IO.File]::ReadAllText($path)
  if ($text -match 'data-photo-strip') {
    Write-Output ("  skipped (already has a strip): {0}" -f $p.file)
    $skipped++
    continue
  }

  $id = 'shots-' + ($p.file -replace '\.part$', '' -replace '[^a-z0-9]+', '-')

  $sb = New-Object System.Text.StringBuilder
  $null = $sb.AppendLine('')
  $null = $sb.AppendLine('  <!-- Photographs of real jobs. Generated by')
  $null = $sb.AppendLine('       tools/gallery/add-photo-strips.ps1 -- edit the mapping there, not')
  $null = $sb.AppendLine('       here, or the next run will not know this strip exists. -->')
  $null = $sb.AppendLine(('  <section class="section is-tight on-sunk" aria-labelledby="' + $id + '" data-photo-strip>'))
  $null = $sb.AppendLine('    <div class="wrap">')
  $null = $sb.AppendLine('      <div class="section-head">')
  $null = $sb.AppendLine('        <span class="eyebrow">From our own jobs</span>')
  $null = $sb.AppendLine(('        <h2 id="' + $id + '">' + (Esc $p.head) + '</h2>'))
  $null = $sb.AppendLine(('        <p class="lead">' + (Esc $p.lead) + '</p>'))
  $null = $sb.AppendLine('      </div>')
  $null = $sb.AppendLine('      <div class="workshots">')

  foreach ($slug in $p.shots) {
    if (-not $bySlug.ContainsKey($slug)) { throw "unknown slug in plan: $slug" }
    $m = $bySlug[$slug]
    $thumbFile = Join-Path $proj ("assets\images\gallery\$slug-400.jpg")
    $img = [System.Drawing.Image]::FromFile($thumbFile)
    $w = $img.Width; $h = $img.Height; $img.Dispose()

    $null = $sb.AppendLine('        <figure class="workshot">')
    $null = $sb.AppendLine('          <img class="workshot__img"')
    $null = $sb.AppendLine(("               src=`"/assets/images/gallery/$slug-400.jpg`""))
    $null = $sb.AppendLine(("               srcset=`"/assets/images/gallery/$slug-400.jpg 400w, /assets/images/gallery/$slug-1000.jpg 1000w`""))
    $null = $sb.AppendLine('               sizes="(min-width: 60rem) 22rem, (min-width: 40rem) 45vw, 92vw"')
    $null = $sb.AppendLine(("               alt=`"" + (Esc $m.alt) + "`""))
    $null = $sb.AppendLine(("               width=`"$w`" height=`"$h`" loading=`"lazy`" decoding=`"async`">"))
    if ($m.cap) {
      $null = $sb.AppendLine(('          <figcaption class="workshot__cap">' + (Esc $m.cap) + '</figcaption>'))
    }
    $null = $sb.AppendLine('        </figure>')
  }

  $null = $sb.AppendLine('      </div>')
  $null = $sb.AppendLine('      <p class="mt-6"><a class="link-cta" href="/gallery.html">')
  $null = $sb.AppendLine('        All 44 photographs')
  $null = $sb.AppendLine('        <svg class="ic" aria-hidden="true"><use href="#i-arrow-right"/></svg>')
  $null = $sb.AppendLine('      </a></p>')
  $null = $sb.AppendLine('    </div>')
  $null = $sb.AppendLine('  </section>')
  $null = $sb.AppendLine('')

  # Insert before the closing call-to-action band, which every one of these
  # fragments ends with.
  $marker = '  <section class="section is-tight cta-band"'
  $at = $text.LastIndexOf($marker)
  if ($at -lt 0) { throw "no cta-band to insert before in $($p.file)" }

  $text = $text.Substring(0, $at) + $sb.ToString() + $text.Substring($at)
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))
  Write-Output ("  added {0} photo(s) to {1}" -f $p.shots.Count, $p.file)
  $done++
}

Write-Output ""
Write-Output ("strips added: {0}   skipped: {1}" -f $done, $skipped)
Write-Output "vehicle-transport deliberately has none -- no supplied photograph shows a vehicle being carried."
Write-Output "Now run tools\assemble.ps1."
