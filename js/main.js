/* ============================================================================
   MAIN — boot sequence
   ============================================================================
   Runs on every page. Responsibilities, in order:

     1. Write the configured business details into the markup.
     2. Render the lists that come from configuration (services, areas,
        testimonials, footer links) so they can never drift from the schema.
     3. Header, mobile navigation, scroll reveals.
     4. Hand off to the optional feature modules — quote form, scroll
        journey, 3D hero — each loaded only when it is needed.
     5. Inject the structured data.

   LOADING STRATEGY
   ----------------
   This file is an ES module, so it is deferred and never blocks the first
   paint. The two heavy modules are deliberately NOT imported at the top:

     journey.js  waits for GSAP and is skipped entirely on reduced-motion.
     truck3d.js  pulls in Three.js (~670 KB) and is only imported after the
                 page has loaded AND the device has passed a capability
                 check, so a mid-range phone on a 3G connection never
                 downloads it.

   This is what keeps Largest Contentful Paint independent of the 3D scene:
   the hero's LCP element is the headline and the poster image, both of which
   are plain HTML.
   ========================================================================== */

import {
  SITE_CONFIG, isSet, telHref, whatsappHref, absoluteUrl,
  offeredServices, addressOneLine, hasPublishableAddress, yearsTrading,
} from './config.js';
import { el, icon, fill, q, qa, safeUrl, prefersReducedMotion } from './dom.js';
import { injectSchema, exposeSchemaDebug } from './schema.js';
import { initScrollTruck } from './scroll-truck.js';

/* ==========================================================================
   1. CONFIGURATION → MARKUP
   ========================================================================== */

/** Resolve 'contact.phoneDisplay' against SITE_CONFIG. */
function configValue(path) {
  return path.split('.').reduce(
    (node, key) => (node == null ? undefined : node[key]),
    SITE_CONFIG
  );
}

/**
 * Fill every `[data-config="path"]` element with its configured value.
 * An unset value leaves the markup's own fallback text in place, so a page
 * never shows the word PLACEHOLDER to a visitor.
 */
function applyConfigText() {
  qa('[data-config]').forEach((node) => {
    const value = configValue(node.dataset.config);
    if (isSet(value)) node.textContent = value;
  });

  qa('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  /* The title is deliberately NOT touched here any more.
     It used to have the business name prepended at runtime, which made sense
     while `business.name` was a placeholder and the baked titles were
     generic. Now that every page carries a hand-written title in its HTML,
     prepending would produce "Akash Packers & Movers — Packers & Movers in
     Kanpur — ..." and, worse, a title that differs from the one crawlers and
     social scrapers read out of the markup. The static title is the
     authoritative one; the brand is carried by og:site_name and by the
     Organization node in the JSON-LD instead. */
}

/**
 * Wire up the contact links.
 *
 * Elements carrying these attributes start `hidden` in the markup. They are
 * revealed only once a real value exists, so the site never shows a dead
 * `tel:PLACEHOLDER` link. Each element's closest `[hidden]` ancestor (a list
 * item, usually) is revealed too.
 */
function applyContactLinks() {
  const reveal = (node) => {
    node.hidden = false;
    const wrapper = node.closest('[hidden]');
    if (wrapper) wrapper.hidden = false;
  };

  const tel = telHref();
  if (tel) qa('[data-tel-link]').forEach((a) => { a.href = tel; reveal(a); });

  const wa = whatsappHref();
  if (wa) {
    qa('[data-wa-link]').forEach((a) => {
      a.href = wa;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      reveal(a);
    });
  }

  const email = SITE_CONFIG.contact.email;
  if (isSet(email)) {
    qa('[data-mail-link]').forEach((a) => { a.href = 'mailto:' + email; reveal(a); });
  }

  const gbp = safeUrl(SITE_CONFIG.contact.googleBusinessProfile);
  if (gbp) qa('[data-gbp-link]').forEach((a) => { a.href = gbp; reveal(a); });

  const address = addressOneLine();
  if (address) {
    // `reveal`, not `node.hidden = false`. On the contact page this span sits
    // inside `<li data-contact-address hidden>`; unhiding only the span left
    // the list item hidden, so the office address never appeared on the one
    // page a visitor goes to looking for it.
    qa('[data-footer-address]').forEach((node) => {
      node.textContent = address;
      reveal(node);
    });
  }
}

/** Social icons in the footer. Unset profiles are simply absent. */
function renderSocials() {
  const host = q('[data-socials]');
  if (!host) return;

  const iconFor = { facebook: 'users', instagram: 'users', youtube: 'users', linkedin: 'users', x: 'users' };
  const links = Object.entries(SITE_CONFIG.social)
    .map(([network, url]) => [network, safeUrl(url)])
    .filter(([, url]) => url);

  if (!links.length) return;

  fill(host, links.map(([network, url]) =>
    el('a', {
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': network.charAt(0).toUpperCase() + network.slice(1),
    }, [icon(iconFor[network] || 'users')])
  ));
  host.hidden = false;
}

/* ==========================================================================
   2. LISTS RENDERED FROM CONFIGURATION
   ========================================================================== */

/** The services grid on the home page. */
function renderServices() {
  const grid = q('[data-services-grid]');
  const services = offeredServices();

  if (grid && services.length) {
    fill(grid, services.map((service) => {
      const href = '/services/' + service.slug + '.html';
      return el('article', { class: 'card card--linked' }, [
        el('span', { class: 'card__icon' }, [icon(service.icon || 'box')]),
        el('h3', { text: service.name }),
        el('p', { text: service.summary }),
        el('span', { class: 'link-cta' }, ['Learn more', icon('arrow-right')]),
        el('a', {
          class: 'card__hit',
          href,
          'aria-label': service.name + ' — more detail',
        }),
      ]);
    }));
  }

  // The footer list.
  const footer = q('[data-footer-services]');
  if (footer && services.length) {
    fill(footer, services.map((service) =>
      el('li', {}, [el('a', { href: '/services/' + service.slug + '.html', text: service.name })])
    ));
  }
}

/** Service-area cards. The whole section stays hidden while none are set. */
function renderAreas() {
  const section = q('[data-areas-section]');
  const grid = q('[data-areas-grid]');
  const areas = SITE_CONFIG.serviceAreas || [];

  // On the service-areas page there is no wrapping section to hide — the
  // grid is the page. Show an explicit setup notice there instead of an
  // empty white space.
  const unsetNotice = q('[data-areas-unset]');
  if (unsetNotice) unsetNotice.hidden = areas.length > 0;

  if (!grid || !areas.length) return;
  if (!section) {
    // locations.html: render straight into the grid.
    fill(grid, areas.map((area) =>
      el('article', { class: 'card card--linked' }, [
        el('span', { class: 'card__icon' }, [icon('pin')]),
        el('h3', { text: area.city }),
        el('p', { text: isSet(area.state) ? area.state : '' }),
        el('span', { class: 'link-cta' }, ['Moving in ' + area.city, icon('arrow-right')]),
        el('a', {
          class: 'card__hit',
          href: '/locations/' + area.slug + '.html',
          'aria-label': 'Packers and movers in ' + area.city,
        }),
      ])
    ));
    return;
  }

  fill(grid, areas.map((area) =>
    el('article', { class: 'card card--linked' }, [
      el('span', { class: 'card__icon' }, [icon('pin')]),
      el('h3', { text: area.city }),
      el('p', { text: isSet(area.state) ? area.state : '' }),
      el('span', { class: 'link-cta' }, ['Moving in ' + area.city, icon('arrow-right')]),
      el('a', {
        class: 'card__hit',
        href: '/locations/' + area.slug + '.html',
        'aria-label': 'Packers and movers in ' + area.city,
      }),
    ])
  ));
  section.hidden = false;
}

/**
 * City-page content that comes from the matching `serviceAreas` entry.
 *
 * A city page needs its locality list and its own intro paragraph, and both
 * already live in config. Hard-coding them into the page as well would mean
 * two copies of the same list, which drift the first time one is edited — and
 * a page promising coverage of an area the config no longer lists is exactly
 * the kind of claim this build is careful not to make.
 *
 * Markup:  <ul data-localities="kanpur"></ul>
 *          <p  data-area-intro="kanpur"></p>
 */
function renderAreaDetail() {
  const byslug = (slug) => (SITE_CONFIG.serviceAreas || []).find((a) => a.slug === slug);

  qa('[data-localities]').forEach((host) => {
    const area = byslug(host.dataset.localities);
    const list = area && Array.isArray(area.localities) ? area.localities : [];
    if (!list.length) { host.hidden = true; return; }
    fill(host, list.map((name) => el('li', {}, [icon('check'), el('span', { text: name })])));
    host.hidden = false;
  });

  qa('[data-area-intro]').forEach((host) => {
    const area = byslug(host.dataset.areaIntro);
    if (area && isSet(area.intro)) { host.textContent = area.intro; host.hidden = false; }
    else { host.hidden = true; }
  });
}

/* --------------------------------------------------------------------------
   Contact page extras: opening hours, the map, and the setup notice.
   All no-ops on pages that do not contain these elements.
   -------------------------------------------------------------------------- */

const DAY_LABEL = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

/** "9am", "7pm", "1.30pm" — the way opening hours are actually written. */
function clockLabel(value) {
  const [h, m] = String(value).split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}.${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

/**
 * Collapse the week into readable ranges, so seven identical lines become
 * "Monday to Saturday, 9am – 7pm".
 */
function describeHours() {
  const hours = SITE_CONFIG.contact.openingHours || {};
  const days = Object.keys(DAY_LABEL).filter((d) => d in hours);
  if (!days.length) return null;

  const groups = [];
  days.forEach((day) => {
    const range = hours[day];
    const key = Array.isArray(range) && range.length === 2 ? range.join('-') : 'closed';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.days.push(day);
    else groups.push({ key, days: [day], range });
  });

  return groups.map((group) => {
    const span = group.days.length === 1
      ? DAY_LABEL[group.days[0]]
      : `${DAY_LABEL[group.days[0]]} to ${DAY_LABEL[group.days[group.days.length - 1]]}`;
    if (group.key === 'closed') return `${span}, closed`;
    return `${span}, ${clockLabel(group.range[0])} – ${clockLabel(group.range[1])}`;
  }).join('. ') + '.';
}

/**
 * Small config-driven details on the legal and about pages.
 * Each is skipped silently when the page does not contain it.
 */
/**
 * The one sentence on the About page that depends on the founding year.
 *
 * It stays hidden while `business.foundingYear` is null, which it currently
 * is: five contradictory founding years circulate for this business across
 * the trade directories and none is backed by a dated document. Set the real
 * year in config once a GST or Udyam certificate confirms it and this
 * sentence appears by itself, in agreement with the schema, which reads the
 * same value.
 */
function renderLegacy() {
  const host = q('[data-legacy-since]');
  if (!host) return;

  const year = SITE_CONFIG.business.foundingYear;
  const years = yearsTrading();
  if (!year || !years) { host.hidden = true; return; }

  host.textContent =
    `Moving homes and offices in and out of Kanpur since ${year} — ${years} `
    + 'years of it, run by the same proprietorship throughout.';
  host.hidden = false;
}

function renderStaticDetails() {
  // Retention period quoted in the privacy policy, taken from the same value
  // the lead endpoint enforces, so the two cannot disagree.
  const retention = q('[data-retention-days]');
  if (retention) retention.textContent = String(SITE_CONFIG.privacy.leadRetentionDays);

  // Registration numbers on the About page. Printed only when held — an
  // invented GSTIN is a false credential, not a placeholder.
  const factsSection = q('[data-company-facts]');
  const factsGrid = q('[data-company-facts-grid]');
  if (factsSection && factsGrid) {
    const rows = [
      ['GSTIN', SITE_CONFIG.business.gstin],
      ['CIN', SITE_CONFIG.business.cin],
      ['Udyam registration', SITE_CONFIG.business.udyamNumber],
      ['Trading since', SITE_CONFIG.business.foundingYear],
    ].filter(([, value]) => value !== null && value !== undefined && isSet(String(value)));

    if (rows.length) {
      fill(factsGrid, rows.map(([label, value]) =>
        el('div', { class: 'card' }, [
          el('h3', { text: label }),
          el('p', { class: 'mb-0', text: String(value) }),
        ])
      ));
      factsSection.hidden = false;
    }
  }
}

/**
 * "Print this checklist" on the guide pages.
 *
 * A print button rather than a PDF: the print stylesheet already strips the
 * header, the rails and the CTAs, every browser can save the result as a PDF,
 * and there is no separate file to regenerate whenever the content changes.
 */
function initPrintButtons() {
  qa('[data-print]').forEach((button) => {
    button.addEventListener('click', () => window.print());
  });
}

/**
 * The Google Maps embed, on any page carrying `[data-map-section]`.
 *
 * Two modes, in order of preference:
 *
 *   1. `contact.geo` holds real coordinates  → the map is centred on exactly
 *      that point. This is the one to aim for: take the two numbers from the
 *      Google Business Profile pin and paste them into config.
 *
 *   2. No coordinates, but a street, city and PIN exist → the map is centred
 *      on the ADDRESS, and Google resolves it. This is honest in a way an
 *      invented latitude would not be: the pin is Google's own answer for the
 *      written address, not a guess typed by whoever built the site. If it
 *      lands slightly off, that is Google's geocoding of a real address, and
 *      the note printed under the map says the written address is the one to
 *      trust.
 *
 * With neither, the section stays hidden rather than showing a city-level
 * pin that implies more precision than exists.
 *
 * No API key is involved. This is the keyless `maps?q=…&output=embed` form,
 * which is why nothing secret ends up in a public file. `frame-src
 * https://www.google.com` in `_headers` is what permits the iframe at all —
 * remove that directive and the map silently fails to load.
 */
function renderMap() {
  const section = q('[data-map-section]');
  const box = q('[data-map]');
  if (!section || !box) return;

  const geo = SITE_CONFIG.contact.geo || {};
  const a = SITE_CONFIG.contact.address;
  const hasCoords = typeof geo.latitude === 'number' && typeof geo.longitude === 'number';
  const address = addressOneLine();

  let query = null;
  let note = '';

  if (hasCoords) {
    query = `${geo.latitude},${geo.longitude}`;
    note = '';
  } else if ((isSet(SITE_CONFIG.contact.googleMapsQuery) || isSet(SITE_CONFIG.business.name))
             && hasPublishableAddress()) {
    /* Business NAME first, then the locality, city and PIN.
       This is not a cosmetic choice. Searching the written address alone put
       the pin roughly three kilometres out, in Nawabganj, because geocoders
       treat a house number plus a landmark ("near Khalasi Line") as noise.
       Leading with the name makes Google match its own Business Profile
       listing instead of guessing at a street — so the pin is the one the
       business already owns and has verified, which beats any latitude typed
       in by hand. The landmark is deliberately left out of the query; it is
       still printed in the written address, where it is useful to a human. */
    // Only the locality itself, not the landmark hint that follows it:
    // "Arya Nagar, near Khalasi Line" → "Arya Nagar".
    const area = isSet(a.locality) ? a.locality.split(',')[0].trim() : null;

    // `googleMapsQuery` wins when set: the Business Profile may still be
    // listed under a former name, and the map has to find the real pin.
    query = [
      isSet(SITE_CONFIG.contact.googleMapsQuery)
        ? SITE_CONFIG.contact.googleMapsQuery
        : SITE_CONFIG.business.name,
      area,
      isSet(a.city) ? a.city : null,
      isSet(a.state) ? a.state : null,
      isSet(a.postalCode) ? a.postalCode : null,
    ].filter(Boolean).join(', ');
    note = 'The pin above is our Google listing. The written address is the '
         + 'one to go by — and please call before setting out, rather than '
         + 'trusting a map on moving day.';
  } else {
    return;
  }

  fill(box, [
    el('iframe', {
      src: 'https://www.google.com/maps?q=' + encodeURIComponent(query) + '&output=embed',
      title: 'Map showing our office location',
      loading: 'lazy',
      referrerpolicy: 'no-referrer-when-downgrade',
    }),
  ]);

  const noteEl = q('[data-map-note]');
  if (noteEl) {
    if (note) { noteEl.textContent = note; noteEl.hidden = false; }
    else { noteEl.hidden = true; }
  }

  // A direct link out, for anyone who wants turn-by-turn directions. It uses
  // the same query as the embed, so the two can never point at different
  // places — which is exactly the bug that would strand somebody.
  const directions = q('[data-map-directions]');
  if (directions && (query || address)) {
    directions.href = 'https://www.google.com/maps/dir/?api=1&destination='
      + encodeURIComponent(query || address);
    directions.target = '_blank';
    directions.rel = 'noopener noreferrer';
    directions.hidden = false;
  }

  section.hidden = false;
}

function initContactPage() {
  const hoursEl = q('[data-opening-hours]');
  if (hoursEl) {
    const text = describeHours();
    if (text) hoursEl.textContent = text;
  }

  renderMap();

  // A visible reminder during setup, so a half-configured contact page is
  // obvious to whoever is building it rather than silently empty.
  const notice = q('[data-contact-unset]');
  if (notice) {
    const anyContact = isSet(SITE_CONFIG.contact.phoneDial)
      || isSet(SITE_CONFIG.contact.whatsappNumber)
      || isSet(SITE_CONFIG.contact.email);
    notice.hidden = anyContact;
  }
}


/* ==========================================================================
   3. HEADER, NAVIGATION, REVEALS
   ========================================================================== */

function initHeader() {
  const header = q('#header');
  if (!header) return;

  // Firm up the header background once the page has moved.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('is-stuck', window.scrollY > 12);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mark the current page in the navigation.
  const here = window.location.pathname.replace(/index\.html$/, '') || '/';
  qa('.nav a').forEach((link) => {
    const target = new URL(link.href).pathname.replace(/index\.html$/, '');
    if (target === here) link.setAttribute('aria-current', 'page');
  });
}

function initNavDrawer() {
  const toggle = q('#navToggle');
  const drawer = q('#navDrawer');
  if (!toggle || !drawer) return;

  const setOpen = (open) => {
    drawer.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', () => {
    setOpen(!drawer.classList.contains('is-open'));
  });

  // Close after following a link, and on Escape.
  drawer.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  // Close when the viewport grows past the breakpoint that hides the drawer.
  window.matchMedia('(min-width: 1000px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

/**
 * Reveal elements as they enter the viewport.
 *
 * Deliberately IntersectionObserver rather than GSAP: this runs on every
 * page, including the light content pages that never load GSAP at all.
 * Elements are revealed once and then unobserved.
 */
function initReveals() {
  const targets = qa('.reveal, .reveal-group');
  if (!targets.length) return;

  // With reduced motion the stylesheet already shows everything; adding the
  // class immediately keeps the two paths consistent.
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((node) => node.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
    // A small negative bottom margin so the reveal starts just before the
    // element is fully on screen. Anything larger and a fast scroller
    // arrives at a section that is still fading in.
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

  targets.forEach((node) => observer.observe(node));
}

/** Floating WhatsApp button and the sticky mobile call/WhatsApp bar. */
function initStickyContact() {
  if (!SITE_CONFIG.features.stickyContactBar) return;

  const wa = whatsappHref();
  const tel = telHref();
  if (!wa && !tel) return;   // nothing configured, so nothing to show

  if (wa) {
    document.body.append(
      el('a', {
        class: 'wa-float',
        href: wa,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': 'Chat with us on WhatsApp',
      }, [icon('whatsapp'), 'WhatsApp'])
    );
  }

  if (wa && tel) {
    document.body.append(
      el('div', { class: 'contact-bar' }, [
        el('a', { href: tel }, [icon('phone'), 'Call now']),
        el('a', { href: wa, target: '_blank', rel: 'noopener noreferrer' }, [icon('whatsapp'), 'WhatsApp']),
      ])
    );
    document.body.classList.add('has-contact-bar');
  }
}

/* ==========================================================================
   4. OPTIONAL FEATURE MODULES
   ========================================================================== */

/**
 * Can this device run the 3D hero comfortably?
 *
 * The answer is no far more often than a desktop developer expects, and
 * getting it wrong means a janky hero on exactly the mid-range Android
 * phones most of this site's visitors will use. When in doubt, say no — the
 * poster image is a perfectly good hero.
 */
function can3D() {
  if (!SITE_CONFIG.features.hero3D) return false;
  if (prefersReducedMotion()) return false;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    // An explicit request to save data is honoured without argument.
    if (connection.saveData) return false;

    // Only genuinely unusable connections are blocked.
    //
    // It is tempting to add '3g' here, and that was the first version of
    // this check — but measuring it showed the cost. `effectiveType` is a
    // rolling estimate of round-trip time, not a description of the
    // hardware, and it reports '3g' on plenty of capable desktop machines
    // (this was observed during testing on a 16 GB, 8-core desktop with a
    // discrete GPU on a working connection). Blocking on '3g' therefore
    // denies the 3D hero to a large share of perfectly capable visitors.
    //
    // It is also unnecessary. Three.js is imported only after the `load`
    // event, during idle time, so a slow download delays the 3D scene and
    // nothing else — Largest Contentful Paint is the headline and the
    // poster image, both plain HTML that have already rendered.
    if (/^(slow-2g|2g)$/.test(connection.effectiveType || '')) return false;
  }

  // Chrome-only hints. Absent on Safari and Firefox, so a missing value is
  // never treated as a failure.
  if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4) return false;
  if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency < 4) return false;

  // Finally, is WebGL actually available? A context is created and thrown
  // away: cheaper than discovering the failure after loading Three.js.
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    // Software renderers report themselves; they cannot keep a frame budget.
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) {
      const renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|software|basic render/i.test(renderer)) return false;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Run a callback when the browser is next idle, with a timeout fallback. */
function whenIdle(callback, timeout = 2500) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 400);
  }
}

function initFeatureModules() {
  // --- Quote form. Loaded wherever a CTA exists; the dialog markup itself
  //     is built by quote-modal.js rather than repeated in every page. ---
  if (q('[data-open-quote]')) {
    import('./lead-form.js')
      .then((module) => module.initLeadForm())
      .catch((error) => console.error('[lead-form] failed to load', error));
  }

  /* --- Customer reviews. Loaded only on a page that shows them, because it
         makes a network request to /api/reviews and nothing above the fold
         depends on it. The module renders whatever `testimonials.verified`
         holds first, so the section is never blank while that request is in
         flight — and never shows anything if both sources are empty. --- */
  if (q('[data-testimonials]')) {
    import('./reviews.js')
      .then((module) => module.initReviews())
      .catch((error) => console.warn('[reviews] failed to load', error));
  }

  // --- Scroll journey. Needs GSAP, which is a classic deferred script, so
  //     it may not have executed yet when this module runs. ---
  const journeyRoot = q('[data-journey]');
  if (journeyRoot && SITE_CONFIG.features.scrollJourney) {
    const start = () => {
      import('./journey.js')
        .then((module) => module.initJourney(journeyRoot))
        .catch((error) => console.error('[journey] failed to load', error));
    };
    if (window.gsap) start();
    else window.addEventListener('load', start, { once: true });
  }

  // --- 3D hero. Last, lowest priority, and only when the device can take it. ---
  const stage = q('#heroStage');
  if (stage) {
    if (!can3D()) {
      // Settle on the poster permanently and stop the "preparing" label.
      stage.classList.add('is-static');
    } else {
      window.addEventListener('load', () => {
        whenIdle(() => {
          import('./truck3d.js')
            .then((module) => module.initTruck3D(stage))
            .catch((error) => {
              console.warn('[truck3d] not started, keeping the poster image', error);
              stage.classList.add('is-static');
            });
        });
      }, { once: true });
    }
  }
}

/* ==========================================================================
   5. BOOT
   ========================================================================== */

function boot() {
  applyConfigText();
  applyContactLinks();
  renderSocials();
  renderServices();
  renderAreas();
  renderAreaDetail();
  renderLegacy();
  renderStaticDetails();
  initContactPage();
  initPrintButtons();

  initHeader();
  initNavDrawer();
  initReveals();
  initStickyContact();

  // The side truck that guides the visitor down the whole page. Imported
  // statically rather than lazily: it is tiny, it has no dependencies, and
  // it should be on screen from the first frame on every page.
  initScrollTruck();

  initFeatureModules();

  // Structured data last, so faqNode() can read a fully rendered FAQ.
  injectSchema({
    services: Boolean(q('[data-services-grid]')),
  });
  exposeSchemaDebug();
}

// Modules are deferred, so the DOM is parsed by the time this runs. The guard
// is here only for the case where this file is ever loaded without `type=module`.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
