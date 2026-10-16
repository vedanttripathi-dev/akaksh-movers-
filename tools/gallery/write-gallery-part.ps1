# Generate tools/pages/gallery.part from the processed photographs.
#
# STATIC markup on purpose. The brief asks that content not depend on a
# crawler executing JavaScript, and a gallery is the clearest case: an image
# search engine reads the <img>, its alt text, its filename and the text
# around it. A grid assembled at runtime gives it none of those.
#
# Each tile is a plain link to the larger photograph, so it works with
# JavaScript off, works from the keyboard, and the full image is itself a
# crawlable URL. js/lightbox.js upgrades those links in place.

Add-Type -AssemblyName System.Drawing
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = 'C:\Users\VEDANT TIWARI\triangle code\movers'
$meta = & (Join-Path $here 'gallery-data.ps1')

function Esc([string]$s) {
  return $s.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;')
}

$sb = New-Object System.Text.StringBuilder
$null = $sb.AppendLine('SLUG: gallery.html')
$null = $sb.AppendLine('TITLE: Our work in photographs | Akash Movers, Kanpur')
$null = $sb.AppendLine('DESC: Photographs of real jobs by Akash Movers in Kanpur - furniture wrapped in corrugated sheet and stretch film, labelled cartons, and consignments staged for loading.')
$null = $sb.AppendLine('HEADING: Our work, photographed')
$null = $sb.AppendLine('LEAD: Every photograph on this page is from a job we actually did. Nothing here is stock photography, and nothing has been staged for the website.')
$null = $sb.AppendLine('CRUMBS: Home|/ ; Gallery|')
$null = $sb.AppendLine('---')
$null = $sb.AppendLine('')
$null = $sb.AppendLine('  <section class="section on-paper" aria-labelledby="gallery-title">')
$null = $sb.AppendLine('    <div class="wrap">')
$null = $sb.AppendLine('      <div class="section-head">')
$null = $sb.AppendLine('        <span class="eyebrow">Packed by us</span>')
$null = $sb.AppendLine('        <h2 id="gallery-title">What careful packing actually looks like</h2>')
$null = $sb.AppendLine('        <p class="lead">')
$null = $sb.AppendLine('          Corrugated sheet on the corners and edges, stretch film over the top,')
$null = $sb.AppendLine('          and a label on every piece before it leaves the floor. These are the')
$null = $sb.AppendLine('          jobs our crews packed in Kanpur.')
$null = $sb.AppendLine('        </p>')
$null = $sb.AppendLine('      </div>')
$null = $sb.AppendLine('')
# A page of photographs with a caption each is thin content, and the check
# suite flags it as such. This copy is not padding: it explains what a
# visitor is actually looking at in the pictures below, which is the one
# thing a gallery cannot show by itself.
$null = $sb.AppendLine('      <div class="split is-wide-left mb-8">')
$null = $sb.AppendLine('        <div>')
$null = $sb.AppendLine('          <h3>What to look for in these photographs</h3>')
$null = $sb.AppendLine('          <p>')
$null = $sb.AppendLine('            Packing is mostly invisible work. Once a wardrobe is wrapped it looks')
$null = $sb.AppendLine('            like every other wrapped wardrobe, and the difference between a job')
$null = $sb.AppendLine('            that arrives intact and one that does not is in details you only')
$null = $sb.AppendLine('            notice if someone points them out. So here they are.')
$null = $sb.AppendLine('          </p>')
$null = $sb.AppendLine('          <p>')
$null = $sb.AppendLine('            <strong>Corrugated sheet goes on first, and it goes on the edges.</strong>')
$null = $sb.AppendLine('            A corner is where a knock lands when a piece is carried down a')
$null = $sb.AppendLine('            staircase or sits against the side of a vehicle. Several of the')
$null = $sb.AppendLine('            photographs below show studded edge protection taped along the full')
$null = $sb.AppendLine('            length of a panel for exactly that reason.')
$null = $sb.AppendLine('          </p>')
$null = $sb.AppendLine('          <p>')
$null = $sb.AppendLine('            <strong>Stretch film goes over the top, by hand.</strong> It holds the')
$null = $sb.AppendLine('            sheet in place, keeps dust and rain off, and stops drawers and doors')
$null = $sb.AppendLine('            opening in transit. It is not a substitute for the layer underneath')
$null = $sb.AppendLine('            it, which is why you can see both in almost every frame.')
$null = $sb.AppendLine('          </p>')
$null = $sb.AppendLine('        </div>')
$null = $sb.AppendLine('        <div>')
$null = $sb.AppendLine('          <p>')
$null = $sb.AppendLine('            <strong>Soft and loose items are strapped into blocks.</strong> Cushions')
$null = $sb.AppendLine('            and bedding are compressed and banded so they stack squarely instead')
$null = $sb.AppendLine('            of filling the vehicle with air. A tidier load is a load that moves')
$null = $sb.AppendLine('            less on the road.')
$null = $sb.AppendLine('          </p>')
$null = $sb.AppendLine('          <p>')
$null = $sb.AppendLine('            <strong>Things get labelled before they leave the floor.</strong> You')
$null = $sb.AppendLine('            will see handwriting on several of these: which room a piece came')
$null = $sb.AppendLine('            from, which way up it stands, what is inside. That writing is what')
$null = $sb.AppendLine('            makes unpacking at the far end take an afternoon rather than a week.')
$null = $sb.AppendLine('          </p>')
$null = $sb.AppendLine('          <p>')
$null = $sb.AppendLine('            <strong>Everything is staged before anything is carried.</strong> The')
$null = $sb.AppendLine('            shots taken outdoors and in parking areas are consignments gathered')
$null = $sb.AppendLine('            in loading order, so the vehicle is packed once, properly, instead')
$null = $sb.AppendLine('            of being repacked three times in the street.')
$null = $sb.AppendLine('          </p>')
$null = $sb.AppendLine('        </div>')
$null = $sb.AppendLine('      </div>')
$null = $sb.AppendLine('')
$null = $sb.AppendLine('      <div class="gallery" data-lightbox-group>')

foreach ($m in $meta) {
  $slug = $m.slug
  $thumb = "/assets/images/gallery/$slug-400.jpg"
  $full  = "/assets/images/gallery/$slug-1000.jpg"

  $t = [System.Drawing.Image]::FromFile((Join-Path $proj "assets\images\gallery\$slug-400.jpg"))
  $tw = $t.Width; $th = $t.Height; $t.Dispose()
  $g = [System.Drawing.Image]::FromFile((Join-Path $proj "assets\images\gallery\$slug-1000.jpg"))
  $gw = $g.Width; $gh = $g.Height; $g.Dispose()

  $alt = Esc $m.alt
  $null = $sb.AppendLine('        <figure class="shot">')
  $null = $sb.AppendLine("          <a class=`"shot__link`" href=`"$full`" data-full-w=`"$gw`" data-full-h=`"$gh`">")
  $null = $sb.AppendLine("            <img src=`"$thumb`" alt=`"$alt`" width=`"$tw`" height=`"$th`" loading=`"lazy`" decoding=`"async`">")
  $null = $sb.AppendLine('          </a>')
  if ($m.cap) {
    $null = $sb.AppendLine(('          <figcaption>' + (Esc $m.cap) + '</figcaption>'))
  }
  $null = $sb.AppendLine('        </figure>')
}

$null = $sb.AppendLine('      </div>')
$null = $sb.AppendLine('')
$null = $sb.AppendLine('      <p class="form-note mt-6">')
$null = $sb.AppendLine('        Photographs are of our own work. They show goods packed and ready to')
$null = $sb.AppendLine('        move; no customer, address or job detail is identified in any of them.')
$null = $sb.AppendLine('      </p>')
$null = $sb.AppendLine('    </div>')
$null = $sb.AppendLine('  </section>')
$null = $sb.AppendLine('')
$null = $sb.AppendLine('  <section class="section is-tight cta-band" aria-labelledby="gallery-cta">')
$null = $sb.AppendLine('    <div class="wrap">')
$null = $sb.AppendLine('      <div class="wrap-narrow text-centre">')
$null = $sb.AppendLine('        <h2 id="gallery-cta">Want your move packed like this?</h2>')
$null = $sb.AppendLine('        <p class="lead">Leave your name and number and we will call you back.</p>')
$null = $sb.AppendLine('        <div class="btn-row mt-6 btn-row--centre">')
$null = $sb.AppendLine('          <a class="btn btn--primary btn--lg" href="/contact.html" data-open-callback>Request a callback</a>')
$null = $sb.AppendLine('          <a class="btn btn--ghost btn--lg" data-wa-link hidden>')
$null = $sb.AppendLine('            <svg class="ic" aria-hidden="true"><use href="#i-whatsapp"/></svg>')
$null = $sb.AppendLine('            Chat on WhatsApp')
$null = $sb.AppendLine('          </a>')
$null = $sb.AppendLine('        </div>')
$null = $sb.AppendLine('      </div>')
$null = $sb.AppendLine('    </div>')
$null = $sb.AppendLine('  </section>')

Add-Type -AssemblyName System.Drawing
[IO.File]::WriteAllText((Join-Path $proj 'tools\pages\gallery.part'), $sb.ToString(), (New-Object Text.UTF8Encoding $false))
Write-Output ("wrote gallery.part  ({0} photographs, {1:N1} KB)" -f $meta.Count, ($sb.Length / 1KB))
