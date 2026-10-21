#!/usr/bin/env python3
"""Generate the Google review QR assets.

WHY THIS IS A BUILD-TIME SCRIPT AND NOT A BROWSER WIDGET
---------------------------------------------------------
The obvious implementation is a QR library running in the page. This site
loads NO third-party JavaScript at all -- that is what keeps its
Content-Security-Policy at `script-src 'self'` -- and the business also needs
the code on flyers, invoices and office signage, where a browser widget is
useless. So the QR is generated once, here, as a static asset.

WHAT IT REFUSES TO DO
---------------------
It will not invent a review URL. `contact.googleWriteReviewUrl` in
js/config.js is still PLACEHOLDER, and a QR code encoding a guessed or
"probably right" Google URL is worse than no QR code at all: it is a printed,
distributed pointer to the wrong business, and nobody finds out until a
customer tries to use it.

With no URL configured this script prints exactly what is missing and exits
non-zero. Pass --test-url to prove the toolchain end to end without
publishing anything; those assets are marked TEST and written elsewhere.

USAGE
    python tools/qr/make-review-qr.py                 # uses js/config.js
    python tools/qr/make-review-qr.py --test-url URL  # pipeline proof only

OUTPUT (assets/qr/)
    review-qr.svg          vector, prints at any size
    review-qr.png          1200px, for screens and messaging
    review-qr-print.svg    A5 sheet: heading, QR, instructions
"""
import argparse
import os
import re
import sys

try:
    import segno
except ImportError:
    sys.exit("segno is not installed.  Run:  python -m pip install segno")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG = os.path.join(ROOT, "js", "config.js")


def read_config_string(key):
    """Read one quoted scalar out of js/config.js. None means 'not set'."""
    with open(CONFIG, encoding="utf-8") as fh:
        src = fh.read()
    pattern = r"^\s*" + re.escape(key) + r"\s*:\s*'([^']*)'"
    m = re.search(pattern, src, re.M)
    if not m:
        return None
    value = m.group(1).strip()
    if not value or value == "PLACEHOLDER":
        return None
    return value


def sanity_check_review_url(url):
    """Catch the mistakes that produce a confidently wrong printed QR."""
    problems = []
    if not url.startswith("https://"):
        problems.append("does not start with https://")

    ok_shapes = (
        "g.page/r/",
        "search.google.com/local/writereview",
        "www.google.com/maps",
        "maps.app.goo.gl/",
    )
    if not any(s in url for s in ok_shapes):
        problems.append(
            "does not look like a Google link (expected one of: "
            + ", ".join(ok_shapes) + ")")

    if "writereview" not in url and "g.page/r/" not in url:
        problems.append(
            "may open the listing rather than the REVIEW form -- a share link "
            "to the profile is not the same as the 'write a review' link")
    return problems


PRINT_SHEET = u"""<svg xmlns="http://www.w3.org/2000/svg" width="148mm" height="210mm"
     viewBox="0 0 148 210" role="img" aria-label="Scan to review {business} on Google">
  <rect width="148" height="210" fill="#ffffff"/>
  <rect x="0" y="0" width="148" height="10" fill="#7f011f"/>
  <text x="74" y="32" text-anchor="middle" font-family="Georgia, serif"
        font-size="9" font-weight="bold" fill="#1a1512">{business}</text>
  <text x="74" y="44" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="5.2" fill="#4c423b">Had a good experience with us?</text>
  <text x="74" y="53" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="5.2" fill="#4c423b">Scan to share it on Google.</text>
  <g transform="translate({qx}, 64)">{qr}</g>
  <text x="74" y="168" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="4.6" fill="#4c423b">Open your phone camera and point it at the code.</text>
  <text x="74" y="176" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="4.6" fill="#6a5e55">Google may ask you to sign in first.</text>
  <text x="74" y="190" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="4" fill="#6a5e55">Your honest feedback helps us improve our service.</text>
  <text x="74" y="201" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="3.2" fill="#9a8f86">{note}</text>
</svg>
"""


def main():
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--test-url", help="prove the toolchain without a real URL")
    args = ap.parse_args()

    business = read_config_string("name") or "Akash Movers"

    if args.test_url:
        url = args.test_url
        out_dir = os.path.join(ROOT, "tools", "qr", "test-output")
        prefix = "TEST-"
        note = "TEST ASSET - NOT FOR PRINTING"
        print("TEST MODE: encoding the supplied URL, not a configured one.")
        print()
    else:
        url = read_config_string("googleWriteReviewUrl")
        if not url:
            print("BLOCKED -- cannot generate the review QR code.")
            print()
            print("  Missing: contact.googleWriteReviewUrl in js/config.js")
            print("           (still PLACEHOLDER)")
            print()
            print("  How to get it:")
            print("    1. Sign in to the Google Business Profile for this business.")
            print("    2. Open the profile and choose 'Ask for reviews'.")
            print("    3. Copy the short link it gives you. It looks like")
            print("       https://g.page/r/XXXXXXXXXXXXXX/review")
            print("    4. Paste it into js/config.js as contact.googleWriteReviewUrl")
            print("    5. Re-run this script.")
            print()
            print("  Nothing was written. A QR encoding a guessed URL would be a")
            print("  printed pointer to the wrong business, so none was produced.")
            return 2

        problems = sanity_check_review_url(url)
        if problems:
            print("The configured review URL looks wrong:")
            print()
            for p in problems:
                print("  - " + p)
            print()
            print("  URL: " + url)
            print()
            print("Fix js/config.js, or use --test-url to bypass this check.")
            return 3

        out_dir = os.path.join(ROOT, "assets", "qr")
        prefix = ""
        note = ""

    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)

    # Error correction M is the floor, not the result: segno raises the level
    # for free whenever a stronger one still fits the same symbol version, so
    # a short URL like this actually comes out at Q (~25% recoverable). Either
    # survives a scuffed flyer. H is only worth forcing when a logo is punched
    # into the middle of the code, and this one has none.
    qr = segno.make(url, error="m")

    svg_path = os.path.join(out_dir, prefix + "review-qr.svg")
    png_path = os.path.join(out_dir, prefix + "review-qr.png")
    sheet_path = os.path.join(out_dir, prefix + "review-qr-print.svg")

    # border=4 is the quiet zone the spec requires. Narrower codes stop
    # scanning against a busy background, which is exactly what a flyer is.
    qr.save(svg_path, scale=10, border=4, dark="#000000", light="#ffffff")
    qr.save(png_path, scale=12, border=4, dark="#000000", light="#ffffff")

    modules = qr.symbol_size(border=0)[0]
    # Size the sheet's QR to 90mm and centre it on the 148mm page.
    sheet_scale = 90.0 / modules
    inline = qr.svg_inline(scale=sheet_scale, border=0,
                           dark="#000000", light="#ffffff")
    with open(sheet_path, "w", encoding="utf-8") as fh:
        fh.write(PRINT_SHEET.format(business=business, qr=inline,
                                    qx=29, note=note))

    print("Encoded: " + url)
    print("Version %s, error correction %s, %d x %d modules"
          % (qr.version, qr.error.upper(), modules, modules))
    print()
    for p in (svg_path, png_path, sheet_path):
        rel = os.path.relpath(p, ROOT).replace("\\", "/")
        print("  %-54s %7d B" % (rel, os.path.getsize(p)))
    print()
    print("NOT VERIFIED BY THIS SCRIPT: that a phone camera scans it, and that")
    print("the destination opens the correct business. Decode-test the image")
    print("and open the link on a real phone before anything is printed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
