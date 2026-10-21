# The three things only you can do

Each one needs a login I am not permitted to use. Everything else is done,
pushed and verified live.

Do them in this order. Total time: about 20 minutes.

---

## 1. Chrome — stop the "Not secure" warning on your own machine (2 min)

**The site is fine.** Verified from your PC: `http://akashmovers.com` returns
`301` to `https://`, the certificate is a valid Let's Encrypt one for
`akashmovers.com`, all four server IPs answer `200`, and a real Chromium
browser loaded it over HTTPS with `isSecureContext: true`.

Your Chrome cached a failure from **before 15 October 21:18 GMT**, which is
when the certificate was issued. Until then HTTPS genuinely did not work.
Chrome has not retried since, because GitHub Pages sends no HSTS header to
tell it to.

**Check first (5 seconds).** Open an Incognito window — `Ctrl+Shift+N` — and
go to `akashmovers.com`. It will load with the padlock and the truck icon.
That confirms it is your browser's cache and nothing else.

**Then clear it:**

1. Address bar: `chrome://net-internals/#hsts`
2. Scroll to **Delete domain security policies**
3. Type `akashmovers.com`, press **Delete**
4. Quit Chrome completely, reopen
5. Go to `https://akashmovers.com`
6. If the tab icon is still a globe, press `Ctrl+Shift+R` once — Chrome
   caches favicons separately and very aggressively

> Anyone who opened the site before 15 October has the same cached state, and
> I cannot clear it for them. Step 3 below is what makes it impossible to
> happen again, to anyone.

---

## 2. GoDaddy — fix `www` (3 min)

Right now `https://www.akashmovers.com` shows a certificate error, because
`www` is a CNAME pointing at `akashmovers.com`. GitHub Pages only holds a
certificate for the apex, so it answers a `www` request with the wrong one.

1. GoDaddy → **My Products** → your domain → **DNS**
2. Find the row with **Type `CNAME`**, **Name `www`**
3. Click the pencil
4. Change **Data** to exactly:

```
vedanttripathi-dev.github.io
```

5. Save

**Do not touch the four `A` records on `@`.** They are correct
(`185.199.108.153` and the three that follow) and they are what serves the
site today.

Takes a few minutes to an hour to propagate. Tell me when it is done and I
will verify the certificate from outside.

---

## 3. Cloudflare Pages — the permanent fix (15 min)

This is what stops the warning recurring for real customers, and it fixes
three other things that GitHub Pages cannot do at all:

| Problem today | Why | Fixed by Cloudflare |
|---|---|---|
| No HSTS, so Chrome keeps retrying HTTP | GitHub Pages sends no headers | yes |
| No CSP, HSTS, X-Frame-Options, Referrer-Policy | `_headers` is ignored | yes |
| The callback form cannot deliver a lead | `/api/lead` needs server code | yes |
| `_redirects` does nothing | not supported | yes |

Everything needed is already written and pushed: `_headers` with a full
policy, `_redirects`, `functions/api/lead.js`, `functions/api/reviews.js`,
`migrations/0001_leads.sql` and `.env.example` documenting every variable.

### Steps

1. Sign in at **dash.cloudflare.com** (free plan is enough)
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Authorise GitHub, pick **`vedanttripathi-dev/akaksh-movers-`**
4. Build settings — type these exactly:

   | Field | Value |
   |---|---|
   | Framework preset | **None** |
   | Build command | `bash tools/build-dist.sh` |
   | Build output directory | `dist` |
   | Root directory | *(leave blank)* |

5. **Save and Deploy**, wait for the first build
6. **Custom domains** → **Set up a custom domain** → `akashmovers.com`
7. Add `www.akashmovers.com` as a second custom domain
8. Cloudflare will tell you to change the nameservers at GoDaddy, or to add
   a CNAME. Follow what it shows you — it is specific to your account.

### Why the build command matters

**Do not skip it and deploy the repository root.** GitHub Pages runs Jekyll,
and `_config.yml` is what keeps `README.md`, `AUDIT.md`, `LOCAL-SEO.md`, the
authoring tools and the master logo artwork off the public site. **Cloudflare
does not run Jekyll**, so all of that would be uploaded and reachable.
`AUDIT.md` and `LOCAL-SEO.md` between them list which business claims are
unverified, which listings are unclaimed and which policies still need a
lawyer — a briefing document for a competitor, at a guessable URL.

`tools/build-dist.sh` copies only the files that may be published — an
allowlist, so a file added later is private by default rather than public by
accident — and then **fails the build** if anything internal is found in the
output. Verified locally: 152 files, 20 HTML pages, 6.9 MB, with `README.md`,
`AUDIT.md`, `LOCAL-SEO.md`, `tools/`, `migrations/`, `functions/`,
`assets/brand/`, every script and every `.env` absent.

### After it is live

- Lead delivery stays off until the WhatsApp variables in `.env.example` are
  set under **Settings → Environment variables**. Until then the form fails
  honestly and hands the visitor a WhatsApp link — it never claims to have
  sent something it did not.
- Create a **KV namespace** bound as `LEADS` for rate limiting and duplicate
  suppression. Free, one minute.
- Keep GitHub Pages switched on until Cloudflare serves correctly, then turn
  it off. Nothing is deleted either way, and `git revert` plus re-enabling
  Pages puts everything back.

---

## What I already did

Pushed and verified on the live site:

- Business email changed to `akashmovers@gmail.com` — 38 references, 19
  pages, zero stale left anywhere
- Both owner portraits published on the About page, correctly matched, equal
  size, contrast measured with 0 failures
- Favicon complete: `.ico`, 32px and 16px PNGs, Apple touch icon, both
  manifest icons — all returning 200
- Structured data served in the HTML on all 19 pages
- Review QR generator built; it refuses to run until you supply the real
  Google review link, rather than encoding a guess
- Full check suite passes against `https://akashmovers.com`

## What is still blocked on you

- The Google review link and Business Profile URL — the QR and the review
  button stay hidden until these exist
- Send one test email to `akashmovers@gmail.com` and confirm it arrives
- Update the old `rediffmail` address on IndiaMART and the other listings
- Confirm the trading name, the 3D truck question, and the ownership wording
  (`AUDIT.md`, items 1c, 1d, 1e)
