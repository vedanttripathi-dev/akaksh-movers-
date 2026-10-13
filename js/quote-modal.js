/* ============================================================================
   QUOTE MODAL MARKUP
   ============================================================================
   Builds the five-step enquiry dialog and appends it to the page.

   WHY THIS IS JAVASCRIPT AND NOT MARKUP IN EVERY PAGE
   ---------------------------------------------------
   The dialog is about 150 lines of HTML and a "Get free estimate" button
   appears on every page of the site. Pasting it into fifteen files would
   mean fifteen copies to keep in step: change one field and you have
   fourteen chances to forget. Built once here, every page gets exactly the
   same dialog and the same validation.

   This costs nothing in search terms. The dialog is a form behind a button,
   not page content — there is no text in it that should ever rank, and
   Googlebot has nothing to gain from reading it. Everything that SHOULD be
   crawlable (headings, service copy, FAQs, contact details) stays in the
   HTML of each page.

   WITHOUT JAVASCRIPT
   ------------------
   No dialog appears, and the buttons that open it are hidden by
   lead-form.js. Visitors still have the phone number, the WhatsApp link and
   the contact page, all of which are plain links in the markup. Nobody is
   left looking at a button that does nothing.

   SECURITY
   --------
   Every node here is built with createElement and textContent. There is no
   innerHTML in this file and there should never be: see the note at the top
   of dom.js.
   ========================================================================== */

import { SITE_CONFIG } from './config.js';
import { el, icon, q } from './dom.js';

/** A labelled text/tel/email input inside a .field wrapper. */
function field(id, label, options = {}) {
  const input = el('input', {
    class: 'input',
    type: options.type || 'text',
    id,
    name: options.name || id.replace(/^q-/, ''),
    maxlength: options.maxLength,
    placeholder: options.placeholder,
    inputmode: options.inputMode,
    autocomplete: options.autoComplete,
    required: options.required,
  });

  const labelEl = el('label', { for: id }, [
    label,
    options.required ? el('span', { 'aria-hidden': 'true', text: ' *' }) : null,
    options.optional ? el('span', { class: 'field__hint label-optional', text: ' (optional)' }) : null,
  ]);

  return el('div', { class: 'field' }, [
    labelEl,
    input,
    options.hint ? el('p', { class: 'field__hint', text: options.hint }) : null,
    el('p', { class: 'field__error', 'data-error-for': id }),
  ]);
}

/** An Indian mobile field with a fixed +91 prefix. */
function phoneField(id, label, options = {}) {
  return el('div', { class: 'field' }, [
    el('label', { for: id }, [
      label,
      options.required ? el('span', { 'aria-hidden': 'true', text: ' *' }) : null,
    ]),
    el('div', { class: 'phone-field' }, [
      el('span', { class: 'phone-field__cc', text: '+91' }),
      el('input', {
        class: 'input', type: 'tel', id, name: options.name || id.replace(/^q-/, ''),
        inputmode: 'numeric', maxlength: 10, placeholder: '98765 43210',
        autocomplete: options.autoComplete, required: options.required,
      }),
    ]),
    options.after || null,
    options.hint ? el('p', { class: 'field__hint', text: options.hint }) : null,
    el('p', { class: 'field__error', 'data-error-for': id }),
  ]);
}

/** A <select> inside a .field wrapper. */
function selectField(id, label, values, options = {}) {
  const select = el('select', {
    class: 'select', id, name: options.name || id.replace(/^q-/, ''),
    required: options.required,
  }, [
    el('option', { value: '', text: options.placeholder || 'Select…' }),
    ...values.map((v) => el('option', { text: v })),
  ]);

  return el('div', { class: 'field' }, [
    el('label', { for: id }, [
      label,
      options.required ? el('span', { 'aria-hidden': 'true', text: ' *' }) : null,
    ]),
    select,
    options.after || null,
    el('p', { class: 'field__error', 'data-error-for': id }),
  ]);
}

/** A checkbox with its label, as used for consent and the small toggles. */
function checkbox(id, labelText, options = {}) {
  return el('label', { class: 'check' + (options.className ? ' ' + options.className : '') }, [
    el('input', {
      type: 'checkbox', id,
      name: options.name || id.replace(/^q-/, ''),
      checked: options.checked,
      required: options.required,
    }),
    el('span', { text: labelText }),
  ]);
}

/** One of the multi-select service tiles. */
function choice(id, value) {
  return el('span', { class: 'choice' }, [
    el('input', { type: 'checkbox', name: 'services', id, value }),
    el('label', { for: id, text: value }),
  ]);
}

const FLOORS = ['Ground floor', '1st floor', '2nd floor', '3rd floor', '4th floor or higher'];

const SERVICES = [
  'Packing',
  'Loading and unloading',
  'Transportation',
  'Unpacking',
  'Furniture dismantling and assembly',
  'Vehicle transportation',
  'Storage',
  'Full-service relocation',
];

/**
 * Create the dialog if it is not already in the page, and return it.
 * index.html may still carry its own copy; this never builds a second one.
 */
export function ensureQuoteModal() {
  const existing = q('#quoteModal');
  if (existing) return existing;

  /* ---------------------------------------------------------- step 1 */
  const step1 = el('fieldset', { class: 'fstep', 'data-step': '1' }, [
    el('legend', { class: 'sr-only', text: 'Your details' }),
    field('q-name', 'Full name', {
      required: true, maxLength: 80, placeholder: 'Your name', autoComplete: 'name',
    }),
    el('div', { class: 'fstep__pair' }, [
      phoneField('q-phone', 'Mobile number', {
        required: true,
        autoComplete: 'tel-national',
        hint: '10 digits, starting 6, 7, 8 or 9.',
      }),
      phoneField('q-whatsapp', 'WhatsApp number', {
        after: checkbox('q-wa-same', 'Same as my mobile number', {
          name: 'whatsappSameAsPhone', checked: true, className: 'mt-2',
        }),
      }),
    ]),
    field('q-email', 'Email address', {
      type: 'email', optional: true, maxLength: 120,
      placeholder: 'you@example.com', autoComplete: 'email',
    }),
    selectField('q-contact-pref', 'How should we reach you first?',
      ['WhatsApp', 'Phone call', 'Email'],
      { name: 'contactPreference', placeholder: 'WhatsApp' }),
  ]);

  /* ---------------------------------------------------------- step 2 */
  const step2 = el('fieldset', { class: 'fstep', 'data-step': '2', hidden: true }, [
    el('legend', { class: 'sr-only', text: 'Moving details' }),
    el('div', { class: 'fstep__pair' }, [
      field('q-from-city', 'Moving from — city', { required: true, maxLength: 60, placeholder: 'e.g. Kanpur', name: 'fromCity' }),
      field('q-to-city', 'Moving to — city', { required: true, maxLength: 60, placeholder: 'e.g. Lucknow', name: 'toCity' }),
    ]),
    el('div', { class: 'fstep__pair' }, [
      field('q-from-area', 'Pickup locality', { maxLength: 80, placeholder: 'Area or colony', name: 'fromLocality' }),
      field('q-from-pin', 'Pickup PIN code', { maxLength: 6, inputMode: 'numeric', placeholder: '208001', name: 'fromPin' }),
    ]),
    el('div', { class: 'fstep__pair' }, [
      field('q-to-area', 'Destination locality', { maxLength: 80, placeholder: 'Area or colony', name: 'toLocality' }),
      field('q-to-pin', 'Destination PIN code', { maxLength: 6, inputMode: 'numeric', placeholder: '226001', name: 'toPin' }),
    ]),
    el('div', { class: 'fstep__pair' }, [
      selectField('q-property', 'Property type',
        ['1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Office', 'Other'],
        { required: true, name: 'propertyType' }),
      el('div', { class: 'field' }, [
        el('label', { for: 'q-date', text: 'Approximate move date' }),
        el('input', { class: 'input', type: 'date', id: 'q-date', name: 'moveDate' }),
        checkbox('q-flexible', 'My date is flexible', { name: 'dateFlexible', className: 'mt-2' }),
      ]),
    ]),
  ]);

  /* ---------------------------------------------------------- step 3 */
  const step3 = el('fieldset', { class: 'fstep', 'data-step': '3', hidden: true }, [
    el('legend', { class: 'field__label mb-3', text: 'Which services do you need?' }),
    el('p', { class: 'field__hint hint-tight', text: 'Choose as many as apply.' }),
    el('div', { class: 'choices' },
      SERVICES.map((value, i) => choice('q-s' + (i + 1), value))),
    el('p', { class: 'field__error', 'data-error-for': 'services' }),
    field('q-other-service', 'Anything else you need?', {
      maxLength: 160, placeholder: 'Optional', name: 'otherService',
    }),
  ]);

  /* ---------------------------------------------------------- step 4 */
  const step4 = el('fieldset', { class: 'fstep', 'data-step': '4', hidden: true }, [
    el('legend', { class: 'sr-only', text: 'Inventory and access' }),
    selectField('q-inventory', 'Roughly how much is moving?', [
      'A few items only', 'Part of a household', 'A full household',
      'A household plus a vehicle', 'Office / commercial inventory',
    ], { name: 'inventorySize' }),
    el('div', { class: 'fstep__pair' }, [
      selectField('q-floor-from', 'Floor at pickup', FLOORS, { name: 'pickupFloor' }),
      selectField('q-floor-to', 'Floor at destination', FLOORS, { name: 'destinationFloor' }),
    ]),
    selectField('q-lift', 'Is there a lift?', [
      'Lift at both addresses', 'Lift at pickup only',
      'Lift at destination only', 'No lift at either address',
    ], { name: 'liftAvailability' }),
    field('q-large', 'Large or fragile items we should know about', {
      maxLength: 200, placeholder: 'e.g. double-door fridge, piano, glass dining table', name: 'largeItems',
    }),
    el('div', { class: 'field' }, [
      el('label', { for: 'q-notes', text: 'Special instructions' }),
      el('textarea', {
        class: 'textarea', id: 'q-notes', name: 'notes', maxlength: 800,
        placeholder: 'Parking restrictions, preferred time of day, anything we should plan for.',
      }),
    ]),
  ]);

  /* ---------------------------------------------------------- step 5 */
  const step5 = el('fieldset', { class: 'fstep', 'data-step': '5', hidden: true }, [
    el('legend', { class: 'field__label mb-4', text: 'Check your details' }),
    el('dl', { class: 'review', 'data-review': '' }),
    el('div', { class: 'field mt-6' }, [
      checkbox('q-consent', SITE_CONFIG.privacy.consentText, { name: 'consent', required: true }),
      el('p', { class: 'field__error', 'data-error-for': 'q-consent' }),
    ]),
    el('div', { class: 'field' }, [
      checkbox('q-marketing', SITE_CONFIG.privacy.marketingConsentText, { name: 'marketingConsent' }),
    ]),
    el('p', { class: 'form-note' }, [
      'We use these details only to prepare and discuss your quote. We do not sell them or pass them to anyone outside the move. See our ',
      el('a', { href: '/privacy.html', text: 'privacy policy' }),
      '.',
    ]),
  ]);

  /* ---------------------------------------------------------- outcomes */
  const successState = el('div', { class: 'form-state form-state--ok', 'data-state': 'success', hidden: true }, [
    el('span', { class: 'form-state__icon' }, [icon('check-circle')]),
    el('h3', { tabindex: '-1', text: 'Thank you — your enquiry is in' }),
    el('p', { class: 'lead text-sm', 'data-success-text': '' }),
    el('a', { class: 'btn btn--wa', 'data-wa-link-lead': '', hidden: true }, [
      icon('whatsapp'), 'Continue on WhatsApp',
    ]),
    el('p', { class: 'form-note', 'data-lead-ref': '' }),
  ]);

  const errorState = el('div', { class: 'form-state form-state--err', 'data-state': 'error', hidden: true }, [
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

  /* ---------------------------------------------------------- the form */
  const form = el('form', { class: 'modal__body', id: 'quoteForm', novalidate: true }, [
    // Bot trap: a real field, moved off-screen by CSS, checked on the server.
    el('div', { class: 'hp', 'aria-hidden': 'true' }, [
      el('label', { for: 'q-website', text: 'Website' }),
      el('input', { type: 'text', id: 'q-website', name: 'website', tabindex: '-1', autocomplete: 'off' }),
    ]),
    el('input', { type: 'hidden', name: 'startedAt', 'data-started-at': '' }),
    step1, step2, step3, step4, step5,
    successState, errorState,
  ]);

  /* ---------------------------------------------------------- chrome */
  const meter = el('div', { class: 'steps-meter', 'aria-hidden': 'true' }, [
    ...[1, 2, 3, 4, 5].map((n) => el('span', { class: 'steps-meter__seg', 'data-meter-seg': String(n) })),
    el('span', { class: 'steps-meter__label', 'data-meter-label': '', text: 'Step 1 of 5' }),
  ]);

  const panel = el('div', { class: 'modal__panel', role: 'document' }, [
    el('div', { class: 'modal__head' }, [
      el('div', { class: 'modal__title-row' }, [
        el('div', {}, [
          el('h2', { id: 'quoteTitle', text: 'Get your free moving estimate' }),
          el('p', { text: 'No obligation. We reply with an itemised written quote.' }),
        ]),
        el('button', {
          class: 'modal__close', type: 'button', 'data-close-quote': '', 'aria-label': 'Close',
        }, [icon('x')]),
      ]),
      meter,
    ]),
    form,
    el('div', { class: 'modal__foot', 'data-modal-foot': '' }, [
      el('button', { class: 'btn btn--ghost', type: 'button', 'data-step-back': '', hidden: true, text: 'Back' }),
      el('button', { class: 'btn btn--primary', type: 'button', 'data-step-next': '', text: 'Continue' }),
      el('button', {
        class: 'btn btn--primary', type: 'submit', form: 'quoteForm',
        'data-step-submit': '', hidden: true, text: 'Send my enquiry',
      }),
    ]),
  ]);

  const modal = el('div', {
    class: 'modal', id: 'quoteModal', role: 'dialog',
    'aria-modal': 'true', 'aria-labelledby': 'quoteTitle', hidden: true,
  }, [
    el('div', { class: 'modal__backdrop', 'data-close-quote': '' }),
    panel,
  ]);

  document.body.append(modal);
  return modal;
}
