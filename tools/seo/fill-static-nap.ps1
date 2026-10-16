# Put the name, address and phone number into the footer MARKUP, not just
# into the JavaScript that fills it.
#
# WHAT WAS WRONG
# --------------
# The footer's phone, WhatsApp, email and postal address were all empty
# elements carrying `hidden`, filled at runtime by main.js from config.js.
# The pattern itself is right -- one source of truth, and nothing invented
# when a value is missing. The consequence was not:
#
#   Probed against the static index.html before this ran:
#     "98391 00644"            absent
#     "akashmovers@rediffmail" absent
#     "208002"                 absent
#     postal address           absent
#
# So anything that does not execute JavaScript saw a footer with no way to
# contact the business, on 19 of the 20 pages. Only contact.html carried the
# address in its own markup.
#
# For a local business that is the wrong thing to hide. Name/address/phone,
# identical on every page, is the signal local search leans on hardest, and
# the robots.txt here deliberately invites fourteen AI crawlers -- most of
# which do not run JavaScript at all.
#
# WHAT THIS DOES
# --------------
# Reads the real values out of js/config.js and writes them into index.html's
# footer as the elements' initial content, dropping `hidden` from the ones
# that are genuinely configured. main.js then writes the same strings over
# the top, so there is still exactly one place to edit. assemble.ps1 copies
# index.html's footer into every other page, so this is one edit for 20 pages.
#
# The drift this introduces is real and is guarded, not hoped about:
# tools/check.ps1 now re-reads config.js and fails if the static footer and
# the config disagree. Anything still PLACEHOLDER is left hidden and empty --
# the hide-until-configured behaviour is preserved, not bypassed.
#
# Idempotent: re-running rewrites the same values.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Split-Path (Split-Path $here -Parent) -Parent

. (Join-Path $here 'nap.ps1')
$nap = Read-Nap $proj

Write-Output 'Values read from js/config.js:'
foreach ($k in @('phoneDisplay', 'phoneDial', 'email', 'whatsappNumber', 'addressLine')) {
  Write-Output ("  {0,-16} {1}" -f $k, $nap[$k])
}
Write-Output ''

$path = Join-Path $proj 'index.html'
$text = [IO.File]::ReadAllText($path)

function Esc([string]$s) {
  return $s.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;')
}

# --- phone -----------------------------------------------------------------
$old = '<li data-footer-phone hidden><a data-tel-link><span data-config="contact.phoneDisplay"></span></a></li>'
$new = ('<li data-footer-phone><a data-tel-link href="tel:+{0}"><span data-config="contact.phoneDisplay">{1}</span></a></li>' -f `
        $nap['phoneDial'].TrimStart('+'), (Esc $nap['phoneDisplay']))
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Output '  footer phone:    filled' }
elseif ($text.Contains($new)) { Write-Output '  footer phone:    already filled' }
else { throw 'footer phone markup not found and not already filled -- check index.html by hand' }

# --- WhatsApp --------------------------------------------------------------
$old = '<li data-footer-wa hidden><a data-wa-link>WhatsApp</a></li>'
$new = ('<li data-footer-wa><a data-wa-link href="https://wa.me/{0}" rel="noopener noreferrer" target="_blank">WhatsApp</a></li>' -f $nap['whatsappNumber'])
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Output '  footer whatsapp: filled' }
elseif ($text.Contains($new)) { Write-Output '  footer whatsapp: already filled' }
else { throw 'footer whatsapp markup not found and not already filled' }

# --- email -----------------------------------------------------------------
$old = '<li data-footer-email hidden><a data-mail-link><span data-config="contact.email"></span></a></li>'
$new = ('<li data-footer-email><a data-mail-link href="mailto:{0}"><span data-config="contact.email">{0}</span></a></li>' -f (Esc $nap['email']))
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Output '  footer email:    filled' }
elseif ($text.Contains($new)) { Write-Output '  footer email:    already filled' }
else { throw 'footer email markup not found and not already filled' }

# --- postal address --------------------------------------------------------
# A real <address> element rather than a <p>, because that is what it is, and
# because the microdata-free markup still tells an assistive technology and a
# parser what this block of text is.
$old = '<p class="mt-5 footer__note" data-footer-address hidden></p>'
$new = ('<address class="mt-5 footer__note" data-footer-address>{0}</address>' -f (Esc $nap['addressLine']))
if ($text.Contains($old)) { $text = $text.Replace($old, $new); Write-Output '  footer address:  filled' }
elseif ($text -match '<address class="mt-5 footer__note" data-footer-address>') {
  $text = [regex]::Replace($text, '<address class="mt-5 footer__note" data-footer-address>.*?</address>', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $new })
  Write-Output '  footer address:  rewritten'
}
else { throw 'footer address markup not found and not already filled' }

[IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))
Write-Output ''
Write-Output 'index.html footer updated. Now run tools\assemble.ps1 to copy it to the other 19 pages.'
