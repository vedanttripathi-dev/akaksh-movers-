/* ============================================================================
   OUR CUSTOMERS, OUR WORK
   ============================================================================
   The business's OWN material: testimonials it collected directly, and
   photographs of real jobs. Loaded from /content/*.json at runtime so that
   adding either does not mean editing JavaScript.

   WHY THIS IS SEPARATE FROM reviews.js
   ------------------------------------
   reviews.js shows what customers wrote on GOOGLE. This shows what the
   business collected itself. They look different, they are labelled
   differently, and they never mix, because presenting a testimonial the
   office typed up as though it were a Google review is a misrepresentation
   — and it is the kind a customer can catch in one tap by opening the
   profile and not finding it.

   Every card rendered here is badged "Shared with us directly". Nothing in
   this file can produce a Google badge; there is no code path to one.

   NO STRUCTURED DATA
   ------------------
   These carry no Review markup, deliberately. Google's structured-data
   policy excludes reviews a business publishes about itself on its own
   site, whoever wrote them. Marking them up would be asking for a manual
   action in exchange for a star rating Google would not show anyway. See
   the longer note in schema.js.

   WHAT HAPPENS WHEN THERE IS NOTHING
   ----------------------------------
   The section hides itself. It does not render an empty grid, a "coming
   soon", or a placeholder customer. A testimonial nobody gave is not a
   testimonial.
   ========================================================================== */

import { SITE_CONFIG } from './config.js';
import { el, icon, fill, q } from './dom.js';

/** Fetch and parse JSON, returning null for anything that is not usable. */
async function loadJson(url) {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    // Missing file, offline, or malformed JSON. All the same thing here:
    // there is nothing to show, so nothing is shown.
    return null;
  }
}

/** Only entries that are complete and explicitly published. */
function publishedItems(data, key) {
  const list = data && Array.isArray(data[key]) ? data[key] : [];
  return list.filter((item) => item && item.published === true);
}

/**
 * A star rating a screen reader can read. The stars are decorative; the
 * label carries the meaning.
 */
function stars(rating) {
  const rounded = Math.round(rating);
  const row = el('span', {
    class: 'stars', role: 'img', 'aria-label': `Rated ${rating} out of 5`,
  });
  for (let i = 1; i <= 5; i += 1) {
    row.append(icon('star', i <= rounded ? 'stars__star is-on' : 'stars__star'));
  }
  return row;
}

/** "March 2026" — a month is precise enough and ages more gracefully. */
function monthLabel(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}/.test(iso)) return null;
  const date = new Date(iso + (iso.length === 7 ? '-01' : ''));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function initialsOf(name) {
  return String(name || '')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0].toUpperCase()).join('');
}

function testimonialCard(item) {
  const meta = [monthLabel(item.date), item.area].filter(Boolean).join(' · ');

  return el('figure', { class: 'quote quote--own' }, [
    typeof item.rating === 'number' ? stars(item.rating) : null,
    el('blockquote', { text: '“' + item.text + '”' }),
    el('figcaption', { class: 'quote__who' }, [
      el('span', { class: 'quote__avatar', 'aria-hidden': 'true', text: initialsOf(item.name) }),
      el('span', {}, [
        el('span', { class: 'quote__name', text: item.name }),
        meta ? el('span', { class: 'quote__move', text: meta }) : null,
      ]),
    ]),
    /* The source badge is not optional and is not configurable. It is the
       one thing that keeps this section honest next to the Google one. */
    el('span', { class: 'quote__source-tag', text: 'Shared with us directly' }),
  ]);
}

function photoCard(item) {
  const figure = el('figure', { class: 'workshot' }, [
    el('img', {
      class: 'workshot__img',
      src: item.src,
      alt: item.alt || item.caption || 'A job carried out by our team.',
      width: item.width || 800,
      height: item.height || 600,
      loading: 'lazy',
      decoding: 'async',
    }),
    item.caption ? el('figcaption', { class: 'workshot__cap', text: item.caption }) : null,
  ]);
  return figure;
}

export async function initOwnContent() {
  const section = q('[data-own-content]');
  if (!section) return;

  const quotesHost = q('[data-own-testimonials]', section);
  const photosHost = q('[data-own-photos]', section);

  const [tData, pData] = await Promise.all([
    loadJson(SITE_CONFIG.ownContent.testimonialsUrl),
    loadJson(SITE_CONFIG.ownContent.photosUrl),
  ]);

  const quotes = publishedItems(tData, 'testimonials')
    .filter((item) => typeof item.name === 'string' && item.name.trim()
                   && typeof item.text === 'string' && item.text.trim());

  const photos = publishedItems(pData, 'photos')
    .filter((item) => typeof item.src === 'string' && item.src.trim());

  if (!quotes.length && !photos.length) {
    section.hidden = true;
    return;
  }

  if (quotesHost) {
    if (quotes.length) {
      fill(quotesHost, [
        el('div', { class: 'grid grid-3 reveal-group' }, quotes.map(testimonialCard)),
      ]);
      quotesHost.hidden = false;
    } else {
      quotesHost.hidden = true;
    }
  }

  if (photosHost) {
    if (photos.length) {
      fill(photosHost, [
        el('div', { class: 'workshots' }, photos.map(photoCard)),
      ]);
      photosHost.hidden = false;
    } else {
      photosHost.hidden = true;
    }
  }

  section.hidden = false;
}
