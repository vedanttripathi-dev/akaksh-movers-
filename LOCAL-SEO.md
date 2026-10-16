# Why akashmovers.com does not appear for "packers and movers in Kanpur"

**Checked 17 October 2026.**

---

## The finding, before anything else

I searched `site:akashmovers.com`, which asks Google to list every page it
holds for this domain.

**It returned nothing. Not one page of this website is in Google's index.**

That changes what the problem is. A site that is not indexed cannot rank
anywhere, for anything, no matter how good it is or how many links point at
it. Backlinks are a ranking factor; they are not an indexing mechanism. Buying
or building links while the index is empty would be money spent on a lever
that is not connected to anything yet.

So this document is in the order the work actually has to happen:

1. Get the pages indexed.
2. Get the Business Profile right, because the top of that search result is
   not web results at all.
3. Then, and only then, citations — the legitimate version of "backlinks".

---

## 1. First: get it indexed

### 1.1 Google Search Console — the direct route

This is the sanctioned way to tell Google a site exists, and it needs no
links at all. **It needs you, because it needs a Google login, and I cannot
enter a password.**

1. Go to <https://search.google.com/search-console>, sign in with the Google
   account that owns the Business Profile.
2. Add a property → **Domain** → `akashmovers.com`.
3. It will give you a TXT record to add at GoDaddy → DNS. Add it, then click
   Verify.
4. Open **URL Inspection**, paste `https://akashmovers.com/`, press
   **Request Indexing**.
5. Repeat step 4 for these, which are the pages worth ranking:
   - `https://akashmovers.com/services.html`
   - `https://akashmovers.com/locations/kanpur.html`
   - `https://akashmovers.com/contact.html`
   - `https://akashmovers.com/services/home-shifting.html`
   - `https://akashmovers.com/services/local-shifting.html`
6. **Sitemaps** → submit `sitemap.xml`.

**What this does and does not do.** Requesting indexing puts a URL in a
crawl queue. It is a request, not an instruction, and Google is explicit that
it guarantees nothing and gives no timeline — days to a few weeks is normal
for a new domain. Submitting a sitemap is a discovery signal; it is not
indexing either. Nobody, including any agency that tells you otherwise, can
make Google index a page on demand.

### 1.2 Bing Webmaster Tools

Worth ten minutes: it imports straight from Search Console, Bing indexes new
sites faster than Google, and it feeds Copilot and DuckDuckGo. Same process at
<https://www.bing.com/webmasters>.

### 1.3 What was blocking it, and what was not

I checked the usual causes before writing any of this, because a reported
problem is worth verifying before it is treated as true:

| Possible cause | Checked | Result |
|---|---|---|
| `robots.txt` blocking crawlers | Fetched live | **Not blocking.** Allows everything public, names the sitemap correctly. |
| `noindex` on real pages | All 20 pages | **Only on `404.html`**, which is correct. |
| Broken or missing sitemap | Live | **19 URLs, all matching their canonicals.** |
| Redirect loops | Live | **None.** `http:` → `https:` is a single 301. |
| Canonical tags pointing elsewhere | All 20 pages | **All correct and absolute.** |
| Any inbound link anywhere | Searched | **None found. This is the real reason.** |

Nothing is broken. The domain is simply days old with **no link into it from
anywhere on the web**, so Google has had no path to discover it and no reason
to prioritise it. That is a normal starting position, not a fault.

---

## 2. Second: the Business Profile, which matters more than the website here

Search "packers and movers in Kanpur" and look at what actually fills the
screen. The top is a **map with three businesses in it**. That block is not
web search results, and your website's content and links have very little to
do with which three appear. It is driven by the **Google Business Profile**:
proximity, categories, and name/address/phone consistency.

For a local mover, the Business Profile is the larger half of this problem,
and the website's job is partly to corroborate it.

**Two things to fix there, in this order:**

1. **The address.** The Profile says Arya Nagar. The shopfront photograph and
   the IndiaMART listing both say Swaroop Nagar, and the website now says
   `113/186, Swaroop Nagar`. Google weighs this agreement heavily and right
   now the two most important sources about this business contradict each
   other. **This is the single highest-value action on the whole list.**
2. **Add the website URL to the Profile.** It is a field on the Profile and
   it is the most trusted single link this domain can get.

Then: confirm the categories (primary "Mover", plus the relevant secondary
ones), confirm the opening hours, and add photographs — you have 44 already
prepared in the image pack.

---

## 3. Third: citations — what "backlinks" should mean here

### What I will not do, and why

You asked me to make backlinks. I want to be straight about the part of that
I am not going to do: I am not going to build links by posting this domain
into blog comments, forum signatures, directory-spam networks, paid link
placements or private blog networks. Those are what Google's spam policies
call link schemes. The best case is that they are ignored. The realistic bad
case for a business with one domain and one location is a manual action, and
recovering from one takes longer than earning the links honestly would have.

There is no version of this where it is worth the risk to a real business
with a forty-year name on the door.

### What actually works for a local mover

**Citations.** A citation is a listing of the business's name, address and
phone number on a directory or map service. Most also carry a link. They do
three things at once: they give Google crawl paths into the domain, they
corroborate the address, and several of them are themselves search results
that customers use.

**Every one of these needs a phone OTP or an email you control, so they are
yours to create, not mine.** None of them cost anything.

#### Already exists — just needs the website field filled in

| Listing | State | Action |
|---|---|---|
| [IndiaMART](https://www.indiamart.com/akash-packersmovers/) | Live. Trading name, owner `Vikas Grover`, established 1983, Swaroop Nagar, GSTIN shown. **Website field is empty.** | Log in, paste `https://akashmovers.com`. **Do this first — it is the one real inbound link available today.** |
| Sulekha | Referenced as the source of ten genuine reviews, URL not confirmed | Find it, check the phone number matches, add the website |
| Justdial | Not confirmed | Check whether a listing exists under the old name before creating a second one |

> **Do not create a second listing where one already exists.** Two listings
> for one business split the reviews and contradict each other on address,
> which is the opposite of what this exercise is for. Claim, don't duplicate.

#### Worth creating, in value order

1. **Bing Places** — free, imports from the Google Profile, feeds Copilot
2. **Apple Business Connect** — free; this is what Apple Maps and Siri use,
   and nobody in this trade bothers with it
3. **Justdial** — in India this is a destination customers search *in*, not
   just a link
4. **Sulekha** — same, and reviews already exist there
5. **TradeIndia**, **IndiaMART** (done), **Yellow Pages India**
6. The **Kanpur Chamber of Commerce** or a local trade association, if the
   business is or can be a member — a genuine membership page is worth more
   than ten directories

#### Links worth having that are not directories

These are slower and need something real behind them, which is why they are
worth more:

- **Suppliers and partners.** Whoever supplies the packing materials, or the
  transporters used on long routes, may have a dealers or partners page.
- **Corporate clients.** Forty years of office relocations in Kanpur means
  companies that may list vendors or write a case study — with permission.
- **Local press.** A genuinely useful piece ("what a Kanpur society's lift
  rules mean for your moving day") offered to a local outlet.

Do not ask for a link in exchange for anything. That is also a link scheme.

---

## 4. What was changed on the website for this

These are done, committed and live. They are the parts of this that are
actually code, and they are honestly a smaller share of the problem than
items 1 and 2 above.

### 4.1 Name, address and phone are now in the HTML

**The problem, measured:** the footer's phone, WhatsApp, email and postal
address were empty elements marked `hidden`, filled by JavaScript at runtime.
Probing the static `index.html` found no phone number, no email and no postal
code anywhere in it. Only `contact.html` carried the address in its own
markup.

Googlebot does render JavaScript, so it would have got there eventually. But
Bing's renderer is much weaker, and most of the fourteen AI crawlers this
site's `robots.txt` deliberately welcomes do not execute JavaScript at all —
so to all of them, 19 of the 20 pages gave no way to contact the business.
For a local business, name/address/phone repeated identically on every page is
the signal local search leans on hardest, and it was invisible.

**Now:** written into the markup on all 19 indexable pages, with JavaScript
writing the same strings over the top so `js/config.js` is still the one place
to edit. `tools/check.ps1` re-reads the config and **fails** if the two
disagree — tested by injecting a wrong address and a re-hidden phone number,
both of which it caught.

### 4.2 The service pages were dead ends

**Measured before:** each of the seven deeper service pages had exactly
**one** inbound internal link, from the services hub, and linked to no other
service page. The Kanpur page had one inbound link and linked to one service
page, and only because its body copy happened to mention car transport.

**Now:** each service page carries three hand-picked related services with a
line written for that specific pairing, plus a route to the Kanpur page; the
Kanpur page lists all eight services.

| | before | after |
|---|---|---|
| `/locations/kanpur.html` | 1 | **9** |
| the seven service pages | 1 each | **4 to 8 each** |

The pairings are hand-written in `tools/seo/add-related-services.ps1`, not
generated. A block listing all eight services on all eight pages would be the
same boilerplate eight times, which helps no reader.

### 4.3 The site now says it is the same business as the IndiaMART listing

`sameAs` in the structured data is an identity claim: it tells a search engine
that the thing at this URL and the thing at that URL are one business. The
domain is new and every existing listing is under the former trading name, so
without this the site reads as a different company that happens to share a
phone number.

The IndiaMART profile is published there, having been **opened and checked**
against four independent fields (trading name, owner, founding year,
locality). The others in `js/config.js` → `directories` are left as
`PLACEHOLDER` and omitted, including Sulekha, because a `sameAs` pointing at
the wrong business is a false statement about this one in machine-readable
form.

---

## 5. Honest expectations

- **Nobody can guarantee a ranking**, and anyone who offers to is either
  describing an ad or selling something that will cost you more than it
  returns. "Packers and movers in Kanpur" has established competitors with
  years of accumulated signal.
- **Indexing is days to weeks** for a new domain, after Search Console
  verification. Ranking movement, if it comes, is months.
- **The Business Profile will move before the website does**, which is why
  the address fix is first on this list.
- **One thing is genuinely in your favour:** this is a real business, at a
  real address, with four decades of trading and roughly sixty genuine
  reviews already sitting on Google, Sulekha and IndiaMART. That is the asset
  most competitors are faking. The job is to connect it to this domain, not
  to manufacture anything.

---

## 6. The exact details to paste, byte for byte

Consistency is the whole point of a citation, so use this text everywhere
without re-typing or re-wording it. A different abbreviation of the same
street is a different address to a machine.

```
Business name:  Akash Movers
Also known as:  Akash Packers & Movers
Address:        113/186, Swaroop Nagar, Kanpur, Uttar Pradesh 208002, India
Phone:          +91 98391 00644
WhatsApp:       +91 98391 00644
Email:          akashmovers@rediffmail.com
Website:        https://akashmovers.com
Established:    1983
Proprietor:     Vikas Grover
GSTIN:          09ACZPG0755H1Z6
Category:       Mover / Packers and Movers
```

Short description, for the fields that ask for one:

```
Akash Movers (formerly Akash Packers & Movers) has been relocating homes and
offices from Kanpur since 1983. Packing, loading, transport, unloading and
unpacking, handled by our own crews, with every job surveyed before it is
quoted in writing.
```

### Two details to confirm before you paste them anywhere

- **Opening hours.** `js/config.js` carries Mon–Sat 09:00–19:00 and Sunday
  10:00–16:00, and the Mon–Sat part is flagged in that file as the template's
  generic hours rather than yours. The IndiaMART listing appears to show
  Mon–Sat 9–7, which agrees — but that listing is also self-published, so it
  is the business's own claim and not independent confirmation. **Sunday is
  not corroborated anywhere.** Confirm both before they go onto a Profile that
  customers will turn up against.
- **GSTIN status.** The number is structurally valid, but whether the
  registration is currently *active* has not been confirmed. Check once at
  <https://services.gst.gov.in/services/searchtp>. A cancelled GSTIN printed
  in a footer is a misrepresentation, and it is the business that wears it,
  not the website.

---

## 7. In order, then

1. Search Console: verify the property, request indexing, submit the sitemap
2. Business Profile: change the address to Swaroop Nagar, add the website URL
3. IndiaMART: paste the website URL into the empty website field
4. GoDaddy: the `www` CNAME → `vedanttripathi-dev.github.io` (still
   outstanding; `www.akashmovers.com` shows a certificate warning today)
5. Bing Webmaster Tools and Bing Places
6. Apple Business Connect
7. Justdial and Sulekha: claim what exists, do not duplicate it
8. Confirm the opening hours and the GSTIN status

Steps 1, 2, 3 and 5 through 8 all need a login or an OTP on the business's
phone, so they are yours. Tell me what you have done and I will verify each
one from the outside and tell you what it looks like to a crawler.
