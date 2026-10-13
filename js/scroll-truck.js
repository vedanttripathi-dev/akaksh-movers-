/* ============================================================================
   SIDE SCROLL TRUCK — a truck that guides the visitor down the whole page
   ============================================================================
   A fixed rail down the left edge of the window. A truck travels from the top
   of the rail to the bottom as the visitor scrolls from the top of the page
   to the bottom, with the road filling in gold behind it.

   WHY THIS IS NOT BUILT ON GSAP / ScrollTrigger
   ---------------------------------------------
   The journey section's road uses ScrollTrigger because it is tied to one
   section's position. This one is tied to the DOCUMENT, which needs no
   library at all:

       progress = scrollY / (scrollHeight - innerHeight)

   That is two numbers the browser already has. Doing it directly means:

     * it works on every page, including ones that never load GSAP;
     * it cannot desynchronise from a section's measured start/end;
     * it keeps working if GSAP fails to load;
     * there is nothing to refresh when the layout changes — the next scroll
       event recomputes from scratch.

   Fewer moving parts is the whole point: this is the element the visitor
   sees on every screen, so it has to be the most reliable thing on the page.

   PERFORMANCE
   -----------
   The scroll listener is passive and does nothing but store a flag; all the
   work happens once per frame inside requestAnimationFrame. Each frame
   writes one `transform` and one `scaleY` — both composited, neither
   triggering layout or paint.

   ACCESSIBILITY
   -------------
   `aria-hidden` and `pointer-events: none`. It is a decorative restatement
   of the scrollbar, which assistive technology already reports, so
   announcing it again would be noise. It never intercepts a tap.
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Build an SVG element with attributes. Keeps this file free of innerHTML. */
function s(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/**
 * The truck, drawn nose-down so it reads as driving down the page.
 * viewBox is 28 wide by 46 tall.
 */
function buildTruck() {
  const svg = s('svg', {
    class: 'scroll-rail__truck',
    viewBox: '0 0 28 46',
    width: 28,
    height: 46,
    'aria-hidden': 'true',
    focusable: 'false',
  });

  // Rear wheels (top of the sprite, since the truck points downwards).
  svg.append(s('rect', { x: 1.5, y: 8, width: 3, height: 7, rx: 1.5, fill: '#06121f' }));
  svg.append(s('rect', { x: 23.5, y: 8, width: 3, height: 7, rx: 1.5, fill: '#06121f' }));
  // Front wheels.
  svg.append(s('rect', { x: 1.5, y: 29, width: 3, height: 7, rx: 1.5, fill: '#06121f' }));
  svg.append(s('rect', { x: 23.5, y: 29, width: 3, height: 7, rx: 1.5, fill: '#06121f' }));

  // Cargo body.
  svg.append(s('rect', { x: 3.5, y: 2, width: 21, height: 25, rx: 3, fill: '#45402f' }));
  svg.append(s('rect', { x: 3.5, y: 2, width: 21, height: 25, rx: 3, fill: 'none', stroke: '#3d5873', 'stroke-width': 1 }));
  // Roller-shutter lines, so it is not a plain slab.
  svg.append(s('path', { d: 'M6 8h16M6 13h16M6 18h16', stroke: '#3d5873', 'stroke-width': 1, opacity: 0.55 }));

  // Gold band between body and cab.
  svg.append(s('rect', { x: 3.5, y: 26, width: 21, height: 2.2, rx: 1, fill: '#f5a524' }));

  // Cab.
  svg.append(s('rect', { x: 4.5, y: 29, width: 19, height: 12, rx: 3, fill: '#f5a524' }));
  // Windscreen.
  svg.append(s('rect', { x: 7.5, y: 31.5, width: 13, height: 5.5, rx: 1.6, fill: '#1a1203', opacity: 0.85 }));
  // Headlights at the very front.
  svg.append(s('rect', { x: 6.5, y: 38.5, width: 4, height: 2, rx: 1, fill: '#fff4e0' }));
  svg.append(s('rect', { x: 17.5, y: 38.5, width: 4, height: 2, rx: 1, fill: '#fff4e0' }));

  return svg;
}

export function initScrollTruck() {
  // Never build it twice.
  if (document.querySelector('.scroll-rail')) return () => {};

  const rail = document.createElement('div');
  rail.className = 'scroll-rail';
  rail.setAttribute('aria-hidden', 'true');

  const track = document.createElement('span');
  track.className = 'scroll-rail__track';

  const fill = document.createElement('span');
  fill.className = 'scroll-rail__fill';

  const truck = buildTruck();

  rail.append(track, fill, truck);
  document.body.append(rail);

  let ticking = false;
  let hidden = false;

  function update() {
    ticking = false;

    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;

    // A page with nothing to scroll has no journey to show.
    if (scrollable < 240) {
      if (!hidden) { rail.classList.add('is-hidden'); hidden = true; }
      return;
    }
    if (hidden) { rail.classList.remove('is-hidden'); hidden = false; }

    const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));

    // How far the truck may travel: the rail's own height less the truck.
    const travel = rail.clientHeight - truck.clientHeight;
    truck.style.transform = 'translateY(' + (progress * travel).toFixed(1) + 'px)';

    // The road fills in behind it. scaleY from the top, so no layout work.
    fill.style.transform = 'scaleY(' + progress.toFixed(4) + ')';
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Fonts and images landing can change the page height, which changes the
  // denominator. Recompute once things have settled.
  window.addEventListener('load', onScroll, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(onScroll).catch(() => {});
  }

  update();

  return function destroy() {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    rail.remove();
  };
}
