/* ============================================================================
   DOM HELPERS
   ============================================================================
   Tiny builders used by every other module.

   SECURITY RULE — please keep it
   ------------------------------
   Nothing in this project assigns `innerHTML`, and these helpers are the
   reason it does not need to. Text always goes in through `textContent`, so a
   value coming from config, from a URL, or from a server response can never be
   parsed as markup and executed. If you add a helper here, keep that property.
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an element.
 *
 * @param {string} tag
 * @param {object} [props]   class, text, html-attributes, dataset, on*
 * @param {Array}  [kids]    child nodes, appended in order
 * @returns {HTMLElement}
 *
 * Recognised props:
 *   class    → className
 *   text     → textContent (never parsed as HTML)
 *   dataset  → object of data-* values
 *   hidden   → boolean
 *   anything else → setAttribute, skipped when null/undefined/false
 */
export function el(tag, props = {}, kids = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;

    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key === 'dataset') {
      for (const [dk, dv] of Object.entries(value)) {
        if (dv !== null && dv !== undefined) node.dataset[dk] = String(dv);
      }
    } else if (key === 'hidden') {
      node.hidden = Boolean(value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }

  for (const kid of [].concat(kids)) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }

  return node;
}

/**
 * An icon from the inline sprite in the page.
 * @param {string} name  sprite id without the `i-` prefix, e.g. 'truck'
 */
export function icon(name, extraClass = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', ('ic ' + extraClass).trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const use = document.createElementNS(SVG_NS, 'use');
  // `href` is the modern attribute; xlink:href is kept for older Safari.
  use.setAttribute('href', '#i-' + name);
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#i-' + name);

  svg.append(use);
  return svg;
}

/** Remove every child of a node. */
export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

/** Replace a node's children with the supplied ones, in one pass. */
export function fill(node, kids) {
  if (!node) return;
  clear(node);
  for (const kid of [].concat(kids)) {
    if (kid) node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
}

/** `document.querySelector`, shortened. */
export function q(selector, scope = document) {
  return scope.querySelector(selector);
}

/** `querySelectorAll` as a real array. */
export function qa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/**
 * Allow only http and https URLs through to the DOM.
 * Blocks javascript:, data: and vbscript: URLs that would otherwise execute
 * if a bad value ever reached a href. Every external link in this project
 * passes through here — please do not bypass it.
 * @returns {string|null} the URL, or null when it is not safe to use
 */
export function safeUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    /* Parsed with NO base, so only an absolute URL survives.
       This used to resolve against window.location.origin, which quietly
       turned any unconfigured value into a valid same-origin link: the string
       "PLACEHOLDER" became "https://example.com/PLACEHOLDER", passed the
       protocol check, and shipped a 404 "Google Business Profile" link into
       the footer of every page.
       Every caller here passes an external profile URL, so requiring an
       absolute one is both correct and the thing that makes an unfilled
       config value fail closed instead of open. */
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : null;
  } catch {
    return null;
  }
}

/** True when the visitor has asked the operating system for less motion. */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Initials for an avatar, from a display name. Max two letters. */
export function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
