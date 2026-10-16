/* ============================================================================
   SITE CONFIGURATION  —  the one file you edit to make this site yours.
   ============================================================================

   Everything the website says about the business comes from here: the name in
   the header, every phone and WhatsApp link, the address in the footer, the
   JSON-LD structured data search engines read, the cities that get their own
   landing page, and the message format sent to WhatsApp when a lead arrives.

   HOW TO USE THIS FILE
   --------------------
   1. Replace every value that still says PLACEHOLDER.
   2. Anything you leave as PLACEHOLDER is treated as "not configured yet":
      the site hides that element rather than printing a broken link or an
      empty bracket to a customer. Nothing is invented to fill the gap.
   3. After editing, also run the domain find-and-replace documented in
      README.md, because the domain is additionally baked into the HTML
      <head> of each page so that crawlers see it without running JavaScript.

   WHAT THIS FILE DELIBERATELY DOES NOT CONTAIN
   --------------------------------------------
   No API keys, tokens or passwords. This file is downloaded by every visitor
   and is fully public the moment it deploys. Server-side secrets (the
   WhatsApp access token, the database URL) live in Cloudflare environment
   variables and are read only by functions/api/lead.js on the server.
   See .env.example.
   ========================================================================== */

export const PLACEHOLDER = 'PLACEHOLDER';

/** True when a config value has not been filled in yet. */
export function isSet(value) {
  return typeof value === 'string' && value.trim() !== '' && value !== PLACEHOLDER;
}

export const SITE_CONFIG = {

  /* ------------------------------------------------------------------
     1. IDENTITY
     ------------------------------------------------------------------ */
  business: {
    /* Trading name. Appears in the header, titles, schema and WhatsApp text.
       Supplied in writing by the proprietor. */
    name: 'Akash Movers',

    /* The former trading name, supplied by the proprietor as "formerly known
       as". Published as `alternateName` in the Organization schema and named
       once on the About page.

       This is not sentimentality. Forty years of word of mouth, every
       existing directory listing and the Google Business Profile are all
       under the old name, and so is anything a past customer would type into
       a search box. Dropping it silently throws that away; declaring it tells
       both Google and an AI assistant that the two names are one business. */
    alternateName: 'Akash Packers & Movers',
    /* Registered legal name, if different. Used in Organization schema only.
       This is a sole proprietorship — confirmed structurally from the GSTIN
       below, whose PAN `ACZPG0755H` has `P` (Individual) as its 4th character
       and `G` as its 5th, matching the proprietor's surname. The registered
       name is therefore likely "Vikas Grover" trading as Akash Packers &
       Movers, but that exact wording has not been seen on a document, so it
       is left unset rather than guessed. */
    legalName: PLACEHOLDER,

    /* The person who owns and runs the business. Named on the About page and
       published in the Organization schema as `founder`.
       Verified: this name appears on three independent trade directories and
       is consistent with the `G` in the GSTIN's embedded PAN. */
    proprietor: 'Vikas Grover',
    /** How to refer to them — 'Proprietor', 'Founder', 'Managing Partner'. */
    proprietorRole: 'Proprietor',

    /** Short positioning line. Keep under ~60 characters.
        The business's own tagline, supplied by the proprietor. */
    tagline: 'Excellence through service.',
    /** The single city this business is primarily based in. */
    primaryCity: 'Kanpur',
    primaryState: 'Uttar Pradesh',

    /* The year the business started trading.

       1983, stated in writing by the proprietor. That is the source this
       value rests on, and it is a far better one than what it replaces:
       the directories carry five contradictory figures between them (1983,
       "17 years", 2005, 2023, and 22 years — two of those on a single page),
       which is why this was left empty until the owner was asked directly.

       Worth knowing: this is the business's own assertion, not a document.
       It is entirely normal and legitimate to publish it, but a claim of
       forty-plus years is also the one a competitor is most likely to
       challenge, so keep ONE dated record on file against it — the oldest
       invoice, a partnership or registration paper, anything with a year on
       it. Nobody will ask for it until the day somebody does.

       (A GST registration date of 2017 is not that record. GST launched
       across India on 1 July 2017, so every pre-existing business shows
       2017.) */
    foundingYear: 1983,

    /* Government registrations. Leave null unless you hold the document.
       These are printed in the footer only when present.

       GSTIN: supplied in writing by the proprietor, and structurally valid —
       `09` is the Uttar Pradesh state code, the embedded PAN `ACZPG0755H` is
       well formed, its 4th character `P` marks an Individual (consistent with
       a proprietorship) and its 5th character `G` matches the surname Grover,
       and the 14th character `Z` marks a regular taxpayer.

       One loose end, and it takes thirty seconds to close: whether that
       registration is currently ACTIVE has still not been confirmed, because
       the official portal needs a captcha and every third-party mirror
       failed. Check it once at
       https://services.gst.gov.in/services/searchtp — a cancelled GSTIN
       printed in a footer is a misrepresentation, and it is the business,
       not the website, that wears that. */
    gstin: '09ACZPG0755H1Z6',
    /* No CIN exists — correct for a proprietorship, which is not registered
       with the MCA. Leave null; it is not a gap. */
    cin: null,
    /* No Udyam/MSME registration was found in any public source. If one is
       held, add it — it is a genuinely useful trust signal. */
    udyamNumber: null,
  },

  /* ------------------------------------------------------------------
     2. CONTACT
     ------------------------------------------------------------------ */
  contact: {
    /* Verified: this number appears on the client's Google Business Profile
       and independently on a trade directory listing. */
    /** Display form, shown as text. */
    phoneDisplay: '+91 98391 00644',
    /** Dial form for tel: links. Digits and a leading + only. */
    phoneDial: '+919839100644',

    /* The second number on the signboard. Printed on the contact page beside
       the first; NOT used for WhatsApp or as the primary tel: link, so a
       visitor always gets the proprietor first.

       Both names and numbers are lettered on the shopfront in the client's
       own photograph: "Vikas Grover - 9839100644 | Akash Grover -
       9839158558". Leave `name` as supplied; nothing here was inferred. */
    secondaryContacts: [
      { name: 'Akash Grover', phoneDisplay: '+91 98391 58558', phoneDial: '+919839158558' },
    ],

    /* Same mobile number, assumed to be on WhatsApp because every button on
       this site opens a chat to it. That assumption has NOT been tested.
       Send one message to it before launch; if the number has no WhatsApp
       account, set this to PLACEHOLDER and every WhatsApp button on the site
       hides itself automatically rather than opening a dead chat. */
    /** WhatsApp number, digits only, country code first, no + and no spaces. */
    whatsappNumber: '919839100644',
    whatsappDisplay: '+91 98391 00644',
    /** Pre-filled text when a visitor taps a WhatsApp button. */
    whatsappMessage: 'Hi Akash Movers, I would like a quote for shifting my home.',

    /* Found on a single directory listing only, never confirmed by the
       business. If a reply never arrives at this inbox, enquiries sent by
       email are being lost silently — so send a test mail before launch.
       Setting this to PLACEHOLDER removes every email link site-wide. */
    email: 'akashmovers@rediffmail.com',

    /* Office address. Printed in the footer and used in LocalBusiness schema.
       CHANGED on 16 Oct 2026, and the reason matters.

       Four addresses have been in circulation for this business:
         113/186, Swaroop Nagar                          — the shopfront sign
         Flat 16, Classic Apartment Phase-1, 113/4,
           Swaroop Nagar                                 — Sulekha
         8/102, Allenganj, Arya Nagar, near Khalasi Line — Google Business Profile
         8/96, Arya Nagar                                — ExportersIndia

       This now carries the first, because the client sent a photograph of
       the office frontage with "113/186, Swaroop Nagar" lettered across the
       fascia and repeated on the projecting side board. That is the premises
       itself, which beats any directory entry, and the "113/..." numbering
       independently matches the Swaroop Nagar entry on Sulekha. Two sources
       agree; the Arya Nagar pair look like an older address.

       >>> THE GOOGLE BUSINESS PROFILE STILL SAYS ARYA NAGAR. <<<
       Until the owner changes it there, the site and the Profile disagree
       about where the company is. Google matches a local business on name,
       address and phone being consistent across the web, so a mismatch is
       not cosmetic — it actively suppresses local ranking, and it is the
       single highest-value thing left on the list. Fix it at
       business.google.com, then re-check `googleMapsQuery` below. */
    address: {
      street: '113/186',
      locality: 'Swaroop Nagar',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      /* 208002 covers Swaroop Nagar as well as Arya Nagar, so this stays
         correct across the change. Still worth confirming with the owner. */
      postalCode: '208002',
      country: 'IN',
    },

    /* Exact coordinates of the office, used by LocalBusiness schema and the
       map embed. Leave null until taken from the Google Business Profile —
       an approximate pin is worse than no pin. Take them by right-clicking
       the business pin in Google Maps and copying the two numbers. */
    geo: { latitude: null, longitude: null },

    /** Public Google Business Profile / Maps link. */
    googleBusinessProfile: PLACEHOLDER,

    /* The "write a review" link for THIS profile, used by the
       "Share your experience on Google" button. Until it is set, that
       button does not render at all — sending a happy customer to the wrong
       company's review form is worse than not asking.

       To get it: Google Business Profile dashboard -> Ask for reviews, and
       copy the short g.page/r/... link it gives you. Do not hand-build one
       from a Place ID; the short link is the supported form.

       A reminder that belongs next to this field rather than in a document
       nobody opens: it is against Google's policies to offer a discount or
       any other incentive for a review, to ask only the customers you
       expect to be happy, or to put up a form that filters the unhappy ones
       out before they reach Google. Ask everyone, or do not ask. */
    googleWriteReviewUrl: PLACEHOLDER,

    /* The name the map embed searches for, when it is NOT the trading name.
       The Google Business Profile is still listed as "Akash Packers & Movers"
       — that is the pin the embed lands on, verified by eye. Searching the
       new trading name instead would either find nothing or find a different
       company, so the map deliberately keeps asking for the old one.

       Once the Business Profile is renamed in Google, set this to
       PLACEHOLDER and the map falls back to `business.name` automatically. */
    googleMapsQuery: 'Akash Packers & Movers',

    /* Opening hours. 24-hour clock. Use [] for a day the business is closed.
       UNCONFIRMED — these are the template's generic hours, not the client's
       actual ones. They are published in LocalBusiness schema, which means
       Google may show them in search results and a customer may arrive to a
       closed office. Confirm them with the owner before launch, including
       whether Sunday working is real. */
    openingHours: {
      monday: ['09:00', '19:00'],
      tuesday: ['09:00', '19:00'],
      wednesday: ['09:00', '19:00'],
      thursday: ['09:00', '19:00'],
      friday: ['09:00', '19:00'],
      saturday: ['09:00', '19:00'],
      sunday: ['10:00', '16:00'],
    },
  },

  /* ------------------------------------------------------------------
     3. WEB
     ------------------------------------------------------------------ */
  web: {
    /** Canonical origin, no trailing slash. */
    origin: 'https://akashmovers.com',
    /** Where the browser sends the lead form. Served by functions/api/lead.js. */
    leadEndpoint: '/api/lead',
    /** Search Console / Bing verification tokens. Printed only when set. */
    googleSiteVerification: PLACEHOLDER,
    bingSiteVerification: PLACEHOLDER,
  },

  /* ------------------------------------------------------------------
     4. SERVICES
     ------------------------------------------------------------------
     `slug` must match the filename under services/.
     Remove any service the business does not actually offer — an unsupported
     service in the schema is a misrepresentation, and a page with nothing
     real to say on it is exactly the thin content Google penalises.
     ------------------------------------------------------------------ */
  services: [
    {
      slug: 'home-shifting',
      name: 'Home shifting',
      summary: 'Full household moves, packed and reassembled room by room.',
      icon: 'home',
      offered: true,
    },
    {
      slug: 'office-relocation',
      name: 'Office & commercial relocation',
      summary: 'Workstations, servers and records moved over a weekend.',
      icon: 'building',
      offered: true,
    },
    {
      slug: 'local-shifting',
      name: 'Local shifting',
      summary: 'Same-city moves, usually finished within a single day.',
      icon: 'pin',
      offered: true,
    },
    {
      slug: 'intercity-relocation',
      name: 'Intercity & long-distance moving',
      summary: 'City-to-city relocation with a tracked, dedicated vehicle.',
      icon: 'route',
      offered: true,
    },
    {
      slug: 'vehicle-transport',
      name: 'Car & bike transportation',
      summary: 'Vehicles moved in covered carriers, never driven across.',
      icon: 'car',
      offered: true,
    },
    {
      slug: 'packing-unpacking',
      name: 'Packing & unpacking',
      summary: 'Multi-layer packing, labelled cartons, unpacked on arrival.',
      icon: 'box',
      offered: true,
    },
    {
      slug: 'loading-unloading',
      name: 'Loading & unloading',
      summary: 'Trained crews, lifting equipment, stairs and no-lift buildings.',
      icon: 'lift',
      offered: true,
    },
    {
      slug: 'storage-warehousing',
      name: 'Storage & warehousing',
      /* Reworded to drop "in a dry, monitored facility". The business lists
         storage among its services, but no warehouse address was found in
         any public source and both known addresses are a shop/house number
         and a residential flat. Describing a facility nobody has confirmed
         exists is the kind of claim that becomes a dispute. Once the owner
         confirms the premises, put the real description back. */
      summary: 'Short and long-term storage, inventoried in and out, charged by duration.',
      icon: 'warehouse',
      offered: true,
    },
  ],

  /* ------------------------------------------------------------------
     5. SERVICE AREAS
     ------------------------------------------------------------------
     Only list cities the business genuinely serves with its own crew or a
     named partner. Each entry gets one landing page under locations/.

     Do NOT bulk-add cities to chase search traffic. A hundred near-identical
     city pages is the "doorway page" pattern Google acts against, and it
     will cost you the rankings you were trying to win.

     Only ONE city is listed below: Kanpur, because that is where the business
     is actually based and the only coverage that is independently verified.
     Intercity work is described on the intercity service page instead, which
     is the honest place for it — a route is not a service area.

     To add a second city, you need three things first: that the business
     genuinely works there, the localities it covers, and a paragraph written
     about that city specifically. Then create locations/<slug>.html from
     locations/kanpur.html and run tools/build-sitemap.ps1.
     ------------------------------------------------------------------ */
  serviceAreas: [
    {
      slug: 'kanpur',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      /* Localities actually covered — used in the page copy.
         These are the main residential areas of Kanpur city, listed on the
         basis that a Kanpur-based firm covers its own city. Ask the owner to
         strike through any area they will not travel to, and add the ones
         they work in most. */
      localities: [
        'Arya Nagar', 'Swaroop Nagar', 'Civil Lines', 'Kakadeo', 'Kidwai Nagar',
        'Govind Nagar', 'Kalyanpur', 'Barra', 'Shyam Nagar', 'Panki',
        'Vikas Nagar', 'Rawatpur', 'Naubasta', 'Gumti No. 5',
      ],
      /** Written for this city specifically. Never reuse between cities. */
      intro: 'Our office is on Swaroop Nagar, which means a Kanpur move is run by the same people who surveyed it — no sub-contracting to a crew you have not met. We know which societies in Civil Lines and Arya Nagar restrict lift use to certain hours, where a truck can and cannot be parked in the older Gumti and Naubasta lanes, and how long the run across the Ganga bridge really takes at four in the afternoon.',
    },
  ],

  /* ------------------------------------------------------------------
     6. SOCIAL PROFILES
     Empty strings stay hidden. Used in `sameAs` in the schema.
     ------------------------------------------------------------------ */
  social: {
    facebook: '',
    instagram: '',
    youtube: '',
    linkedin: '',
    x: '',
  },

  /* ------------------------------------------------------------------
     7. FEATURE SWITCHES
     ------------------------------------------------------------------ */
  features: {
    /* The 3D hero truck is GONE. It was a generic model with no connection
       to this company, and it cost 813 KB of Three.js and three loaders to
       show it. The hero now carries a photograph of the actual office
       frontage with the company's own sign on it, which is both lighter and
       a far better trust signal. Nothing switches it back on; the module and
       the vendored library were deleted. */

    /* The scroll-linked truck journey is GONE, along with the "How it works"
       anchor that pointed at it. It was never a separate page, so nothing
       was redirected and nothing 404s. Removing it also removed GSAP and
       ScrollTrigger, which loaded on every page of the site for that one
       section: 114 KB. */
    /** A single, dismissible prompt offering the callback form. Never repeats
        in the same session once dismissed. Set false to remove entirely. */
    timedQuotePrompt: false,
    /** Floating WhatsApp + call bar on mobile. */
    stickyContactBar: true,
    /** The small, occasional card that surfaces one genuine review.
        Shows nothing at all when there are no real reviews to show. */
    reviewPopup: true,
  },

  /* ------------------------------------------------------------------
     7b. CALLBACK FORM
     ------------------------------------------------------------------ */
  callback: {
    /* >>> THIS IS A PROMISE THE BUSINESS HAS TO KEEP. <<<
       It is printed under the submit button and repeated in the
       confirmation dialog. One hour is what the brief asked for, but it has
       not been confirmed with the owner, and a promise the office cannot
       meet on a Sunday afternoon does more damage than no promise at all.

       If an hour is not realistic, change it here and both places follow.
       Safe alternatives that are still specific:
         'We will call you back the same working day.'
         'We will call you back within two working hours.' */
    responseText: 'Our team will contact you within one hour.',

    /* Set false and the line above disappears everywhere, rather than
       being quietly reworded into something vaguer. */
    promiseResponseTime: true,
  },

  /* ------------------------------------------------------------------
     8. TESTIMONIALS
     ------------------------------------------------------------------
     `verified` is the production list. It starts empty on purpose.
     Add an entry only when you hold the customer's actual words and their
     permission to publish them. These are the only ones that may ever
     appear in Review structured data.

     There is no "sample" or "demo" list any more, and that is deliberate.
     This file is downloaded by every visitor, so ten invented reviews sitting
     in it were publicly readable under the real business name whether or not
     the page rendered them. Placeholder copy is fine while a site has no
     client; it stops being fine the moment the client's name is on it.

     The business has roughly 60 genuine reviews across Google (46), Sulekha
     (10) and IndiaMART (4). Ask the owner to forward the text of the best
     Google ones together with permission to republish, add them below, and
     the section reappears by itself with real Review structured data.

     Do NOT add an aggregate rating. The "326 ratings" figure that circulates
     for this business is not ratings at all — that directory reports that
     335 people recently VIEWED the listing.
     ------------------------------------------------------------------ */
  testimonials: {
    /* Where these reviews came from. This is not a label — it decides
       whether they are published as structured data.

         'google'      reviews republished from the Google Business Profile.
                       Shown on the page, NEVER marked up: Google's guidelines
                       exclude both self-serving reviews (a business's own
                       reviews on its own site) and reviews aggregated from
                       another platform, and these are both.

         'firstParty'  reviews the business collected itself, with the
                       customer's permission to publish. These DO get Review
                       structured data.

       Set this to match reality. Setting it to 'firstParty' for reviews
       copied off Google puts the site in breach of the guidelines. */
    source: 'google',

    /* The overall Google rating, as shown on the Business Profile.
       These two are displayed as plain text next to a link to the profile,
       and are never put into structured data.

       They must be the figures for ALL reviews — good and bad. Do NOT
       average the selected reviews below; that is how a business ends up
       advertising 5.0 when its real rating is 4.3, and it is the exact thing
       a customer checks before calling.

       Left null until someone reads them off the live profile. A figure of
       4.3 from 46 reviews has been reported but was never confirmed
       first-hand, so it is not published. */
    googleOverallRating: null,   // e.g. 4.3
    googleTotalReviews: null,    // e.g. 46

    /* The reviews actually displayed.
       Each entry:
         name    as it appears publicly on Google
         rating  1-5, the reviewer's own star rating
         text    their words, unedited — never trimmed for flattery
         date    'YYYY-MM-DD', optional
         url     link to that review or the profile, optional

       EMPTY ON PURPOSE. Nothing here may be written by hand from memory or
       paraphrased. Fill it one of two ways:
         - configure the Places API (see functions/api/reviews.js and
           .env.example) and the site fetches them live, or
         - paste the real text across from the Business Profile.
       The whole section stays hidden while this is empty. */
    verified: [],
  },

  /* ------------------------------------------------------------------
     8b. OWN CONTENT  —  testimonials and job photos
     ------------------------------------------------------------------
     Section 8 above is about GOOGLE's reviews. This is about the business's
     own material: testimonials collected directly, and photographs of real
     jobs. They are kept apart on purpose and labelled differently on the
     page, because presenting a testimonial the office typed up as a Google
     review is a misrepresentation, and only one of the two may ever carry
     Review structured data.

     Both are loaded from JSON files under /content/ rather than from this
     file, so that adding a testimonial or a photo does not mean editing
     JavaScript. See content/README.md for how to add one.

     WHAT THIS IS NOT: it is not an admin dashboard. This site is static
     files on GitHub Pages — there is no server, no login and nowhere to
     store an upload, so a protected editing screen cannot exist here
     without moving the hosting. That trade-off is written up in
     README.md under "Managing reviews and photos". Editing the JSON is the
     honest version of the feature, not a stand-in for one that works.
     ------------------------------------------------------------------ */
  ownContent: {
    /** Fetched at runtime. Missing or malformed: the section hides itself. */
    testimonialsUrl: '/content/testimonials.json',
    photosUrl: '/content/photos.json',
  },

  /* ------------------------------------------------------------------
     9. CONSENT & PRIVACY
     ------------------------------------------------------------------ */
  privacy: {
    /* How consent is taken on the callback form.

       true   a tick-box the visitor must check. The most defensible
              reading of the DPDP Act 2023, and what privacy.html currently
              describes.
       false  the same sentence as a notice line above the button, with no
              box to tick. Lower friction, and the pattern most Indian
              service sites use for a callback request.

       This is a decision for the business and its adviser, not for whoever
       wrote the form, which is why it is a switch rather than a choice baked
       into the markup. If it is set to false, change privacy.html to match —
       the policy currently says a box is ticked. */
    requireConsentTick: true,

    /** Shown beside the submit button on the callback form. */
    consentText: 'I agree to be contacted about this enquiry by phone, WhatsApp or email.',
    /** Separate, optional, and never pre-ticked. */
    marketingConsentText: 'Occasionally send me moving tips and offers.',
    /** How long lead records are kept. Reflected in privacy.html. */
    leadRetentionDays: 365,
  },

  /* ------------------------------------------------------------------
     10. ANALYTICS
     Off by default. Adding an ID here also requires allowing that vendor's
     domains in the Content-Security-Policy line in _headers.
     ------------------------------------------------------------------ */
  analytics: {
    cloudflareToken: '',
    googleAnalyticsId: '',
  },
};

/* --------------------------------------------------------------------------
   DERIVED HELPERS
   Small, dependency-free accessors so no page has to re-implement this logic.
   -------------------------------------------------------------------------- */

/** A tel: href, or null when no number is configured. */
export function telHref() {
  const n = SITE_CONFIG.contact.phoneDial;
  return isSet(n) ? 'tel:' + n.replace(/[^\d+]/g, '') : null;
}

/**
 * A wa.me click-to-chat URL with a correctly URL-encoded prefilled message,
 * or null when no WhatsApp number is configured.
 */
export function whatsappHref(message) {
  const n = SITE_CONFIG.contact.whatsappNumber;
  if (!isSet(n)) return null;
  const digits = n.replace(/\D/g, '');
  const text = message || SITE_CONFIG.contact.whatsappMessage || '';
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
}

/** Absolute URL for a path, built from the configured origin. */
export function absoluteUrl(path) {
  const origin = SITE_CONFIG.web.origin.replace(/\/+$/, '');
  return origin + (path.startsWith('/') ? path : '/' + path);
}

/** Services actually offered, in display order. */
export function offeredServices() {
  return SITE_CONFIG.services.filter((s) => s.offered);
}

/** Years trading, or null when the founding year is unconfirmed. */
export function yearsTrading() {
  const y = SITE_CONFIG.business.foundingYear;
  if (!y || typeof y !== 'number') return null;
  const years = new Date().getFullYear() - y;
  return years > 0 ? years : null;
}

/** The address as a single line, skipping any unconfigured part. */
export function addressOneLine() {
  const a = SITE_CONFIG.contact.address;
  return [a.street, a.locality, a.city, a.state, a.postalCode]
    .filter(isSet)
    .join(', ');
}

/** True when enough of the address exists to publish LocalBusiness schema. */
export function hasPublishableAddress() {
  const a = SITE_CONFIG.contact.address;
  return isSet(a.street) && isSet(a.city) && isSet(a.postalCode);
}
