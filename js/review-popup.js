/* ============================================================================
   REVIEW POPUP
   ============================================================================
   A small card, bottom-left, carrying ONE genuine review. Appears once,
   after a delay, and only if the visitor has not already dismissed it this
   session.

   WHAT IT IS NOT
   --------------
   It is not a "social proof" notification. There is no "someone in Kanpur
   just booked", no "3 people are viewing this page", no invented activity of
   any kind. Those are fabrications, they are obvious to anyone who watches
   one for thirty seconds, and they cost more trust than they buy.

   Everything shown here is a review that already exists, from the same
   source as the cards in the reviews section. If there are no reviews, the
   popup does not exist — there is no placeholder and no example.

   WHERE IT SITS, AND WHY
   ----------------------
   Bottom LEFT. The floating WhatsApp button and the sticky call bar are
   bottom right and bottom centre; a card that covers either of those is
   costing the business the exact enquiry it was meant to encourage. On a
   phone it sits above the sticky bar rather than over it.
   ========================================================================== */

import { el, icon, q, safeUrl, prefersReducedMotion } from './dom.js';

const KEY = 'reviewPopupDismissed';
const DELAY_MS = 14000;

/** Session storage can throw in private mode; it is never load-bearing. */
function dismissedAlready() {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}
function rememberDismissed() {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
}

function stars(rating) {
  const rounded = Math.round(rating);
  const row = el('span', {
    class: 'stars stars--sm', role: 'img', 'aria-label': `Rated ${rating} out of 5`,
  });
  for (let i = 1; i <= 5; i += 1) {
    row.append(icon('star', i <= rounded ? 'stars__star is-on' : 'stars__star'));
  }
  return row;
}

/** Keep the card small. A long review is trimmed on a word boundary. */
function excerpt(text, max = 150) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).trim() + '…';
}

export function initReviewPopup(reviews, profileUrl) {
  // Called from both of reviews.js's render paths; only the first wins.
  if (q('#reviewPopup')) return;
  if (!Array.isArray(reviews) || !reviews.length) return;
  if (dismissedAlready()) return;

  /* Pick one at random rather than always the first, so a returning visitor
     is not shown the same card every session. It is still a real review
     either way. */
  const pick = reviews[Math.floor(Math.random() * reviews.length)];
  if (!pick || !pick.name || !pick.text) return;

  const link = safeUrl(profileUrl);

  const card = el('aside', {
    class: 'review-pop',
    id: 'reviewPopup',
    role: 'complementary',
    'aria-label': 'A recent customer review',
    hidden: true,
  }, [
    el('button', {
      class: 'review-pop__close',
      type: 'button',
      'aria-label': 'Dismiss this review',
    }, [icon('x')]),

    typeof pick.rating === 'number' ? stars(pick.rating) : null,
    el('p', { class: 'review-pop__text', text: '“' + excerpt(pick.text) + '”' }),
    el('p', { class: 'review-pop__who' }, [
      el('span', { class: 'review-pop__name', text: pick.name }),
      el('span', { class: 'review-pop__src', text: 'Google review' }),
    ]),
    link ? el('a', {
      class: 'review-pop__link',
      href: link,
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    }, ['Read more on Google', icon('arrow-right')]) : null,
  ]);

  function hide() {
    card.classList.remove('is-in');
    rememberDismissed();
    // Wait out the transition before removing, unless there is not one.
    const remove = () => card.remove();
    if (prefersReducedMotion()) remove();
    else setTimeout(remove, 320);
  }

  q('.review-pop__close', card).addEventListener('click', hide);
  document.body.append(card);

  setTimeout(() => {
    // The visitor may have opened the callback dialog in the meantime;
    // nothing should appear over the top of a form being filled in.
    const modalOpen = document.body.classList.contains('is-locked');
    if (modalOpen) return;

    card.hidden = false;
    // Next frame, so the transition has a start state to animate from.
    requestAnimationFrame(() => card.classList.add('is-in'));
  }, DELAY_MS);
}
