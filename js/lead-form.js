/* ============================================================================
   QUOTE FORM — five-step modal
   ============================================================================
   Opens from any `[data-open-quote]` button. Validates each step before
   advancing, reviews the answers, then posts them to the server endpoint at
   SITE_CONFIG.web.leadEndpoint.

   HONESTY RULES BUILT INTO THIS FILE
   ----------------------------------
   * Opening WhatsApp is never treated as proof a lead was delivered. The
     success screen reports what the SERVER said happened, and nothing more.
   * If the server reports that it saved the lead but could not deliver the
     WhatsApp notification, the visitor is told the enquiry was received and
     offered a click-to-chat link as a second route. We do not claim a
     message was sent when it was not.
   * If the request fails outright, the visitor gets a clear failure, a retry
     button, and a WhatsApp link carrying their details so the enquiry is not
     simply lost.

   ACCESSIBILITY
   -------------
   The dialog traps focus, restores it to the trigger on close, closes on
   Escape, and marks invalid fields with aria-invalid plus a described-by
   error message. Validation failures move focus to the first bad field.
   ========================================================================== */

import { SITE_CONFIG, isSet, whatsappHref } from './config.js';
import { el, fill, q, qa } from './dom.js';
import { ensureQuoteModal } from './quote-modal.js';

const TOTAL_STEPS = 5;

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/* --------------------------------------------------------------------------
   Validation
   -------------------------------------------------------------------------- */

const RULES = {
  /** Indian mobile numbers are 10 digits and begin 6, 7, 8 or 9. */
  phone: (value) => /^[6-9]\d{9}$/.test(value.replace(/\D/g, '')),
  pin:   (value) => /^\d{6}$/.test(value.replace(/\D/g, '')),
  email: (value) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value),
};

/** Which fields each step must check, and what to say when they fail. */
const STEP_FIELDS = {
  1: [
    { id: 'q-name',  test: (v) => v.trim().length >= 2, message: 'Please enter your name.' },
    { id: 'q-phone', test: RULES.phone, message: 'Enter a 10-digit mobile number starting 6, 7, 8 or 9.' },
    {
      id: 'q-whatsapp',
      optional: true,
      test: RULES.phone,
      message: 'Enter a 10-digit WhatsApp number, or tick "same as my mobile".',
      skip: () => q('#q-wa-same')?.checked,
    },
    { id: 'q-email', optional: true, test: RULES.email, message: 'That email address does not look right.' },
  ],
  2: [
    { id: 'q-from-city', test: (v) => v.trim().length >= 2, message: 'Which city are you moving from?' },
    { id: 'q-to-city',   test: (v) => v.trim().length >= 2, message: 'Which city are you moving to?' },
    { id: 'q-from-pin',  optional: true, test: RULES.pin, message: 'A PIN code is 6 digits.' },
    { id: 'q-to-pin',    optional: true, test: RULES.pin, message: 'A PIN code is 6 digits.' },
    { id: 'q-property',  test: (v) => v !== '', message: 'Please choose a property type.' },
  ],
  3: [],   // handled separately: at least one service
  4: [],   // every field here is optional
  5: [
    { id: 'q-consent', checkbox: true, message: 'Please confirm we may contact you about this enquiry.' },
  ],
};

export function initLeadForm() {
  // Built here rather than repeated in every page's HTML. See quote-modal.js.
  const modal = ensureQuoteModal();
  const form = q('#quoteForm', modal);
  if (!modal || !form) return;

  const panel  = q('.modal__panel', modal);
  const foot   = q('[data-modal-foot]', modal);
  const btnNext = q('[data-step-next]', modal);
  const btnBack = q('[data-step-back]', modal);
  const btnSubmit = q('[data-step-submit]', modal);
  const metaLabel = q('[data-meter-label]', modal);
  const okState  = q('[data-state="success"]', form);
  const errState = q('[data-state="error"]', form);

  let step = 1;
  let submitting = false;
  let submitted = false;          // duplicate-submission guard
  let lastTrigger = null;

  /* ---------------------------------------------------------------- open/close */

  function open(trigger) {
    lastTrigger = trigger || null;
    modal.hidden = false;
    document.body.classList.add('is-locked');

    // Stamp the time the form was opened; the server rejects submissions
    // completed impossibly fast.
    const started = q('[data-started-at]', form);
    if (started) started.value = String(Date.now());

    goTo(1);
    // Focus the first control rather than the panel, so a keyboard user can
    // start typing straight away.
    setTimeout(() => {
      const first = q('.fstep:not([hidden]) input, .fstep:not([hidden]) select', form);
      (first || panel).focus();
    }, 40);

    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    document.removeEventListener('keydown', onKeydown);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    // Focus trap.
    const items = qa(FOCUSABLE, panel).filter((node) => node.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------------------------------------------------------------- stepping */

  function goTo(next) {
    step = Math.min(Math.max(next, 1), TOTAL_STEPS);

    qa('.fstep', form).forEach((fieldset) => {
      fieldset.hidden = Number(fieldset.dataset.step) !== step;
    });

    if (step === TOTAL_STEPS) renderReview();

    btnBack.hidden = step === 1;
    btnNext.hidden = step === TOTAL_STEPS;
    btnSubmit.hidden = step !== TOTAL_STEPS;

    qa('[data-meter-seg]', modal).forEach((seg) => {
      const index = Number(seg.dataset.meterSeg);
      seg.classList.toggle('is-done', index < step);
      seg.classList.toggle('is-current', index === step);
    });
    if (metaLabel) metaLabel.textContent = 'Step ' + step + ' of ' + TOTAL_STEPS;

    q('.modal__body', modal).scrollTop = 0;
  }

  /* ---------------------------------------------------------------- errors */

  function setError(field, message) {
    const wrapper = field.closest('.field') || field.parentElement;
    const slot = q('[data-error-for="' + field.id + '"]', form)
      || q('[data-error-for="' + field.name + '"]', form);

    if (wrapper) wrapper.classList.add('has-error');
    field.setAttribute('aria-invalid', 'true');

    if (slot) {
      fill(slot, [message]);
      if (!slot.id) slot.id = 'err-' + (field.id || field.name);
      field.setAttribute('aria-describedby', slot.id);
    }
  }

  function clearError(field) {
    const wrapper = field.closest('.field') || field.parentElement;
    if (wrapper) wrapper.classList.remove('has-error');
    field.removeAttribute('aria-invalid');
    const slot = q('[data-error-for="' + field.id + '"]', form);
    if (slot) slot.textContent = '';
  }

  /** Validate the visible step. Returns true when it may advance. */
  function validateStep() {
    let firstBad = null;

    (STEP_FIELDS[step] || []).forEach((rule) => {
      const field = q('#' + rule.id, form);
      if (!field) return;

      clearError(field);

      if (rule.skip && rule.skip()) return;

      if (rule.checkbox) {
        if (!field.checked) {
          setError(field, rule.message);
          firstBad = firstBad || field;
        }
        return;
      }

      const value = field.value || '';
      if (rule.optional && value.trim() === '') return;
      if (!rule.optional && value.trim() === '') {
        setError(field, rule.message);
        firstBad = firstBad || field;
        return;
      }
      if (!rule.test(value)) {
        setError(field, rule.message);
        firstBad = firstBad || field;
      }
    });

    // Step 3: at least one service must be selected.
    if (step === 3) {
      const chosen = qa('input[name="services"]:checked', form);
      const slot = q('[data-error-for="services"]', form);
      if (!chosen.length) {
        if (slot) {
          fill(slot, ['Please choose at least one service.']);
          slot.style.display = 'flex';
        }
        firstBad = firstBad || q('input[name="services"]', form);
      } else if (slot) {
        slot.textContent = '';
        slot.style.display = '';
      }
    }

    if (firstBad) {
      firstBad.focus();
      return false;
    }
    return true;
  }

  // Clear a field's error as soon as the visitor edits it.
  form.addEventListener('input', (event) => {
    const field = event.target;
    if (field.matches('input, select, textarea') && field.getAttribute('aria-invalid')) {
      clearError(field);
    }
  });

  /* ---------------------------------------------------------------- data */

  /** Mirror the mobile number into WhatsApp while "same as" is ticked. */
  function syncWhatsApp() {
    const same = q('#q-wa-same', form);
    const phone = q('#q-phone', form);
    const wa = q('#q-whatsapp', form);
    if (!same || !phone || !wa) return;

    if (same.checked) {
      wa.value = phone.value;
      wa.readOnly = true;
      wa.setAttribute('aria-describedby', 'q-wa-same');
      clearError(wa);
    } else {
      wa.readOnly = false;
    }
  }

  q('#q-wa-same', form)?.addEventListener('change', syncWhatsApp);
  q('#q-phone', form)?.addEventListener('input', syncWhatsApp);


  /** Collect the form into a plain object, trimmed. */
  function collect() {
    const data = new FormData(form);
    const out = {};

    for (const [key, value] of data.entries()) {
      if (key === 'services') continue;         // gathered below
      out[key] = typeof value === 'string' ? value.trim() : value;
    }

    out.services = data.getAll('services');
    out.whatsappSameAsPhone = Boolean(q('#q-wa-same', form)?.checked);
    if (out.whatsappSameAsPhone) out.whatsapp = out.phone;
    out.consent = Boolean(q('#q-consent', form)?.checked);
    out.marketingConsent = Boolean(q('#q-marketing', form)?.checked);
    out.dateFlexible = Boolean(q('#q-flexible', form)?.checked);
    out.pageUrl = window.location.href;

    return out;
  }

  /** The human-readable rows on the review step and in the WhatsApp message. */
  function summaryRows(data) {
    const rows = [
      ['Name', data.name],
      ['Mobile', data.phone ? '+91 ' + data.phone : ''],
      ['WhatsApp', data.whatsapp ? '+91 ' + data.whatsapp : ''],
      ['Email', data.email],
      ['Preferred contact', data.contactPreference],
      ['Moving from', [data.fromLocality, data.fromCity, data.fromPin].filter(Boolean).join(', ')],
      ['Moving to', [data.toLocality, data.toCity, data.toPin].filter(Boolean).join(', ')],
      ['Property type', data.propertyType],
      ['Move date', data.moveDate ? data.moveDate + (data.dateFlexible ? ' (flexible)' : '') : (data.dateFlexible ? 'Flexible' : '')],
      ['Services', (data.services || []).join(', ')],
      ['Other requirements', data.otherService],
      ['Inventory', data.inventorySize],
      ['Pickup floor', data.pickupFloor],
      ['Destination floor', data.destinationFloor],
      ['Lift', data.liftAvailability],
      ['Large / fragile items', data.largeItems],
      ['Notes', data.notes],
    ];
    // Only what the visitor actually filled in.
    return rows.filter(([, value]) => value && String(value).trim() !== '');
  }

  function renderReview() {
    const host = q('[data-review]', form);
    if (!host) return;
    const rows = summaryRows(collect());

    fill(host, rows.map(([label, value]) =>
      el('div', { class: 'review__row' }, [
        el('dt', { text: label }),
        el('dd', { text: String(value) }),
      ])
    ));
  }

  /* ---------------------------------------------------------------- submit */

  /** A WhatsApp click-to-chat link carrying the enquiry, correctly encoded. */
  function whatsappFallbackHref(data, reference) {
    const lines = ['New moving enquiry', ''];
    summaryRows(data).forEach(([label, value]) => lines.push(label + ': ' + value));
    if (reference) lines.push('', 'Reference: ' + reference);
    // whatsappHref() does the URL encoding.
    return whatsappHref(lines.join('\n'));
  }

  function showState(which, { text, waHref, reference } = {}) {
    qa('.fstep', form).forEach((fieldset) => { fieldset.hidden = true; });
    foot.hidden = which !== null;
    okState.hidden = which !== 'success';
    errState.hidden = which !== 'error';

    const host = which === 'success' ? okState : errState;
    const textSlot = q(which === 'success' ? '[data-success-text]' : '[data-error-text]', host);
    if (textSlot && text) textSlot.textContent = text;

    qa('[data-wa-link-lead]', host).forEach((link) => {
      if (waHref) {
        link.href = waHref;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.hidden = false;
      } else {
        link.hidden = true;
      }
    });

    const refSlot = q('[data-lead-ref]', host);
    if (refSlot) refSlot.textContent = reference ? 'Your reference: ' + reference : '';

    host.querySelector('h3')?.focus?.();
  }

  function setSubmitting(on) {
    submitting = on;
    btnSubmit.disabled = on;
    fill(btnSubmit, on
      ? [el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Sending…']
      : ['Send my enquiry']);
    btnSubmit.setAttribute('aria-busy', String(on));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Duplicate-submission protection: a second click, a double-tap, or a
    // retry after success must not create a second lead.
    if (submitting || submitted) return;
    if (!validateStep()) return;

    const data = collect();
    setSubmitting(true);

    try {
      const response = await fetch(SITE_CONFIG.web.leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });

      // A non-JSON body (an HTML error page, say) must not throw an
      // unhelpful parse error at the visitor.
      let result = {};
      try { result = await response.json(); } catch { result = {}; }

      if (!response.ok || result.ok !== true) {
        throw new Error(result.message || ('The server replied ' + response.status + '.'));
      }

      submitted = true;
      const reference = result.leadId || '';

      // Report what actually happened, not what we hoped happened.
      const delivered = result.whatsappDelivered === true;
      const text = delivered
        ? 'We have your enquiry and our team has been notified. Expect a call or WhatsApp message shortly.'
        : 'We have your enquiry and it is saved. Our team will be in touch shortly — you can also message us directly on WhatsApp to speed things up.';

      showState('success', {
        text,
        reference,
        waHref: delivered ? whatsappHref('Hi, I just submitted an enquiry. Reference: ' + reference)
                          : whatsappFallbackHref(data, reference),
      });
    } catch (error) {
      console.error('[lead-form] submission failed', error);
      showState('error', {
        text: 'We could not send your enquiry just now. Please try again, or send the same details straight to us on WhatsApp so nothing is lost.',
        waHref: whatsappFallbackHref(data, ''),
      });
    } finally {
      setSubmitting(false);
    }
  });

  q('[data-retry]', form)?.addEventListener('click', () => {
    errState.hidden = true;
    foot.hidden = false;
    goTo(TOTAL_STEPS);
  });

  /* ---------------------------------------------------------------- wiring */

  btnNext.addEventListener('click', () => { if (validateStep()) goTo(step + 1); });
  btnBack.addEventListener('click', () => goTo(step - 1));

  /* The CTAs are anchors pointing at /contact.html, so they still go
     somewhere useful if this script never runs. Here they are upgraded into
     buttons that open the dialog instead — progressive enhancement, so a
     visitor is never left clicking something dead. */
  qa('[data-open-quote]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      open(trigger);
    });
  });
  qa('[data-close-quote]', modal).forEach((button) => {
    button.addEventListener('click', close);
  });

  // Enter advances a step rather than submitting early.
  form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (event.target.matches('textarea')) return;
    if (step < TOTAL_STEPS) {
      event.preventDefault();
      if (validateStep()) goTo(step + 1);
    }
  });

  syncWhatsApp();

  /* --- Optional single prompt, off by default in config. --- */
  if (SITE_CONFIG.features.timedQuotePrompt) {
    const KEY = 'quotePromptDismissed';
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(KEY) === '1'; } catch { /* private mode */ }

    if (!dismissed) {
      setTimeout(() => {
        if (modal.hidden && !submitted) {
          open(null);
          try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
        }
      }, 45000);
    }
  }
}
