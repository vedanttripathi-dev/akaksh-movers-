# Akash Movers — website

A premium, animated marketing site for **Akash Movers, Kanpur** (formerly
*Akash Packers & Movers*), with a 3D hero, a scroll-linked moving journey, a
multi-step quote form, and a server-side lead endpoint that notifies the
business on WhatsApp.

Plain static files. **There is no build step and no Node requirement.**

---

## ⚠️ Read this first — what is verified and what is not

The business details on this site were filled in from research, not from
documents supplied by the client. Every value falls into one of three buckets,
and the bucket is written next to it in `js/config.js`.

### Published, because the proprietor stated it or sources corroborate it

| Detail | Value | Basis |
|---|---|---|
| Business name | Akash Movers | stated in writing by the proprietor |
| Former name | Akash Packers & Movers | stated by the proprietor; published as `alternateName` |
| Tagline | Excellence through service | stated by the proprietor |
| Trading since | 1983 | stated by the proprietor — see the caveat below |
| GSTIN | 09ACZPG0755H1Z6 | stated by the proprietor; structurally valid |
| Proprietor | Vikas Grover | proprietor, plus three independent directories |
| Legal structure | sole proprietorship | proprietor, plus the GSTIN's embedded PAN (`P` = Individual) |
| Phone / WhatsApp | +91 98391 00644 | proprietor, Google Business Profile, trade directory |
| City | Kanpur, Uttar Pradesh | all sources |
| Address | 8/102, Allenganj, Arya Nagar, near Khalasi Line, 208002 | Google Business Profile |
| Services | the eight listed | consistent across all sources |

**On the two numbers that matter most.** 1983 and the GSTIN are the business's
own assertions, not documents anyone has seen. Publishing them is normal and
legitimate — a business is entitled to state its own history and registration.
But they are also the two claims a competitor or an unhappy customer would
challenge first, so two small jobs are worth doing once:

1. Keep **one dated record** on file behind 1983 — the oldest invoice, a
   registration paper, anything with a year on it. The directories carry five
   different founding years for this business (1983, "17 years", 2005, 2023,
   22 years), so the question will come up eventually.
2. **Confirm the GSTIN is active**, once, at
   <https://services.gst.gov.in/services/searchtp>. It takes under a minute.
   A cancelled number printed in a footer is a misrepresentation, and it is the
   business that wears it, not the website.

### Published, but UNCONFIRMED — check these before launch

| Detail | Risk if wrong |
|---|---|
| `contact.email` — `akashmovers@rediffmail.com` | single directory listing, never confirmed. Send a test mail. If it bounces, set it to `PLACEHOLDER` and every email link disappears. |
| `contact.whatsappNumber` | assumed to be the same mobile. **Nobody has sent it a WhatsApp message.** Test it; if there is no WhatsApp account, set it to `PLACEHOLDER` and the buttons hide themselves. |
| `contact.openingHours` | these are the template's generic 9–7 hours, **not the client's**. They are published in LocalBusiness schema, so Google may show them and a customer may arrive to a closed office. |
| House number `8/102` | one directory says `8/96`. A wrong number in LocalBusiness schema hurts local ranking. |
| The service-process copy | "our own crews", "material loaded the night before", "one named coordinator", "checked at both ends". These describe how a move *ought* to be run and were written before the client was known. **Vikas ji must confirm each one is how the business actually works**, or the copy must change. This is the biggest remaining honesty risk on the site. |

### Deliberately NOT published

- **Ratings, review counts, awards, ISO/IBA certification, employee count.**
  Sources disagree (500+ vs 21–50 employees) or are unverifiable. The figure
  circulating as "326 ratings" is not ratings — that directory reports listing
  *views*.
- **Testimonials.** `testimonials.verified` is empty, so the whole section
  hides itself. There is no sample list any more: `js/config.js` is downloaded
  by every visitor, so ten invented reviews sitting in it were publicly
  readable under the real business name whether or not the page rendered them.
- **Any warehouse or facility description.** Storage is offered, but no premises
  were found in any source, so no claim is made about where goods are held.
- **Prices.** The per-ton rates on a trade directory are freight rates for goods
  transport, not household shifting.

`llms.txt` states all of this explicitly, so an AI assistant quoting the site
repeats the absence rather than filling the gap from a stale directory.

---

## Tech stack

| | |
|---|---|
| Markup | Hand-written HTML5, 18 pages |
| Styling | One CSS file with design tokens in `:root`. No framework |
| Scripting | ES modules, no framework |
| 3D | Three.js, vendored locally |
| Scroll animation | GSAP + ScrollTrigger, vendored locally |
| Fonts | Playfair Display + Inter, self-hosted, latin subset, 138 KB |
| Server | One Cloudflare Pages Function for the lead endpoint |
| Storage | Cloudflare KV and/or D1, both optional |
| Build step | **None** |
| Hosting | Cloudflare Pages |

Nothing is loaded from a third-party CDN at runtime. Every library and font
is served from this origin, which is what lets the Content-Security-Policy
stay at `script-src 'self'`.

---

## Structure

```
movers/
├── index.html                  home page
├── services.html               services hub
├── services/                   8 service detail pages
├── locations.html              service-area hub
├── locations/                  one page per city (none yet — see Config)
├── guides/moving-checklist.html
├── about.html  contact.html  faq.html
├── privacy.html  terms.html    TEMPLATES — see "Before you go live"
├── 404.html
│
├── css/style.css               all styling, numbered contents at the top
├── js/
│   ├── config.js               ← every business detail lives here
│   ├── dom.js                  element helpers (no innerHTML, ever)
│   ├── main.js                 boot: config → markup, nav, reveals
│   ├── scroll-truck.js         the side truck that follows the page scroll
│   ├── journey.js              the six-stage road animation
│   ├── truck3d.js              the WebGL hero truck
│   ├── lead-form.js            quote dialog behaviour and submission
│   ├── quote-modal.js          quote dialog markup
│   └── schema.js               JSON-LD generation
│
├── functions/api/lead.js       SERVER: validation, storage, WhatsApp
├── migrations/0001_leads.sql   D1 schema
├── vendor/                     Three.js, GSAP, GLTFLoader
├── assets/fonts, images, icons
│
├── tools/                      NOT part of the site — see "Keeping
│   ├── check.ps1               the test suite; run before every deploy
│   ├── assemble.ps1            rebuilds inner pages from fragments
│   ├── build-sitemap.ps1       regenerates sitemap.xml from disk
│   └── pages/*.part            the content of each inner page
│
├── serve.ps1                   local dev server
├── _headers  _redirects        Cloudflare config
├── robots.txt  sitemap.xml  llms.txt  site.webmanifest
├── .editorconfig               formatting, honoured by every major editor
├── .gitignore
└── .env.example                variable NAMES only, no secrets
```

Nine JavaScript modules, one stylesheet, one server function. No framework,
no bundler, no `package.json`, no `node_modules`. Every file above is either
served to visitors or explicitly excluded; there is nothing left over.

---

## Running the checks

```bash
powershell -ExecutionPolicy Bypass -File .\tools\check.ps1
```

With the dev server running, this verifies every page returns 200, every
internal link resolves, every page has exactly one `h1`, a unique title, a
unique description and a canonical URL, no page is thin, the sitemap matches
what is on disk, no file carries mis-encoded text, no `.ps1` has lost its
byte-order mark, no live-looking credential has been committed, and no page
has reintroduced one of the claims this business cannot evidence.

It exits `0` on success and with the number of problems otherwise, so it can
be wired into CI unchanged. `-SkipHttp` runs only the file-based checks when
the dev server is not up.

**There are no unit tests, and that is a deliberate consequence of the
architecture rather than an omission.** With no Node and no build step there
is no test runner to attach them to, and the failure modes of a static
marketing site are the ones listed above rather than the behaviour of
individual functions. If the project ever grows a toolchain, add unit tests
for `js/schema.js` and `functions/api/lead.js` first — those two hold all the
real logic.

---

## Formatting and linting

`.editorconfig` is the formatter. It needs nothing installed and is honoured
natively by VS Code, JetBrains, Sublime, Vim and Visual Studio.

**Prettier and ESLint are not configured**, and that is a trade-off worth
stating plainly rather than hiding: both require Node and a `package.json`,
which this project deliberately does not have. Adding them would be the
single largest change to the architecture in exchange for formatting two
thousand lines that are already consistent. If a build step ever arrives, add
them then and point Prettier at the values in `.editorconfig` so the two
cannot disagree.

---

## Keeping development files off the public site

Cloudflare Pages uploads **everything** in the root directory. That includes
`tools/`, `serve.ps1`, `.env.example` and this README — and this README is an
internal handover document that discusses which of the business's claims are
unverified and which copy still needs the owner's sign-off. That is not
something to leave on a public URL.

Three layers currently cover it, in `_redirects`, `_headers` and `robots.txt`:
a 404 rule, a `noindex` header, and a crawler disallow.

**The definitive fix is a deployment change that has not been made**, because
it needs a Cloudflare setting that cannot be tested from a local checkout:

1. Create `movers/public/` and move the site into it — every `.html`,
   `css/`, `js/`, `assets/`, `vendor/`, `functions/`, `_headers`,
   `_redirects`, `robots.txt`, `sitemap.xml`, `llms.txt`,
   `site.webmanifest`, `favicon.ico`.
2. Leave `tools/`, `serve.ps1`, `README.md`, `.env.example`, `.gitignore`
   and `.editorconfig` where they are, outside `public/`.
3. In the Cloudflare Pages project, change **Root directory** from `movers`
   to `movers/public`.
4. Update the `$root` path in `serve.ps1`, `tools/assemble.ps1`,
   `tools/build-sitemap.ps1` and `tools/check.ps1`, which all resolve the
   site folder relative to themselves.

Do this at a moment when a broken deploy is survivable, and verify the live
site before walking away — a wrong Root directory serves nothing at all.

---

## Local development

**You cannot open `index.html` by double-clicking it.** The site uses ES
modules, and browsers refuse to load those over `file://`. You would get an
unstyled page and a console full of CORS errors.

This machine has no Node and no real Python, so a dev server is included:

```powershell
cd movers
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Then open <http://localhost:8787>.

It serves correct MIME types, applies the **production CSP** so header
mistakes surface locally, and answers `POST /api/lead` with a clearly
labelled mock.

```powershell
.\serve.ps1 -MockApi stored   # pretend the lead saved but WhatsApp failed
.\serve.ps1 -MockApi fail     # pretend the server returned 502
.\serve.ps1 -NoCsp            # rule the CSP in or out as the cause of a bug
```

---

## Configuration

Almost everything you will want to change is in **`js/config.js`**.

| Field | Controls |
|---|---|
| `business.name` | Header, titles, footer, structured data |
| `business.foundingYear` | "Trading since" on About. `null` = not shown |
| `contact.phoneDial` / `phoneDisplay` | Every call link |
| `contact.whatsappNumber` | Every WhatsApp link and the fallback message |
| `contact.email` | Email links |
| `contact.address` | Footer, contact page, LocalBusiness schema |
| `contact.geo` | The contact-page map. `null` = no map |
| `contact.openingHours` | Contact page and schema |
| `services[]` | Service cards, footer list, Service schema |
| `serviceAreas[]` | Service-area pages and `areaServed` |
| `testimonials` | `verified` is real; `demo` is clearly-labelled sample copy |
| `privacy.leadRetentionDays` | Quoted in the privacy policy |

**Anything left as `PLACEHOLDER` is treated as "not configured".** The site
hides that element instead of printing a dead `tel:PLACEHOLDER` link. Nothing
is invented to fill a gap.

### Values that also live in the HTML

The domain is baked into each page's `<head>` (canonical, Open Graph) so
crawlers see it without running JavaScript. When you connect a real domain:

```powershell
$old = "movers.pages.dev"
$new = "yourdomain.com"
Get-ChildItem -Path . -Recurse -File -Include *.html,*.xml,*.txt,*.webmanifest,*.ps1 |
  ForEach-Object {
    $t = [IO.File]::ReadAllText($_.FullName)
    [IO.File]::WriteAllText($_.FullName, $t.Replace($old, $new), (New-Object Text.UTF8Encoding $false))
  }
```

Then update `web.origin` in `js/config.js`, and search the folder for the old
address to confirm nothing is left.

---

## Editing content

The inner pages are **plain static HTML — edit them directly.**

They were originally generated from fragments in `tools/pages/*.part` so that
the shared chrome (head, icon sprite, header, footer) did not have to be
hand-copied into sixteen files. That was an authoring convenience, not a
build step.

Re-run `tools/assemble.ps1` only when you change the header, footer or sprite
and want that pushed to every page — **it overwrites direct edits.** If you
intend to keep editing pages by hand, you can delete `tools/` entirely; the
site does not need it.

After adding or removing a page:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-sitemap.ps1
```

### Titles and descriptions live in two places

Each page's `<title>` and meta description are written in the `.part` file's
`TITLE:` and `DESC:` lines **and** baked into the generated `.html`. If you edit
one of the generated pages directly, put the same text back into its `.part`,
or the next `assemble.ps1` run will silently revert your SEO work.

`index.html` and `404.html` are not generated — edit those directly.

### The map

The embed on `contact.html` and `locations/kanpur.html` is built by
`renderMap()` in `js/main.js`. It needs **no API key** — it uses the keyless
`maps?q=…&output=embed` form — but it does need
`frame-src https://www.google.com` in `_headers`. Delete that directive and the
map silently fails to load.

It picks its centre in this order:

1. `contact.geo` has real coordinates → centred exactly there.
2. Otherwise → centred on **`business.name` + locality + city + state + PIN**.

The second case is name-led on purpose. Searching the written address alone put
the pin roughly three kilometres out, in Nawabganj, because geocoders treat a
house number plus a landmark ("near Khalasi Line") as noise. Leading with the
business name makes Google match its own verified Business Profile listing, so
the pin is the one the business already owns. The landmark is stripped from the
query but still printed in the written address, where it helps a human.

A short note under the map tells the visitor the written address is the one to
trust. Please keep it — the pin is Google's answer, not ours.

### "Our legacy" on the About page

There is no founding year in that section, and the one sentence that would
carry it (`[data-legacy-since]`) is hidden. Set `business.foundingYear` and
three things fill in together from that single value: the sentence, the
"Trading since" card under Company details, and `foundingDate` in the schema.

**Do not hand-write a year into the markup.** It would then disagree with the
schema, which reads from config — and a page that claims one year while its
structured data claims another is worse than one that claims neither.

### PowerShell 5.1 and the byte-order mark

Windows PowerShell 5.1 reads a `.ps1` file **without a BOM as ANSI, not UTF-8**.
Any non-ASCII character in a script's own string literals — an em dash, a curly
quote, `×` — is therefore already corrupt before the script runs, and the script
will happily write that corruption into your HTML. All three scripts in this
project are saved **with** a BOM for exactly this reason.

If you write a throwaway script that touches page text, save it with a BOM too,
or keep it to pure ASCII. The failure is silent: you only notice when `—` has
become `â€”` on a live page.

---

## Deployment (Cloudflare Pages)

This folder is a **sub-directory** of a repository whose root is a different
website. Set the root directory accordingly, or Cloudflare will deploy the
wrong site.

1. Push the repository to GitHub.
2. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Build settings:
   - Framework preset: **None**
   - Build command: **leave empty**
   - **Root directory: `movers`**
   - Build output directory: `/`
4. Deploy.

`functions/` must sit inside the root directory you set, which it does. If
the lead endpoint 404s after deploy, the root directory is wrong.

`_headers` and `_redirects` are read automatically — do not move or rename
them.

---

## WhatsApp lead notifications

Set these in **Settings → Environment variables** (Production *and* Preview):

| Variable | Notes |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | From Meta → WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Mark as **Secret**. Use a permanent System User token |
| `WHATSAPP_RECIPIENT` | Who gets the alert. Digits with country code, e.g. `919876543210` |
| `WHATSAPP_TEMPLATE_NAME` | Strongly recommended — see below |
| `WHATSAPP_TEMPLATE_LANG` | Default `en` |

### Read this before testing

WhatsApp **does not let a business send free-form text out of the blue.**
Plain text only delivers inside a 24-hour window opened by that person
messaging you first.

So a plain-text notification to your own number works right after you have
messaged the test number, then **silently stops working a day later**. This
catches people out in production constantly.

For notifications that always arrive, create an approved **Utility** template
in WhatsApp Manager with six body parameters, in this order:

1. customer name 2. phone 3. route 4. property type 5. move date 6. lead ID

Example body:

```
New moving lead: {{1}}, {{2}}. Route {{3}}. Property {{4}}. Date {{5}}. Ref {{6}}.
```

Then set `WHATSAPP_TEMPLATE_NAME`. Template parameters cannot contain
newlines, which is why the full enquiry is stored rather than crammed into
the message: the message is the alert, the record is the detail.

### Storage bindings (Settings → Functions)

| Binding | Type | Purpose |
|---|---|---|
| `LEADS` | KV namespace | Lead record, rate limiting, duplicate suppression |
| `DB` | D1 database | Queryable lead table — apply `migrations/0001_leads.sql` |

Neither is mandatory, **but bind at least one.** If nothing stores the lead
*and* WhatsApp delivery fails, `/api/lead` deliberately returns an error so
the browser shows the click-to-chat fallback, rather than telling the
customer everything is fine while the enquiry is lost.

```powershell
wrangler d1 create movers-leads
wrangler d1 execute movers-leads --remote --file=./migrations/0001_leads.sql
```

---

## Content Security Policy

The CSP in `_headers` allows exactly one inline script: the single line in
each page's `<head>` that adds the `js` class.

**If you edit that line, recompute the hash** or every page's script will be
blocked:

```powershell
$js = "document.documentElement.classList.add('js');"
$sha = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($js))
"sha256-" + [Convert]::ToBase64String($sha)
```

`style-src` is `'self'` with **no** `unsafe-inline`, which is why there is not
a single `style="..."` attribute in any HTML file. Styles set from JavaScript
(`element.style.x = ...`) are CSSOM writes and are unaffected. If you add an
inline style attribute to the markup, the browser will silently ignore it —
put it in a class instead.

---

## Two CSS rules that must not be "tidied up"

Both of these were found by testing, and both fail silently:

**1. No `overflow-x` on `body`.**
`hidden` makes body a scroll container and stops every `position: sticky`
descendant working — the journey road scrolls away instead of pinning.
`clip` fixes that but makes body a *clip* container, and ScrollTrigger then
measures element offsets without adding the scroll position, so the truck's
progress runs far ahead of the stages. Horizontal overflow is prevented at
source instead (see the narrow-phone header rules in §6 of the stylesheet).

**2. No `scroll-behavior: smooth` on `html`.**
ScrollTrigger measures a section by jumping to scroll 0, reading the
position, and restoring — synchronously. `smooth` turns that jump into an
animation, so measurements happen at the wrong position and start/end come
out wrong by however far the page was scrolled, drifting further on every
refresh. This is a documented GSAP incompatibility.

---

## Validating structured data

JSON-LD is generated from `js/config.js` by `js/schema.js`, so it can never
drift from what the pages say. **It is not emitted at all while
`business.name` is still `PLACEHOLDER`** — a nameless LocalBusiness is worse
than none.

Once configured, deploy and test the live URL with:

- Rich Results Test — <https://search.google.com/test/rich-results>
- Schema Markup Validator — <https://validator.schema.org/>

Both execute JavaScript, so they see the injected data. You can also run
`__schema()` in the browser console to print the generated JSON.

The FAQ schema is read out of the `<details>` elements already on the page,
so the markup and the visible text cannot disagree — which is what Google
requires.

---

## Security checklist

Done in this repository:

- [x] HTTPS-only (HSTS, one year, includeSubDomains)
- [x] Strict CSP, no `unsafe-inline` for scripts or styles
- [x] `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`
- [x] Server-side validation and sanitisation of every form field
- [x] Allow-list for the services field; length caps on everything
- [x] Honeypot field plus a minimum fill-time check
- [x] Per-IP rate limiting (needs the `LEADS` binding)
- [x] Duplicate-submission suppression
- [x] Same-origin check on the endpoint; no CORS headers anywhere
- [x] Secrets only in environment variables, never in client code
- [x] No `innerHTML` anywhere; all text set via `textContent`
- [x] External URLs filtered through `safeUrl()` (http/https only)
- [x] Errors never leak stack traces to the client
- [x] IP addresses never stored with a lead — only a short-lived hash
- [x] Retention period documented and enforceable (see the migration)

Still yours to do in the Cloudflare dashboard:

- [ ] Turn on WAF and bot protection — **do not block Googlebot, Bingbot or
      the AI crawlers named in `robots.txt`**, and do not filter on
      user-agent alone
- [ ] Set a rate limit rule on `/api/lead` as a second layer
- [ ] Enable access logging and decide who can read leads
- [ ] Schedule the retention deletion (see `migrations/0001_leads.sql`)

Security headers existing does not make a site secure. Re-check after any
change that adds a third-party script.

---

## Performance notes (please keep these)

- Three.js (~670 KB) is **not** loaded on page load. It is dynamically
  imported after the `load` event, during idle time, and only after a
  capability check — so a mid-range phone never downloads it.
- The hero's LCP element is the headline and the poster SVG, both plain
  HTML, so 3D cannot affect Largest Contentful Paint.
- Only `transform` and `opacity` are animated.
- The 3D scene stops rendering when it scrolls out of view and when the tab
  is hidden.
- Fonts are `font-display: swap` and the two above-the-fold faces are
  preloaded.
- Every image and the 3D stage have reserved dimensions, so nothing shifts.

**The capability gate deliberately does not block on `effectiveType: '3g'`.**
That was the first version, and measurement showed it denied 3D to a 16 GB,
8-core desktop with a discrete GPU on a working connection — `effectiveType`
describes round-trip time, not hardware. Only `2g`, `slow-2g` and Data Saver
block it now.

---

## What was actually tested

Run against the local server, in a real browser:

- [x] All 18 pages return 200
- [x] All 24 distinct internal link targets resolve
- [x] Exactly one `<h1>` per page; no skipped heading levels
- [x] Zero duplicate titles or meta descriptions
- [x] Every canonical URL correct
- [x] No page under 300 words
- [x] No horizontal overflow at 360px, 375px or desktop
- [x] Quote form: validation, five steps, review, consent, submission
- [x] Honest reporting when WhatsApp delivery fails (stored-but-not-notified)
- [x] WhatsApp fallback link carries the full enquiry, correctly encoded
- [x] Duplicate submission blocked
- [x] Scroll journey synchronised with stages on mobile and desktop
- [x] Three.js correctly **not** downloaded on mobile
- [x] Zero CSP violations with the production policy applied

**Not yet tested, because it needs credentials or a deployment:**

- [ ] Real WhatsApp Cloud API delivery (needs a token and an approved template)
- [ ] D1 and KV writes (needs the bindings)
- [ ] Lighthouse and Core Web Vitals on real hardware over a real network
- [ ] Rich Results Test (needs a public URL and a configured business name)
- [ ] Cross-browser checks on Safari and on a physical Android device

No Lighthouse score is quoted here because none has been run. Run it against
the deployed URL and record the real numbers.

---

## Before you go live

Blocking — and most of these need **Vikas ji**, not a developer:

1. **PUBLISH THE SITE.** Nothing below matters until this is done. There is no
   domain, no deployment and no Search Console property, which is the entire
   reason the business does not appear in Google. See § Deployment.
2. **Confirm the unconfirmed values.** See the table at the top of this file:
   the email, the WhatsApp number, the opening hours and the house number
   (8/102 vs 8/96). Each is published right now on an assumption.
3. **Sign off the service-process copy.** "Our own crews, not day labour",
   "material loaded the night before", "one coordinator, start to finish",
   "the same inventory list signed at pickup and delivery". These were written
   as good practice before the client was known. Either confirm each is true
   of this business, or change the copy. Nothing else on the site is as likely
   to cause a dispute.
4. **Rename the Google Business Profile**, or decide not to. The listing is
   still "Akash Packers & Movers" while the site now trades as "Akash Movers".
   The map embed deliberately searches the OLD name
   (`contact.googleMapsQuery`) so the pin still resolves. Renaming the profile
   is the better fix — a Business Profile that matches the website is a direct
   local-ranking signal — and when it is done, set `googleMapsQuery` back to
   `PLACEHOLDER`.
5. **Supply real reviews.** `testimonials.verified` is empty, so the section
   is hidden. Ask for the text of the best Google reviews plus permission to
   republish, and put them in `testimonials.verified` — the section and its
   `Review` structured data come back by themselves. Do not add an aggregate
   rating.
6. **Complete `terms.html`.** Every `[TO BE SUPPLIED]` needs the business's
   own policy — cancellation terms, liability limits, claims window, payment
   terms. Figures were left blank on purpose rather than invented.
7. **Have `privacy.html` and `terms.html` reviewed.** The technical
   description in the privacy policy is accurate; the legal framing is not
   advice, and India's data protection rules require a named grievance
   officer.
8. **Add the office coordinates.** `contact.geo` is null, so the
   LocalBusiness *schema* carries no pin. The visible map works without them
   (see below). Right-click the business marker in Google Maps, copy the two
   numbers, paste them in. Also paste the Business Profile URL into
   `contact.googleBusinessProfile`.

Adding more cities: only ones genuinely served. Copy
`tools/pages/location-kanpur.part`, write the intro and localities for that
city specifically, add the entry to `serviceAreas`, then re-run
`assemble.ps1` and `build-sitemap.ps1`. A network of near-identical city pages
for places the business does not cover is the doorway-page pattern Google acts
against.

Assets still required:

- `assets/images/og-image.png` (1200×630) — the link-preview image. The meta
  tags already point at it.
- `assets/icons/apple-touch-icon.png` (180×180)
- A real logo, to replace the generated mark in the header and `favicon.ico`
- Photography of actual crews, vehicles and completed moves. **There is no
  stock photography in this build and none was invented.** The design works
  without photos; it will work better with real ones.

Optional:

- A licensed `.glb` truck model. Drop it at `assets/3d/truck.glb` and set
  `MODEL_URL` in `js/truck3d.js` — the loader, lighting, shadows and every
  fallback already handle it. The current truck is built procedurally
  because no licensed model was supplied.

---

## Things this site deliberately does not do

No invented ratings, review counts, awards, years in business, prices,
registration numbers or insurance guarantees — **including for this client,
where directories supply all of those and contradict each other.** The
site publishes no prices at all. A quote nobody can be held to is worse than
no quote, so the only route to a figure is the enquiry form, which collects
the move details and produces a written, itemised quote after a survey.

Where a fact could not be confirmed, the site says nothing rather than
repeating a directory. That is a deliberate trade: a page that omits "since
1983" ranks slightly worse than one that claims it, and is worth far more the
first time a customer or a competitor asks for proof.

The copy never promises guaranteed delivery hours on long routes, and never
implies goods are automatically insured. Please keep it that way — in
structured data these are against Google's guidelines, and with customers
they are the things that turn into disputes.
