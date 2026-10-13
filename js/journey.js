/* ============================================================================
   SCROLL JOURNEY — the truck that follows the visitor
   ============================================================================
   Six stages. As the visitor scrolls the section, a truck travels along a
   road, the completed part of the road fills in, and each stage lights up as
   it is reached.

   WHY THERE IS NO GSAP `pin`
   --------------------------
   The visual column is held in place with CSS `position: sticky` (see §9 of
   style.css), not with ScrollTrigger's `pin`. That matters:

     * `pin` works by transforming the page and faking the scroll position,
       which is what makes sites feel like they have stolen your scroll
       wheel. Sticky leaves the browser's own scrolling completely alone.
     * Sticky costs nothing to maintain and cannot desynchronise from the
       layout on resize, which pinned containers routinely do.
     * There is no pin-spacer element, so no layout shift and no CLS.

   ScrollTrigger is therefore used for exactly one thing: reporting how far
   through the section we are. Everything else is derived from that number.

   PERFORMANCE
   -----------
     * One ScrollTrigger for the whole section, not one per stage.
     * The scrub handler only writes transforms and one stroke-dashoffset —
       no properties that trigger layout.
     * Stage classes are only touched when the active stage actually changes.
     * On phones the truck is not animated along the path at all; the stages
       simply reveal. Same story, a fraction of the work.

   REDUCED MOTION
   --------------
   Nothing animates. Every stage is shown as active immediately, so the
   content is complete and readable. The module returns early.

   CLEANUP
   -------
   `initJourney` returns a teardown function that kills the ScrollTrigger and
   removes the resize listener.
   ========================================================================== */

import { prefersReducedMotion, q, qa } from './dom.js';

/** Stage boundaries as a fraction of total scroll progress through the section. */
const STAGE_COUNT = 6;

export function initJourney(root) {
  if (!root) return () => {};

  const stages = qa('[data-stage]', root);
  const truck = q('[data-journey-truck]', root);
  const pathBase = q('[data-road-path]', root);
  const pathProgress = q('[data-road-progress]', root);
  const pathBloom = q('[data-road-bloom]', root);
  const pinsHost = q('[data-journey-pins]', root);
  const wheels = qa('[data-wheel]', root);
  const fill = q('[data-journey-fill]', root);
  const label = q('[data-journey-label]', root);
  const pct = q('[data-journey-pct]', root);

  /* --- Reduced motion: show everything, animate nothing. --------------- */
  if (prefersReducedMotion()) {
    // Show the finished state: every stage readable, the road fully drawn.
    // Nothing moves, nothing is hidden. The decorative pins are not created
    // at all, since their only purpose is to register movement.
    stages.forEach((stage) => stage.classList.add('is-active'));
    [pathProgress, pathBloom].forEach((path) => {
      if (path) path.style.strokeDasharray = 'none';
    });
    if (truck) truck.classList.remove('is-moving');
    if (fill) fill.style.width = '100%';
    if (pct) pct.textContent = '100%';
    return () => {};
  }

  /* --- GSAP must actually be present. --------------------------------- */
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) {
    // Without GSAP the IntersectionObserver reveals in main.js still run, so
    // the section remains perfectly usable. Light the stages and stop.
    stages.forEach((stage) => stage.classList.add('is-active'));
    console.info('[journey] GSAP unavailable; stages shown without scroll animation.');
    return () => {};
  }
  gsap.registerPlugin(ScrollTrigger);

  /* --- Road setup ------------------------------------------------------ */
  let totalLength = 0;

  function measureRoad() {
    if (!pathProgress) return;
    totalLength = pathProgress.getTotalLength();
    // Draw the progress stroke from zero by hiding the whole dash initially.
    // The bloom underneath is drawn with exactly the same dash maths so the
    // two never separate.
    [pathProgress, pathBloom].forEach((path) => {
      if (!path) return;
      path.style.strokeDasharray = String(totalLength);
      path.style.strokeDashoffset = String(totalLength);
    });
    placePins();
  }

  /**
   * Convert a fraction along the road into pixel coordinates inside the
   * panel. The road SVG uses `preserveAspectRatio="none"`, so the two axes
   * scale by different factors and each has to be converted separately.
   */
  function pointAt(fraction) {
    if (!pathProgress || !totalLength) return null;
    const svg = pathProgress.ownerSVGElement;
    const viewBox = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const p = pathProgress.getPointAtLength(
      Math.max(0, Math.min(1, fraction)) * totalLength
    );
    return {
      x: p.x * (rect.width / viewBox.width),
      y: p.y * (rect.height / viewBox.height),
    };
  }

  /* --- Milestone pins -------------------------------------------------
     One per stage, sitting on the road at the centre of that stage's share
     of the journey, lighting up as the truck reaches it. */
  let pins = [];

  function buildPins() {
    if (!pinsHost || pins.length) return;
    for (let i = 0; i < STAGE_COUNT; i += 1) {
      const pin = document.createElement('span');
      pin.className = 'journey__pin';
      pinsHost.append(pin);
      pins.push(pin);
    }
  }

  function placePins() {
    pins.forEach((pin, i) => {
      const at = pointAt((i + 0.5) / STAGE_COUNT);
      if (!at) return;
      // CSSOM writes, so the Content-Security-Policy does not apply here.
      pin.style.left = at.x + 'px';
      pin.style.top = at.y + 'px';
    });
  }

  function litPins(progress) {
    pins.forEach((pin, i) => {
      pin.classList.toggle('is-lit', progress >= (i + 0.5) / STAGE_COUNT);
    });
  }

  /**
   * Place the truck at a fraction along the road.
   *
   * The road SVG uses `preserveAspectRatio="none"`, so viewBox units map to
   * pixels by a different factor on each axis. Both the position and the
   * heading are therefore converted into pixel space before use, otherwise
   * the truck would sit beside the road on non-square containers.
   */
  function placeTruck(progress) {
    if (!truck || !pathBase || !totalLength) return;

    const svg = pathBase.ownerSVGElement;
    const box = svg.viewBox.baseVal;            // 0 0 400 400
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = rect.width / box.width;
    const scaleY = rect.height / box.height;

    const length = Math.max(0, Math.min(1, progress)) * totalLength;
    const here = pathProgress.getPointAtLength(length);
    const ahead = pathProgress.getPointAtLength(Math.min(length + 6, totalLength));

    const x = here.x * scaleX;
    const y = here.y * scaleY;
    const angle = Math.atan2((ahead.y - here.y) * scaleY, (ahead.x - here.x) * scaleX) * (180 / Math.PI);

    // Centre the truck graphic on the point.
    const halfW = truck.clientWidth / 2 || 43;
    const halfH = truck.clientHeight / 2 || 22;

    truck.style.transform =
      'translate(' + (x - halfW) + 'px,' + (y - halfH) + 'px) rotate(' + angle.toFixed(2) + 'deg)';
  }

  /* --- Stage switching ------------------------------------------------- */
  let activeIndex = -1;

  function setStage(index) {
    if (index === activeIndex) return;         // only touch the DOM on a real change
    activeIndex = index;

    stages.forEach((stage, i) => {
      stage.classList.toggle('is-active', i === index);
    });

    if (label && stages[index]) {
      label.textContent = stages[index].dataset.stage || '';
    }
  }

  /* --- "Is it moving?" -------------------------------------------------
     The dust and the headlight beam should only show while the truck is
     actually travelling. ScrollTrigger tells us when progress changes but
     never when it stops, so a short timer clears the class once the
     updates go quiet. */
  let movingTimer = null;

  function markMoving() {
    if (!truck) return;
    if (!truck.classList.contains('is-moving')) truck.classList.add('is-moving');
    clearTimeout(movingTimer);
    movingTimer = setTimeout(() => truck.classList.remove('is-moving'), 220);
  }

  /* --- The single ScrollTrigger ---------------------------------------- */
  buildPins();
  measureRoad();

  const trigger = ScrollTrigger.create({
    trigger: root,
    start: 'top top+=20%',
    end: 'bottom bottom-=10%',
    // `scrub` is implicit: we read progress ourselves on update.
    onUpdate(self) {
      const progress = self.progress;

      // Road fill, and the bloom under it, in lockstep.
      if (totalLength) {
        const offset = String(totalLength * (1 - progress));
        if (pathProgress) pathProgress.style.strokeDashoffset = offset;
        if (pathBloom) pathBloom.style.strokeDashoffset = offset;
      }

      // Wheels turn in proportion to how far along the road the truck is,
      // so they are still when the page is still. A fixed-rate spin would
      // look wrong on a parked truck.
      if (wheels.length) {
        const degrees = (progress * 2600).toFixed(1);
        wheels.forEach((wheel) => {
          wheel.style.transform = 'rotate(' + degrees + 'deg)';
        });
      }

      // Dust and headlight beam only while actually moving.
      markMoving();

      litPins(progress);

      // The truck travels on EVERY screen size, phones included.
      //
      // An earlier version skipped this on phones to "save work". That was
      // the wrong trade: a truck that follows the visitor down the page is
      // the whole point of this section, most of this site's visitors are on
      // a phone, and the saving was imaginary. placeTruck only writes one
      // `transform` on one small SVG — it is composited on the GPU and
      // triggers no layout or paint. The expensive thing on this page is the
      // WebGL hero, and that is gated separately in main.js.
      placeTruck(progress);

      // Meter.
      if (fill) fill.style.width = (progress * 100).toFixed(1) + '%';
      if (pct) pct.textContent = Math.round(progress * 100) + '%';

      // Which stage are we in? Clamped so the last stage includes progress 1.
      const index = Math.min(STAGE_COUNT - 1, Math.floor(progress * STAGE_COUNT));
      setStage(index);
    },
  });

  /* --- Re-measure once the page has actually settled -------------------
     ScrollTrigger records the section's start and end pixel positions at the
     moment it is created. At that point the web fonts may not have arrived,
     and this section is almost entirely text — so when Playfair and Inter
     swap in, every stage changes height and the section grows, sometimes by
     several hundred pixels.

     The recorded `end` is then far too close, and progress reaches 100%
     while the visitor is only part-way down: the truck finishes its journey
     while stage three is still on screen. This was visible on a phone.

     Refreshing after the fonts land, and again on `load`, re-measures
     against the real layout. */
  function refresh() {
    ScrollTrigger.refresh();
    measureRoad();
    placeTruck(trigger.progress || 0);
  }

  window.addEventListener('load', refresh, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refresh).catch(() => { /* no font API; fine */ });
  }

  /* There used to be a separate IntersectionObserver here that lit up
     stages on phones. It has been removed: it marked several stages active
     at once while setStage() keeps exactly one active, so the two fought
     each other over the same class. ScrollTrigger now drives the stages on
     every screen size, which is both simpler and consistent. */

  /* --- Resize: the road's pixel size changed, so re-measure. ----------- */
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measureRoad();
      placeTruck(trigger.progress || 0);
      ScrollTrigger.refresh();
    }, 150);
  }
  window.addEventListener('resize', onResize);

  // Start in the right place.
  setStage(0);
  placeTruck(0);

  /* --- Teardown -------------------------------------------------------- */
  return function destroy() {
    clearTimeout(resizeTimer);
    clearTimeout(movingTimer);
    window.removeEventListener('resize', onResize);
    pins.forEach((pin) => pin.remove());
    pins = [];
    trigger.kill();
  };
}
