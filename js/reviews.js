/* ============================================================================
   REVIEWS
   ============================================================================
   Renders the customer-review section from one of two sources, in order:

     1. GET /api/reviews  — live from the Google Business Profile, fetched
        server-side so the API key stays off the client. Returns at most five
        reviews, because that is Google's limit, not a choice made here.

     2. SITE_CONFIG.testimonials.verified — review text pasted in by hand from
        the profile. Used when the API is not configured, which it is not yet.

   If neither has anything, the whole section hides itself. There is no third
   source and no placeholder: a review nobody wrote is not a review.

   WHAT THIS DELIBERATELY DOES NOT DO
   ----------------------------------
   It never derives the overall rating from the reviews on screen. Those are
   the GOOD ones — averaging them produces 5.0 for a business whose real score
   is 4.3, which is a lie a customer can check in one tap. The headline rating
   comes only from the profile's own figure (`rating`/`total` from the API, or
   `googleOverallRating`/`googleTotalReviews` in config), and the page says in
   so many words that the cards below are a selection.

   Structured data is handled in schema.js, which emits no Review markup at
   all for Google-sourced reviews. See the long note there.
   ========================================================================== */

import { SITE_CONFIG, isSet } from './config.js';
import { el, icon, fill, q, safeUrl } from './dom.js';

const ENDPOINT = '/api/reviews';

/**
 * A star rating that a screen reader can actually read.
 * The stars themselves are decorative; the label carries the meaning.
 */
function stars(rating) {
  const rounded = Math.round(rating);
  const row = el('span', {
    class: 'stars',
    role: 'img',
    'aria-label': `Rated ${rating} out of 5`,
  });
  for (let i = 1; i <= 5; i += 1) {
    // One shape, two states. `.is-on` fills it; the rest stay as outlines.
    row.append(icon('star', i <= rounded ? 'stars__star is-on' : 'stars__star'));
  }
  return row;
}

/** "March 2024" — a month is precise enough and ages more gracefully. */
function monthLabel(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}/.test(iso)) return null;
  const date = new Date(iso + (iso.length === 7 ? '-01' : ''));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function reviewCard(item) {
  const link = safeUrl(item.url);

  return el('figure', { class: 'quote quote--review' }, [
    typeof item.rating === 'number' ? stars(item.rating) : null,
    el('blockquote', { text: '“' + item.text + '”' }),
    el('figcaption', { class: 'quote__who' }, [
      el('span', { class: 'quote__avatar', 'aria-hidden': 'true', text: initialsOf(item.name) }),
      el('span', {}, [
        el('span', { class: 'quote__name', text: item.name }),
        el('span', { class: 'quote__move', text: [monthLabel(item.date), sourceLabel()].filter(Boolean).join(' · ') }),
      ]),
    ]),
    link
      ? el('a', {
        class: 'quote__source',
        href: link,
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
      }, ['Read on Google', icon('arrow-right')])
      : null,
  ]);
}

/* Initials rather than the Google profile photo, on purpose.
   Google requires a reviewer's photo to be displayed as supplied if it is
   displayed at all, and each one is a third-party image request that slows
   the section down and leaks the visitor's IP to another host. The API route
   still passes `photo` through, so this is a one-line change if the business
   decides it wants them. */
function initialsOf(name) {
  return String(name || '')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0].toUpperCase()).join('');
}

function sourceLabel() {
  return SITE_CONFIG.testimonials.source === 'google' ? 'Google review' : null;
}

/**
 * The line above the cards: the profile's REAL overall rating, and an honest
 * statement that the cards are a selection. Rendered only when a genuine
 * overall figure exists — never computed from the cards.
 */
function summary(rating, total, profileUrl) {
  if (typeof rating !== 'number') return null;

  const parts = [
    el('span', { class: 'rating-summary__score', text: rating.toFixed(1) }),
    stars(rating),
  ];

  if (typeof total === 'number' && total > 0) {
    parts.push(el('span', {
      class: 'rating-summary__count',
      text: `from ${total} Google review${total === 1 ? '' : 's'}`,
    }));
  }

  const children = [el('div', { class: 'rating-summary__head' }, parts)];

  children.push(el('p', {
    class: 'rating-summary__note',
    text: 'That is our rating across every review on Google, good and bad. '
        + 'The ones below are a selection — read them all on our profile.',
  }));

  const link = safeUrl(profileUrl);
  if (link) {
    children.push(el('a', {
      class: 'btn btn--ghost btn--sm',
      href: link,
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    }, ['View all Google reviews', icon('arrow-right')]));
  }

  return el('div', { class: 'rating-summary' }, children);
}

/** The "View all" button on its own, when there is no overall rating to show. */
function profileLinkOnly(profileUrl) {
  const link = safeUrl(profileUrl);
  if (!link) return null;
  return el('div', { class: 'btn-row btn-row--centre mt-6' }, [
    el('a', {
      class: 'btn btn--ghost',
      href: link,
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    }, ['View all Google reviews', icon('arrow-right')]),
  ]);
}

function render(host, { reviews, rating, total, profileUrl }) {
  const section = host.closest('section');

  if (!reviews.length) {
    if (section) section.hidden = true;
    host.hidden = true;
    return;
  }

  const head = summary(rating, total, profileUrl);

  fill(host, [
    head,
    el('div', { class: 'grid grid-3 reveal-group' }, reviews.map(reviewCard)),
    head ? null : profileLinkOnly(profileUrl),
  ]);

  host.hidden = false;
  if (section) section.hidden = false;
}

/** Reviews pasted into config by hand, used when the API is not configured. */
function fromConfig() {
  const t = SITE_CONFIG.testimonials;
  return {
    reviews: (t.verified || []).filter((r) => r && r.name && r.text),
    rating: typeof t.googleOverallRating === 'number' ? t.googleOverallRating : null,
    total: typeof t.googleTotalReviews === 'number' ? t.googleTotalReviews : null,
    profileUrl: isSet(SITE_CONFIG.contact.googleBusinessProfile)
      ? SITE_CONFIG.contact.googleBusinessProfile
      : null,
  };
}

export async function initReviews() {
  const host = q('[data-testimonials]');
  if (!host) return;

  const configured = fromConfig();

  // Render whatever config holds first, so the section is never blank while
  // the network is slow, and so it still works if /api/reviews is down.
  render(host, configured);

  try {
    const response = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!response.ok) return;

    const data = await response.json();
    if (!data.ok || data.configured === false) return;
    if (!Array.isArray(data.reviews) || !data.reviews.length) return;

    render(host, {
      reviews: data.reviews,
      rating: typeof data.rating === 'number' ? data.rating : configured.rating,
      total: typeof data.total === 'number' ? data.total : configured.total,
      profileUrl: data.profileUrl || configured.profileUrl,
    });
  } catch {
    // Offline, blocked, or the endpoint is not deployed. The config-backed
    // render above already ran; leave it alone.
  }
}
