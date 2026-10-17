# Akash Movers — website audit and implementation report

**Date:** 17 October 2026
**Site:** <https://akashmovers.com>
**Repository:** `vedanttripathi-dev/akaksh-movers-`

This report covers what was found, what was changed, what was measured, and
what is still outstanding. Where something was *not* verified, it says so.

---

## 1. Audit of the existing site

### 1.1 Architecture — verified, not assumed

| Question | Answer |
|---|---|
| Static, server-rendered or client-rendered? | **Static.** Hand-written HTML5 files served as-is. |
| Framework | None. No React, no Next, no CMS. |
| Build process | None. `tools/assemble.ps1` is an authoring aid that stamps shared chrome into the page files; the `.html` files in the repo are the deliverable. |
| Routing | The filesystem. `/services.html`, `/locations/kanpur.html`, and so on. |
| Hosting | **GitHub Pages** (`server: GitHub.com`). The repo contains Cloudflare Pages Functions, which GitHub Pages cannot run. |
| Package manager | None. No `package.json`, no `node_modules`. |

**The brief asked whether server-side rendering was needed. It is not.** Every
page ships its title, description, canonical, H1, body copy, navigation and
image alt attributes in the initial HTML response. There is no client-side
routing and no body content that appears only after JavaScript runs.
Replacing the architecture would have added a build step and a dependency
tree in exchange for nothing.

> **Correction, 17 October 2026.** An earlier version of this paragraph also
> listed JSON-LD as shipping in the initial response. **It did not.** Probed
> against the static files, `index.html` contained zero
> `application/ld+json` blocks; the structured data was built by
> `js/schema.js` and injected at runtime. The same probe found no phone
> number, no email and no postal code in the static `index.html` either. See
> C6 and H8 below.
>
> **Both are now fixed** (18 October 2026) — the contact details by H8, the
> structured data by M11 and §7 — so the paragraph above is true as written
> today. The correction stays because the claim was wrong when it was made,
> and it is the kind of thing a hosting decision gets made on.

JavaScript is used for progressive enhancement only: contact details written
from one config file, the callback dialog, the review section, the gallery
lightbox. With JavaScript disabled, every page still renders its content and
the phone, WhatsApp and contact links still work.

### 1.2 Findings

#### Critical

| # | Finding | Status |
|---|---|---|
| C1 | **No WebP encoder exists on this machine**, so the `Optimized-WebP` folder the brief asked for could not be produced. `cwebp`, the WIC encoder registry and `System.Drawing`'s encoder list were all checked. | **Not fixed — cannot be, here.** Optimised JPEG delivered instead, documented in the image pack README. ~25–30% larger than WebP would be. |
| C2 | **No security headers on the live site.** `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` and `Referrer-Policy` all return absent. `_headers` exists and is correct, but GitHub Pages ignores it. | **Open.** Needs a host that reads `_headers`. |
| C3 | **The callback form cannot deliver a lead.** `/api/lead` returns 405 on GitHub Pages, which runs no server code. | **Open, and failing honestly** — the visitor is told it did not send and handed a WhatsApp link with their details filled in. Never reports success. |
| C4 | **`www.akashmovers.com` serves a certificate for `*.github.io`**, so it shows a browser security warning. The apex domain is fine. | **Open — one DNS edit.** See §6. |
| C5 | **The site and the Google Business Profile disagree about the address.** The Profile says Arya Nagar; the shopfront photograph and the Sulekha listing both say 113/186, Swaroop Nagar. | **Site fixed. Profile is the owner's to change** and is the single highest-value item left. |
| C6 | **Not one page of this site is in Google's index.** `site:akashmovers.com` returns zero results. Everything else about ranking is downstream of this. Cause is not a fault: the domain is days old, Search Console has never been verified, and **no link to it exists anywhere on the web**, so Google has had no discovery path. | **Open — needs a Google login, which I cannot do.** `robots.txt`, `noindex`, canonicals, sitemap and redirects were all checked first and are all correct. Full plan in `LOCAL-SEO.md`. |

#### High

| # | Finding | Status |
|---|---|---|
| H1 | **833 KB of Three.js** and three loaders, for a generic 3D hero truck that belonged to no one. | **Fixed** — removed, replaced with a photograph of the company's own shopfront. |
| H2 | **114 KB of GSAP + ScrollTrigger on every page** of the site, used by one module driving one section. | **Fixed** — removed with the "How it works" section. |
| H3 | **Content was not centred below 1280px.** The side scroll-rail forced `padding-left: 40px` against `padding-right: 16px`. Every heading, paragraph and card on the site sat 24px off-centre on a phone. | **Fixed** — rail is desktop-only; padding is symmetric. |
| H4 | **The palette did not match the client's.** The site used a red sampled from a photograph of the signboard. | **Fixed** — rebuilt on the supplied Wine Red `#7F011F` and Light Sand `#F5EBD0`. |
| H5 | **Four contrast failures** introduced by the earlier palette change, down to 1.33:1. | **Fixed and re-measured.** See §4. |
| H6 | **No photographs of the company's work anywhere on the site.** | **Fixed** — 44 supplied photographs, a gallery page, alt text and captions. |
| H7 | **`og-image.png` did not exist** although every page's meta tags pointed at it, so shared links showed no preview. | **Fixed.** |
| H8 | **The name, address and phone number were not in the HTML.** The footer's phone, WhatsApp, email and postal address were empty elements marked `hidden`, filled by `main.js` at runtime. Probing the static files found no phone number, no email and no postal code in `index.html`; only `contact.html` carried the address in its own markup. Googlebot renders JavaScript, but Bing's renderer is far weaker and most of the fourteen AI crawlers `robots.txt` deliberately invites do not render at all — so to all of them, 19 of 20 pages offered no way to contact the business. For a local business this is the signal local search leans on hardest. | **Fixed** — written into the markup on all 19 indexable pages by `tools/seo/fill-static-nap.ps1`, with `main.js` writing the same strings over the top so `config.js` stays the one source. `check.ps1` re-reads the config and fails on drift; **verified by injecting a wrong address and a re-hidden phone number — it caught both** (exit 2). |
| H9 | **The service pages were dead ends.** Each of the seven deeper service pages had exactly **one** inbound internal link, from the services hub, and linked to no other service page. `/locations/kanpur.html` — the only page with the city in its H1 — also had one. | **Fixed** by `tools/seo/add-related-services.ps1`: three hand-picked related services per page with a line written for that pairing, plus a route to the Kanpur page. Kanpur **1 → 9** inbound links; the seven service pages **1 → 4–8** each. Pairings are hand-written, not "the other seven". |
| H10 | **`sameAs` was empty**, so nothing connected this new domain to the business's existing listings. Under the former trading name, with no inbound links, the site reads as a different company that shares a phone number. | **Partly fixed** — the IndiaMART profile is published after being opened and checked against four fields (trading name, owner, founding year, locality). Sulekha, Justdial, Bing Places and Apple Maps are left `PLACEHOLDER` and omitted; a `sameAs` pointing at the wrong business is a false machine-readable claim about this one. |

#### Medium

| # | Finding | Status |
|---|---|---|
| M1 | Page titles, descriptions, canonicals, H1s | **Verified correct.** 20 pages, zero duplicate titles, zero duplicate descriptions, exactly one H1 each, every canonical absolute and matching the sitemap. |
| M2 | `robots.txt` | **Verified.** Returns 200 at the root, valid syntax, blocks nothing public, points at the correct sitemap URL on the correct domain. |
| M3 | Broken internal links | **Zero**, across 19 distinct targets. |
| M4 | Incorrect `noindex` | **None found.** The only `noindex` is on `404.html`, which is correct. |
| M5 | Redirect chains and loops | **None.** `http://` → `https://` is a single 301. There are no other redirects: nothing has been deleted that had a URL. |
| M6 | Structured data | Present and valid. `MovingCompany`, `WebSite`, `BreadcrumbList`, `Service` ×8, `FAQPage`, and the correct `WebPage` subtype per URL — `AboutPage` on About, `ContactPage` on Contact, `CollectionPage` on the gallery. The FAQ page deliberately does **not** get `FAQPage` on its WebPage node, because a separate `FAQPage` node already carries the questions; two would be duplicate, conflicting markup. Verified: exactly one `FAQPage` node on `/faq.html`. |
| M7 | Development files were publicly served (`/README.md`, `/tools/*`) | **Fixed earlier**; re-verified 404 on the live site. |
| M8 | Thin content on the new gallery page (290 words) | **Fixed** — real copy explaining what is visible in the photographs. |
| M9 | **`terms.html` carried six `[TO BE SUPPLIED]` blanks and a banner reading "Template — not ready to publish"**, live, linked from every footer. | **Fixed.** The banner was written for the developer and was being shown to customers. The blanks were **not** filled with invented policy — each now states what this site says everywhere else, that the figures for a job are confirmed in writing with the quotation. The real deposit, notice, cancellation scale, cover, claim window, payment terms and complaint acknowledgement time **still need the owner and a legal review**. |
| M10 | No photographs on any page except the homepage hero | **Fixed** — photo strips on the services hub, seven service pages, About, the Kanpur page, the locations hub and the homepage. `vehicle-transport` deliberately has none: not one of the 44 photographs shows a vehicle being carried. |
| M11 | **The JSON-LD was injected by JavaScript, not served in the HTML.** `index.html` contained zero `application/ld+json` blocks; `js/schema.js` built and inserted the graph on load. Googlebot renders JavaScript, so Google saw it with a delay; Bing and most AI crawlers largely do not. | **Fixed.** The graph is now in the `<head>` of all 19 indexable pages, baked by `tools/seo/bake-schema.ps1`, and `injectSchema()` replaces that block rather than appending. **No second implementation was created** — the bake works from a capture of what `schema.js` itself produced in a browser, and refuses to write a page whose reassembled graph does not hash to what the browser emitted. All 19 matched. See §7. |
| M12 | **Breadcrumbs split on the `;` inside `&amp;`.** `assemble.ps1` separated crumbs on `\s*;\s*`, so `Loading &amp; unloading` became two crumbs, `Loading &amp` and `unloading`, both carrying `aria-current="page"`. Live on `/services/loading-unloading.html` and `/services/packing-unpacking.html`, in the visible trail **and** in the `BreadcrumbList` structured data, which showed 4 items instead of 3. | **Fixed** — the separator now requires whitespace before the semicolon, which an HTML entity never has. Found by reading the rendered graph before baking it. |
| M13 | **The homepage's WebPage node disagreed with its own canonical.** Loaded as `/index.html` it produced `@id`/`url` of `https://akashmovers.com/index.html` while the `<link rel="canonical">` beside it said `https://akashmovers.com/` — two URLs for one page in one `<head>`. It also referenced a `#breadcrumbs` node that nothing defined, since the homepage has no breadcrumb trail. | **Both fixed in `js/schema.js`**: the path is normalised so `/index.html` resolves to `/`, and the `breadcrumb` property is emitted only when a `BreadcrumbList` is actually in the graph. |

---

## 2. What was removed, and why

| Removed | Size | Reason |
|---|---|---|
| "How it works" section + `js/journey.js` + GSAP + ScrollTrigger | **114 KB** | Asked for by the client. **It was never a separate route** — only a `#how-it-works` anchor into the homepage — so there was no URL to redirect and no 404 created. The nav item now points at the new Gallery. |
| 3D hero + Three.js, GLTFLoader, BufferGeometryUtils, RoomEnvironment | **833 KB** | A model that was not this company's, telling a customer nothing. |
| Side scroll-rail truck + `js/scroll-truck.js` | 6 KB, and 40px of every phone screen | Decorative, restated the scrollbar, and pushed the page content off-centre to make room for itself. |
| Five-step estimate form | — | Replaced by a four-field callback form. |

`vendor/` is now empty and gone. **The site loads no third-party JavaScript
at all**, which is also what keeps the Content-Security-Policy at
`script-src 'self'`.

---

## 3. Measured results

Homepage, 390px viewport, local server:

| | |
|---|---|
| Requests | 18 |
| Transferred | 426 KB total — 123 KB JS, 117 KB fonts, 81 KB CSS, 81 KB images |
| DOM nodes | 649 |
| Page height on a phone | **8,962px**, down from 12,597px before this work |
| Horizontal overflow at 320px and 390px | **0** |

**Layout stability:** every image on the site carries explicit `width` and
`height`, and the hero photograph has a declared `aspect-ratio`, so nothing
reflows as images arrive.

**LCP element** is the hero headline and the office photograph, both plain
HTML. The photograph is served at three widths through `srcset` and
preloaded with matching `imagesrcset`/`imagesizes`.

These are structural facts measured locally. **They are not Core Web Vitals
field data**, which only Search Console and real visitors can supply.

---

## 4. Accessibility — measured, not eyeballed

A script walked every visible text node on each page, resolved each one's
real background colour by climbing the DOM, and compared it against the WCAG
AA threshold for that element's size and weight.

| Page | Text nodes checked | Failures |
|---|---|---|
| Home (1280px) | 102 | **0** |
| Home (390px) | 145 | **0** |
| Gallery | 77 | **0** |
| Contact | 93 | **0** |
| About | 132 | **0** |

Touch targets were measured at 390px: everything interactive now clears
40px, buttons and form fields are at 48px.

The gallery lightbox was tested by driving it: it opens on the right
photograph, traps focus, moves with the arrow keys, closes on Escape, and
returns focus to the thumbnail that opened it.

---

## 5. Images

44 photographs supplied, all genuine work photographs. Every one was looked
at before anything was written about it.

- Served at two widths (400px thumbnail, 1000px full). Thumbnails average
  **19 KB**; the whole gallery is 833 KB of thumbnails, lazy-loaded.
- **Every alt text is different** and describes what is actually in that
  frame. Where an object could not be identified with confidence, the text
  describes the wrapping rather than guessing at the contents.
- Filenames are descriptive (`strapped-cartons-on-trolley.jpg`), not
  `WhatsApp Image 2026-10-17 at 1.15.50 AM (2).jpeg`.
- The gallery is **static HTML**. Every `<img>`, its alt text and the copy
  around it are in the served markup.
- No photograph identifies a customer, an address or a job.

**An image pack has been written to your own PC** at
`C:\Users\VEDANT TIWARI\OneDrive\Pictures\akash-movers-image-pack` —
originals, optimised copies, a CSV, a JSON file, the descriptions and a
README explaining the WebP position.

---

## 6. Outstanding — and who has to do it

### Needs you, not code

**The indexing and citation plan is a document of its own: `LOCAL-SEO.md`.**
It starts from the measured fact that `site:akashmovers.com` returns nothing,
and puts Search Console and the Business Profile ahead of any link building,
because a site that is not indexed cannot rank no matter what points at it.

0. **Verify Google Search Console and request indexing.** Nothing else on this
   list can show a result until this happens. Needs a Google login.
1. **Change the address on the Google Business Profile** to 113/186, Swaroop
   Nagar, and **add the website URL to the Profile**. The site and the Profile
   currently disagree, and Google weighs name/address/phone consistency
   heavily for local results. Highest value item on this list.
1b. **Paste the website URL into the existing IndiaMART listing**, whose
   website field is empty. It is the one real inbound link available today.
2. **Fix the `www` DNS record.** GoDaddy → DNS → the `CNAME` row named
   `www` → Data: `vedanttripathi-dev.github.io`. Verified against GoDaddy's
   own nameservers (`ns15`), it still points at `akashmovers.com`.
3. **Google Search Console.** No access was provided, so **nothing was
   submitted and nothing is claimed.** When you are ready: add the property,
   verify it, and submit `https://akashmovers.com/sitemap.xml`. Submission is
   a discovery signal, not indexing.
4. **Confirm the one-hour callback promise.** It is printed under the form.
   One line in `js/config.js` changes or removes it.
5. **Send owner photographs.** The About page has a place for them and there
   are none in the 44 supplied. A real face is among the strongest trust
   signals a local service business has.
6. **Google Business Profile URL and review link**, so the reviews section
   and the "Share your experience" button can go live.

### Needs a hosting decision

**Moving to Cloudflare Pages fixes C2, C3 and the `_redirects` file in one
step**, because `functions/`, `_headers` and `_redirects` all already exist
and are already written. On GitHub Pages they are inert. This is the single
change that turns the callback form into something that delivers leads.

---

## 7. Structured data: served, not just rendered

The graph is now in the HTML of all 19 indexable pages. What matters is how,
because the obvious way to do this is also the way it rots.

**There is still exactly one thing that builds the graph.** `js/schema.js`
does. Re-deriving it in PowerShell would have been a second source of truth
that silently diverges the first time someone edits the JavaScript.
`tools/seo/schema-data.json` is a *capture* — the real pages were loaded in a
browser against the dev server and the output of `schema.js` was copied out
of the DOM. `tools/seo/bake-schema.ps1` only reassembles each page's graph
from that capture, in `buildSchema()`'s node order.

**The reassembly is not trusted either.** The capture records the SHA-256 of
the exact JSON string the browser produced for each page, and a page is
skipped with an error if the reassembled string does not hash to it. All 19
matched on the first run.

**`injectSchema()` now replaces that block instead of appending**, so a page
never carries two graphs with the same `@id`s. It still runs, because
`faqNode()` reads the questions out of the live DOM — that is what keeps the
marked-up answer and the visible answer identical. The static block is the
floor; the runtime copy is the current truth. Verified under the production
CSP: one block after boot, byte-identical to the served copy.

### What `check.ps1` now fails on

Every one of these was proved to fail by injecting the fault and watching the
exit code, then reverting:

| Fault injected | Caught |
|---|---|
| A page's JSON-LD block removed, or a second one added | yes |
| Baked `telephone` no longer matching `js/config.js` | yes |
| `aggregateRating` or `review` markup appearing | yes |
| `js/schema.js` edited without re-baking | yes |
| Page `<title>` edited without re-baking | yes |
| Two `FAQPage` nodes in one graph | yes |
| A baked FAQ question that is **not visible on the page** | yes |

That last one is the one worth keeping. Google requires the answer in
`FAQPage` markup to be visible on the page, which `faqNode()` guaranteed for
free by reading the DOM; baking a copy breaks the guarantee unless something
re-checks it. The first version of that check passed when it should not have,
because it searched the whole file — including the JSON-LD block it was
checking, which of course contains the question. It strips the block first
now.

Two further guards exist because baking introduces staleness that still
*parses*: `tools/seo/schema-manifest.json` records the SHA-256 of
`js/config.js` and `js/schema.js` at bake time, and `assemble.ps1` — which
rebuilds pages from fragments and therefore discards the block — prints what
to run next. It deliberately does **not** re-bake automatically: if the
fragment's content changed, the capture is stale, and re-stamping it would
publish structured data that no longer matches the page.

---

## 8. Things deliberately not done

- **No fabricated reviews, ratings, review counts, awards or credentials.**
  The reviews section hides itself rather than showing a placeholder.
- **No review structured data.** Every review on this site is a review of
  this business on this business's own site, which is what Google's
  guidelines call self-serving. Marking it up risks a manual action for a
  star rating that would not be shown anyway.
- **No claim that a sitemap was submitted**, because it was not.
- **No invented service areas.** One location page, Kanpur, because that is
  the only coverage that is independently verified.
- **No stock photography.**
- **No "No. 1", "India's best" or "100% damage-free".**
