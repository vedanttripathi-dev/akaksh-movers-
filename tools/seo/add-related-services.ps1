# Cross-link the service pages to each other, and to the Kanpur page.
#
# WHY THIS EXISTS
# ---------------
# Measured before this ran: every one of the seven deeper service pages had
# exactly ONE inbound internal link -- from the services hub -- and linked to
# no other service page at all. A visitor reading "office relocation" had no
# route to "packing & unpacking"; they had to go back up to the hub. The
# Kanpur page linked to one service page, and only because its body copy
# happened to mention car transport.
#
# That is a dead end for a reader and a single thread for a crawler. Fixing it
# is not an SEO trick -- it is the navigation a reader of that page needs next.
#
# THE PAIRINGS ARE HAND-WRITTEN, NOT "THE OTHER SEVEN"
# ----------------------------------------------------
# Each page links to three others, chosen by what somebody on THAT page would
# actually want, and each link carries a line written for that pairing. A
# block listing all eight services with generic blurbs would be the same
# boilerplate repeated eight times, which helps nobody and reads like filler.
#
# Idempotent: a fragment that already has data-related-services is skipped.
# Uses .grid/.card, already styled. Adds no CSS.

param(
  # Remove the blocks this script previously inserted and write them again.
  # Needed when the pairings or the wording below change, because the normal
  # behaviour is to skip a fragment that already has a block.
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Split-Path (Split-Path $here -Parent) -Parent

# slug -> the words used when linking TO it
$label = @{
  'home-shifting'         = 'Home shifting'
  'office-relocation'     = 'Office &amp; commercial relocation'
  'local-shifting'        = 'Local shifting'
  'intercity-relocation'  = 'Intercity &amp; long-distance moving'
  'packing-unpacking'     = 'Packing &amp; unpacking'
  'loading-unloading'     = 'Loading &amp; unloading'
  'storage-warehousing'   = 'Storage &amp; warehousing'
  'vehicle-transport'     = 'Car &amp; bike transportation'
}

# file -> heading + three { slug, why } written for this page
$plan = @(
  @{ file = 'service-home-shifting.part'
     head = 'What people usually ask about next'
     links = @(
       @{ slug = 'packing-unpacking';    why = 'The part of a household move most people hand over. What the wrapping actually is, layer by layer.' }
       @{ slug = 'local-shifting';       why = 'If the new address is also in Kanpur, the whole job normally finishes inside one day.' }
       @{ slug = 'intercity-relocation'; why = 'If it is out of the city: dedicated vehicle, delivery window agreed before it leaves.' }
     ) }

  @{ file = 'service-office-relocation.part'
     head = 'Usually part of the same office move'
     links = @(
       @{ slug = 'packing-unpacking';   why = 'Records into sealed crates, hardware bagged and taped to the unit it came off.' }
       @{ slug = 'storage-warehousing'; why = 'For the files and furniture that are not going to the new floor yet.' }
       @{ slug = 'loading-unloading';   why = 'If your own people are packing and you only need the crew and the trolleys.' }
     ) }

  @{ file = 'service-local-shifting.part'
     head = 'Related to a move inside Kanpur'
     links = @(
       @{ slug = 'home-shifting';      why = 'The full service, including dismantling and rebuilding the furniture at the other end.' }
       @{ slug = 'packing-unpacking';  why = 'Add the packing only, and keep the rest of the move as it is.' }
       @{ slug = 'loading-unloading';  why = 'When you have the vehicle and have packed yourself, and need the lifting done properly.' }
     ) }

  @{ file = 'service-intercity-relocation.part'
     head = 'Usually booked alongside a long-distance move'
     links = @(
       @{ slug = 'vehicle-transport'; why = 'The car or the two-wheeler, carried rather than driven, photographed at both ends.' }
       @{ slug = 'home-shifting';     why = 'The household side of the same job: inventory, packing, dismantling, rebuilding.' }
       @{ slug = 'packing-unpacking'; why = 'Distance is what packing is for. What goes on the edges and why.' }
     ) }

  @{ file = 'service-packing-unpacking.part'
     head = 'Where the packing goes next'
     links = @(
       @{ slug = 'home-shifting';     why = 'Packing as part of the whole household move rather than on its own.' }
       @{ slug = 'office-relocation'; why = 'The same materials on records, IT and modular furniture.' }
       @{ slug = 'loading-unloading'; why = 'Packed already? This is the crew without the packing.' }
     ) }

  @{ file = 'service-loading-unloading.part'
     head = 'If you need more than the crew'
     links = @(
       @{ slug = 'packing-unpacking';  why = 'Have us wrap it first, so what the crew lifts is already protected.' }
       @{ slug = 'local-shifting';     why = 'The vehicle and the crew together, for a move inside Kanpur.' }
       @{ slug = 'storage-warehousing';why = 'When the goods come off the vehicle but the new place is not ready.' }
     ) }

  @{ file = 'service-storage-warehousing.part'
     head = 'What storage is usually part of'
     links = @(
       @{ slug = 'home-shifting';     why = 'Possession dates that do not line up are the usual reason a household needs storage.' }
       @{ slug = 'office-relocation'; why = 'Records and surplus furniture held while the new floor is fitted out.' }
       @{ slug = 'packing-unpacking'; why = 'Goods going into storage are wrapped the same way as goods going onto a vehicle.' }
     ) }

  @{ file = 'service-vehicle-transport.part'
     head = 'Usually moving with the household'
     links = @(
       @{ slug = 'intercity-relocation'; why = 'The household goods on the same route, in their own dedicated vehicle.' }
       @{ slug = 'home-shifting';        why = 'Inventory, packing, dismantling and rebuilding at the destination.' }
       @{ slug = 'local-shifting';       why = 'If the whole move is inside Kanpur, the car usually does not need a carrier at all.' }
     ) }
)

# The city page had exactly ONE inbound internal link -- from the locations
# hub -- which for the one page carrying "Kanpur" in its H1 is the wrong
# number. Each service page now closes its related block with a route to it.
# Written as a sentence a reader would follow, not a bare keyword link.
$kanpurTail = @'
      <p class="mt-6"><a class="link-cta" href="/locations/kanpur.html">
        What we cover in Kanpur, area by area
        <svg class="ic" aria-hidden="true"><use href="#i-arrow-right"/></svg>
      </a></p>
'@

function Block([string]$id, [string]$head, $links, [string]$lead, [string]$tail) {
  $sb = New-Object System.Text.StringBuilder
  $null = $sb.AppendLine('')
  $null = $sb.AppendLine('  <!-- Related services. Generated by tools/seo/add-related-services.ps1 --')
  $null = $sb.AppendLine('       edit the pairings there, not here, or the next run will not know')
  $null = $sb.AppendLine('       this block exists. The three links are chosen for THIS page. -->')
  $null = $sb.AppendLine(('  <section class="section is-tight on-sunk" aria-labelledby="' + $id + '" data-related-services>'))
  $null = $sb.AppendLine('    <div class="wrap">')
  $null = $sb.AppendLine('      <div class="section-head">')
  $null = $sb.AppendLine(('        <h2 id="' + $id + '">' + $head + '</h2>'))
  if ($lead) { $null = $sb.AppendLine(('        <p class="lead">' + $lead + '</p>')) }
  $null = $sb.AppendLine('      </div>')
  $null = $sb.AppendLine('      <div class="grid grid-3">')
  foreach ($l in $links) {
    if (-not $label.ContainsKey($l.slug)) { throw "unknown slug: $($l.slug)" }
    $null = $sb.AppendLine('        <article class="card">')
    $null = $sb.AppendLine(('          <h3><a href="/services/' + $l.slug + '.html">' + $label[$l.slug] + '</a></h3>'))
    $null = $sb.AppendLine(('          <p>' + $l.why + '</p>'))
    $null = $sb.AppendLine('        </article>')
  }
  $null = $sb.AppendLine('      </div>')
  if ($tail) { $null = $sb.AppendLine($tail.TrimEnd()) }
  $null = $sb.AppendLine('    </div>')
  $null = $sb.AppendLine('  </section>')
  $null = $sb.AppendLine('')
  return $sb.ToString()
}

function InsertBeforeCta([string]$path, [string]$html, [string]$name) {
  $text = [IO.File]::ReadAllText($path)
  if ($text -match 'data-related-services') {
    if (-not $Force) {
      Write-Output ("  skipped (already linked): {0}" -f $name)
      return $false
    }
    # Strip from the generated comment through the section's close, so the
    # rewrite cannot stack two blocks or leave half of one behind.
    $before = $text.Length
    $text = [regex]::Replace($text,
      '\r?\n\s*<!-- Related services\. Generated by[\s\S]*?</section>\r?\n',
      "`n")
    if ($text.Length -ge $before) { throw "could not strip the old block from $name" }
    [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))
  }
  $marker = '  <section class="section is-tight cta-band"'
  $at = $text.LastIndexOf($marker)
  if ($at -lt 0) { throw "no cta-band to insert before in $name" }
  $text = $text.Substring(0, $at) + $html + $text.Substring($at)
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))
  return $true
}

$done = 0; $skipped = 0
foreach ($p in $plan) {
  $path = Join-Path $proj ('tools\pages\' + $p.file)
  if (-not (Test-Path $path)) { throw "missing fragment: $($p.file)" }
  $id = 'related-' + ($p.file -replace '^service-', '' -replace '\.part$', '')
  $html = Block $id $p.head $p.links $null $kanpurTail
  if (InsertBeforeCta $path $html $p.file) {
    Write-Output ("  linked {0} -> {1}" -f $p.file, (($p.links | ForEach-Object { $_.slug }) -join ', '))
    $done++
  } else { $skipped++ }
}

# ---------------------------------------------------------------------------
# The Kanpur page. It is the one location page and the only page carrying the
# city in its H1, so a reader who arrives there searching for the city needs
# the route to every service -- not to three of them.
# ---------------------------------------------------------------------------
$kanpurLinks = @(
  @{ slug = 'home-shifting';        why = 'Flats and houses inside Kanpur and out of it, surveyed before it is quoted.' }
  @{ slug = 'local-shifting';       why = 'Address to address within the city, normally finished in a single day.' }
  @{ slug = 'office-relocation';    why = 'Planned around your downtime, including weekend slots.' }
  @{ slug = 'packing-unpacking';    why = 'The wrapping on its own, if you want to keep the rest of the move yourself.' }
  @{ slug = 'loading-unloading';    why = 'Crews, trolleys and straps when the vehicle is already yours.' }
  @{ slug = 'intercity-relocation'; why = 'Out of Kanpur in a dedicated vehicle, with a delivery window agreed first.' }
  @{ slug = 'storage-warehousing';  why = 'Inventoried in and out, charged by duration.' }
  @{ slug = 'vehicle-transport';    why = 'Cars and two-wheelers in covered carriers, condition photographed at both ends.' }
)
$kpath = Join-Path $proj 'tools\pages\location-kanpur.part'
$khtml = Block 'related-kanpur' 'Every service, in Kanpur' $kanpurLinks `
  'All eight run out of the Swaroop Nagar office, by the same crews.' $null
if (InsertBeforeCta $kpath $khtml 'location-kanpur.part') {
  Write-Output "  linked location-kanpur.part -> all 8 services"
  $done++
} else { $skipped++ }

Write-Output ""
Write-Output ("blocks added: {0}   skipped: {1}" -f $done, $skipped)
Write-Output "Now run tools\assemble.ps1, then re-count inbound links."
