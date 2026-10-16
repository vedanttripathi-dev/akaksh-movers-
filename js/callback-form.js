/* ============================================================================
   CALLBACK FORM MARKUP
   ============================================================================
   Builds the callback form in two shapes from one definition:

     * a dialog, opened by any `[data-open-callback]` button on any page;
     * an inline card, mounted into `[data-callback-form]` on the homepage.

   Both carry the same fields and the same validation (lead-form.js), because
   two forms that drift apart is how a site ends up accepting a phone number
   in one place and rejecting it in another.

   WHAT THIS REPLACED
   ------------------
   A five-step estimate form: name, phone, WhatsApp, email, contact
   preference, two cities, two localities, two PIN codes, property type,
   move date, eight service tick-boxes, inventory size, two floors, lift
   availability, large items, free-text notes, then a review step. Twenty-odd
   fields to ask a stranger for a phone call.

   It is now four fields, two of them optional. The business needs a name and
   a number to ring back; everything else is a conversation, and a
   conversation converts better than an interrogation. The detail the old
   form collected was genuinely useful to whoever quoted the job — that is
   the real trade being made here, and it is being made deliberately: a
   detailed form nobody finishes collects nothing at all.

   IDs ARE PREFIXED, AND THAT MATTERS
   ----------------------------------
   The homepage carries both shapes at once. Every id here is built from a
   caller-supplied prefix so the two never collide — duplicate ids would
   break every `<label for>` on the page and send focus to the wrong field.

   WITHOUT JAVASCRIPT
   ------------------
   No dialog appears and no inline card is mounted; the buttons stay ordinary
   links to /contact.html. Visitors still have the phone number, the WhatsApp
   link and the contact page, all plain links in the markup.

   SECURITY
   --------
   Every node here is built with createElement and textContent. There is no
   innerHTML in this file and there should never be: see the note at the top
   of dom.js.
   ========================================================================== */

import { SITE_CONFIG, isSet } from './config.js';
import { el, icon, q } from './dom.js';

/** The response-time promise, or null when the business has not made one. */
export function responsePromise() {
  return SITE_CONFIG.callback.promiseResponseTime && isSet(SITE_CONFIG.callback.responseText)
    ? SITE_CONFIG.callback.responseText
    : null;
}

/** A labelled text input inside a .field wrapper. */
function field(id, label, options = {}) {
  return el('div', { class: 'field' }, [
    el('label', { for: id }, [
      label,
      options.required ? el('span', { 'aria-hidden': 'true', text: ' *' }) : null,
      options.optional ? el('span', { class: 'label-optional', text: ' (optional)' }) : null,
    ]),
    el('input', {
      class: 'input',
      type: 'text',
      id,
      name: options.name,
      maxlength: options.maxLength,
      placeholder: options.placeholder,
      autocomplete: options.autoComplete,
      required: options.required,
    }),
    el('p', { class: 'field__error', 'data-error-for': id }),
  ]);
}

/** An Indian mobile field with a fixed +91 prefix. */
function phoneField(id, label) {
  return el('div', { class: 'field' }, [
    el('label', { for: id }, [label, el('span', { 'aria-hidden': 'true', text: ' *' })]),
    el('div', { class: 'phone-field' }, [
      el('span', { class: 'phone-field__cc', text: '+91' }),
      el('input', {
        class: 'input', type: 'tel', id, name: 'phone',
        inputmode: 'numeric', maxlength: 10, placeholder: '98765 43210',
        autocomplete: 'tel-national', required: true,
      }),
    ]),
    el('p', { class: 'field__hint', text: '10 digits, starting 6, 7, 8 or 9.' }),
    el('p', { class: 'field__error', 'data-error-for': id }),
  ]);
}

/**
 * How the visitor agrees to be contacted.
 *
 * Two shapes, chosen by `privacy.requireConsentTick` in config, because this
 * is a decision for the business and its advisers rather than for whoever
 * wrote the form. A tick-box is the most defensible reading of the DPDP
 * Act's consent requirement; a notice line is the lower-friction pattern
 * most Indian service sites use for a callback request. Neither is invented
 * here and the wording comes from config either way.
 *
 * What is NOT offered is a pre-ticked box. That is not consent in any
 * jurisdiction that has looked at the question.
 */
function consentBlock(prefix) {
  if (SITE_CONFIG.privacy.requireConsentTick) {
    const id = prefix + '-consent';
    return el('div', { class: 'field' }, [
      el('label', { class: 'check' }, [
        el('input', { type: 'checkbox', id, name: 'consent', required: true }),
        el('span', { text: SITE_CONFIG.privacy.consentText }),
      ]),
      el('p', { class: 'field__error', 'data-error-for': id }),
    ]);
  }

  return el('p', { class: 'form-note' }, [
    SITE_CONFIG.privacy.consentText + ' See our ',
    el('a', { href: '/privacy.html', text: 'privacy policy' }),
    '.',
  ]);
}

/** The four fields, as one fieldset. */
function fieldsBlock(prefix) {
  return el('div', { class: 'fstep', 'data-fields': '' }, [
    field(prefix + '-name', 'Your name', {
      required: true, maxLength: 80, placeholder: 'Name',
      autoComplete: 'name', name: 'name',
    }),
    phoneField(prefix + '-phone', 'Mobile number'),
    el('div', { class: 'fstep__pair' }, [
      field(prefix + '-from', 'Moving from', {
        optional: true, maxLength: 80, placeholder: 'Area or city', name: 'movingFrom',
      }),
      field(prefix + '-to', 'Moving to', {
        optional: true, maxLength: 80, placeholder: 'Area or city', name: 'movingTo',
      }),
    ]),
    consentBlock(prefix),
  ]);
}

/**
 * The confirmation and failure panels.
 *
 * The success panel is shown ONLY after the server has accepted the lead —
 * see the honesty rules at the top of lead-form.js. Nothing here is rendered
 * on submit.
 */
function stateBlocks(variant) {
  const success = el('div', {
    class: 'form-state form-state--ok', 'data-state': 'success', hidden: true,
  }, [
    el('span', { class: 'form-state__icon' }, [icon('check-circle')]),
    el('h3', { tabindex: '-1' }, ['Thank you for contacting ', SITE_CONFIG.business.name]),
    el('p', { class: 'lead text-sm', 'data-success-text': '' }),
    el('p', { class: 'form-note', text: 'Need help sooner? Message us directly on WhatsApp.' }),
    el('div', { class: 'btn-row btn-row--centre' }, [
      // In the dialog this closes it; inline there is nothing to close, so
      // the button is simply not rendered rather than being a dead control.
      variant === 'modal'
        ? el('button', {
          class: 'btn btn--ghost', type: 'button', 'data-close-callback': '',
          text: 'Continue browsing',
        })
        : null,
      el('a', { class: 'btn btn--wa', 'data-wa-link-lead': '', hidden: true }, [
        icon('whatsapp'), 'Chat on WhatsApp',
      ]),
    ]),
    el('p', { class: 'form-note', 'data-lead-ref': '' }),
  ]);

  const error = el('div', {
    class: 'form-state form-state--err', 'data-state': 'error', hidden: true,
  }, [
    el('span', { class: 'form-state__icon' }, [icon('alert')]),
    el('h3', { tabindex: '-1', text: 'That did not go through' }),
    el('p', { class: 'lead text-sm', 'data-error-text': '' }),
    el('div', { class: 'btn-row btn-row--centre' }, [
      el('button', { class: 'btn btn--ghost', type: 'button', 'data-retry': '', text: 'Try again' }),
      el('a', { class: 'btn btn--wa', 'data-wa-link-lead': '', hidden: true }, [
        icon('whatsapp'), 'Send on WhatsApp instead',
      ]),
    ]),
  ]);

  return [success, error];
}

/** The hidden anti-spam pair every shape of the form carries. */
function trapFields(prefix) {
  return [
    // A real field, moved off-screen by CSS and checked on the server.
    el('div', { class: 'hp', 'aria-hidden': 'true' }, [
      el('label', { for: prefix + '-website', text: 'Website' }),
      el('input', {
        type: 'text', id: prefix + '-website', name: 'website',
        tabindex: '-1', autocomplete: 'off',
      }),
    ]),
    el('input', { type: 'hidden', name: 'startedAt', 'data-started-at': '' }),
  ];
}

/* --------------------------------------------------------------------------
   The two shapes
   -------------------------------------------------------------------------- */

/** Create the dialog if it is not already in the page, and return it. */
export function ensureCallbackModal() {
  const existing = q('#callbackModal');
  if (existing) return existing;

  const prefix = 'cb';
  const promise = responsePromise();

  const form = el('form', {
    class: 'modal__body', id: 'callbackForm', novalidate: true, 'data-callback': '',
  }, [
    ...trapFields(prefix),
    fieldsBlock(prefix),
    ...stateBlocks('modal'),
  ]);

  const panel = el('div', { class: 'modal__panel modal__panel--compact', role: 'document' }, [
    el('div', { class: 'modal__head' }, [
      el('div', { class: 'modal__title-row' }, [
        el('div', {}, [
          el('h2', { id: 'callbackTitle', text: 'Request a callback' }),
          el('p', { text: 'Leave your name and number and we will call you back.' }),
        ]),
        el('button', {
          class: 'modal__close', type: 'button', 'data-close-callback': '', 'aria-label': 'Close',
        }, [icon('x')]),
      ]),
    ]),
    form,
    el('div', { class: 'modal__foot modal__foot--stack', 'data-modal-foot': '' }, [
      el('button', {
        class: 'btn btn--primary btn--block', type: 'submit', form: 'callbackForm',
        'data-submit': '', text: 'Request a callback',
      }),
      promise ? el('p', { class: 'form-note text-centre', text: promise }) : null,
    ]),
  ]);

  const modal = el('div', {
    class: 'modal', id: 'callbackModal', role: 'dialog',
    'aria-modal': 'true', 'aria-labelledby': 'callbackTitle', hidden: true,
  }, [
    el('div', { class: 'modal__backdrop', 'data-close-callback': '' }),
    panel,
  ]);

  document.body.append(modal);
  return modal;
}

/**
 * Build the inline card. The submit button sits INSIDE the form here, so
 * there is no `form=` attribute to keep in step and the card works as a
 * self-contained unit wherever it is mounted.
 */
export function buildInlineForm(prefix) {
  const promise = responsePromise();

  return el('form', {
    class: 'callback-card', id: prefix + 'Form', novalidate: true, 'data-callback': '',
  }, [
    ...trapFields(prefix),
    fieldsBlock(prefix),
    el('div', { 'data-modal-foot': '' }, [
      el('button', {
        class: 'btn btn--primary btn--block btn--lg', type: 'submit',
        'data-submit': '', text: 'Request a callback',
      }),
      promise ? el('p', { class: 'form-note text-centre', text: promise }) : null,
    ]),
    ...stateBlocks('inline'),
  ]);
}
