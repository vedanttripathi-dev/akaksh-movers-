/* ============================================================================
   GALLERY LIGHTBOX
   ============================================================================
   Upgrades the gallery's thumbnail links into an in-page viewer.

   PROGRESSIVE ENHANCEMENT, NOT A REQUIREMENT
   ------------------------------------------
   Every tile in the gallery is already a plain `<a href>` pointing at the
   full-size photograph. With JavaScript off, before this module loads, or if
   it fails to load, clicking a tile opens the image — which is a perfectly
   good outcome. This file only intercepts that click and shows the same
   image in place.

   That also means the full-size photographs are real, crawlable URLs rather
   than strings inside a script, which is the point for image search.

   ACCESSIBILITY
   -------------
   The viewer is a modal dialog: it traps focus, closes on Escape, restores
   focus to the thumbnail that opened it, and moves between photographs with
   the arrow keys. The caption and a "3 of 44" position are announced, so a
   screen-reader user knows where they are in the set.

   SECURITY
   --------
   Every node is built with createElement and textContent. No innerHTML.
   ========================================================================== */

import { el, icon, q, qa } from './dom.js';

const FOCUSABLE = 'button, [href], input, [tabindex]:not([tabindex="-1"])';

export function initLightbox() {
  const group = q('[data-lightbox-group]');
  if (!group) return;

  const links = qa('.shot__link', group);
  if (!links.length) return;

  /* Read the set once, from the markup. The alt text on the thumbnail is
     the description of the photograph, so it serves as the caption here
     too rather than being written out a second time. */
  const items = links.map((link) => {
    const img = q('img', link);
    const figure = link.closest('figure');
    const cap = figure ? q('figcaption', figure) : null;
    return {
      href: link.getAttribute('href'),
      alt: img ? img.getAttribute('alt') : '',
      caption: cap ? cap.textContent.trim() : '',
      width: Number(link.dataset.fullW) || undefined,
      height: Number(link.dataset.fullH) || undefined,
      link,
    };
  });

  let index = 0;
  let lastTrigger = null;
  let box = null;
  let imgEl = null;
  let capEl = null;
  let countEl = null;

  function build() {
    imgEl = el('img', { class: 'lightbox__img', alt: '' });
    capEl = el('p', { class: 'lightbox__cap' });
    countEl = el('span', { class: 'lightbox__count' });
    capEl.append(countEl);

    const close = el('button', {
      class: 'lightbox__btn lightbox__btn--close', type: 'button', 'aria-label': 'Close',
    }, [icon('x')]);
    const prev = el('button', {
      class: 'lightbox__btn lightbox__btn--prev', type: 'button', 'aria-label': 'Previous photograph',
    }, [icon('arrow-right')]);
    const next = el('button', {
      class: 'lightbox__btn lightbox__btn--next', type: 'button', 'aria-label': 'Next photograph',
    }, [icon('arrow-right')]);

    /* Both arrows are the same glyph; `.lightbox__btn--prev` flips it in
       CSS. Doing it here with element.style would also work — CSSOM writes
       are not blocked by `style-src 'self'` — but it would then have to be
       undone in the phone media query, in two places, by hand. */

    close.addEventListener('click', hide);
    prev.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => show(index + 1));

    box = el('div', {
      class: 'lightbox', id: 'lightbox', role: 'dialog',
      'aria-modal': 'true', 'aria-label': 'Photograph viewer', hidden: true,
    }, [imgEl, capEl, close, prev, next]);

    // A click on the backdrop — but not on the photograph or a control —
    // closes, which is what everyone expects of a viewer like this.
    box.addEventListener('click', (event) => {
      if (event.target === box) hide();
    });

    document.body.append(box);
  }

  function show(next) {
    index = (next + items.length) % items.length;
    const item = items[index];

    imgEl.src = item.href;
    /* The photograph carries the description; the dialog is labelled
       separately, so this is not announced twice. */
    imgEl.alt = item.alt;
    if (item.width) imgEl.width = item.width;
    if (item.height) imgEl.height = item.height;

    /* textContent wipes the element, countEl included, so it is re-attached
       rather than assumed to survive. An earlier version removed
       `capEl.firstChild`, which on the first open was countEl itself. */
    capEl.textContent = item.caption || item.alt;
    countEl.textContent = `${index + 1} of ${items.length}`;
    capEl.append(countEl);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); hide(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); return; }
    if (event.key !== 'Tab') return;

    const focusable = qa(FOCUSABLE, box).filter((n) => n.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  function open(at, trigger) {
    if (!box) build();
    lastTrigger = trigger || null;
    show(at);
    box.hidden = false;
    document.body.classList.add('is-locked');
    document.addEventListener('keydown', onKeydown);
    q('.lightbox__btn--close', box).focus();
  }

  function hide() {
    if (!box) return;
    box.hidden = true;
    document.body.classList.remove('is-locked');
    document.removeEventListener('keydown', onKeydown);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  items.forEach((item, i) => {
    item.link.addEventListener('click', (event) => {
      // Leave modified clicks alone: ctrl/cmd-click and middle-click should
      // still open the photograph in a new tab, as any link would.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      open(i, item.link);
    });
  });
}
