/* ============================================================================
   CALLBACK FORM BEHAVIOUR
   ============================================================================
   Wires every `[data-callback]` form on the page — the dialog opened by
   `[data-open-callback]` buttons, and the inline card on the homepage —
   with one set of rules. Posts to SITE_CONFIG.web.leadEndpoint.

   Fields are found by NAME within each form, never by a global id, so the
   two forms can sit on the same page without the validator reaching into
   the wrong one.

   HONESTY RULES BUILT INTO THIS FILE
   ----------------------------------
   These are the reason this file is longer than a four-field form needs to
   be, and none of them is optional.

   * The confirmation appears only after the SERVER has said it accepted the
     lead. Not on submit, not on any network response, not on a 200 that
     carries an error body.
   * Opening WhatsApp is never treated as proof a lead was delivered. A
     wa.me link hands the visitor a draft message; whether they press send
     is unknowable from here.
   * If the server reports that it saved the lead but could not deliver the
     WhatsApp notification, the visitor is told the request was received and
     offered a chat link as a second route. We do not claim a notification
     was sent when it was not.
   * If the request fails outright, the visitor gets a clear failure, a retry
     button, and a WhatsApp link already carrying their name and number, so
     the enquiry is not simply lost.

   >>> READ THIS BEFORE WONDERING WHY THE FORM "DOES NOT WORK" <<<
   The site is currently served by GitHub Pages, which runs no server code.
   /api/lead does not exist there and returns 405, so every submission takes
   the failure path above: an honest error and a WhatsApp fallback with the
   details filled in. That is the correct behaviour for a missing backend,
   and it is not a bug in this file. It stops being the behaviour the moment
   the site moves to a host that can run functions/api/lead.js. See
   README.md, "Why the callback form cannot deliver leads yet".

   ACCESSIBILITY
   -------------
   The dialog traps focus, restores it to the trigger on close, and closes on
   Escape. Invalid fields get aria-invalid plus a described-by error message,
   and a failed validation moves focus to the first bad field.
   ========================================================================== */

import { SITE_CONFIG, whatsappHref } from './config.js';
import { el, fill, q, qa } from './dom.js';
import { ensureCallbackModal, buildInlineForm } from './callback-form.js';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Indian mobile numbers are 10 digits and begin 6, 7, 8 or 9. */
const isMobile = (value) => /^[6-9]\d{9}$/.test(value.replace(/\D/g, ''));

const RULES = [
  { name: 'name', test: (v) => v.trim().length >= 2, message: 'Please enter your name.' },
  { name: 'phone', test: isMobile, message: 'Enter a 10-digit mobile number starting 6, 7, 8 or 9.' },
];

/* --------------------------------------------------------------------------
   One form's behaviour
   -------------------------------------------------------------------------- */

function wireForm(form, { onSuccess } = {}) {
  const root = form.closest('.modal') || form;
  const foot = q('[data-modal-foot]', root);
  const fields = q('[data-fields]', form);
  const btnSubmit = q('[data-submit]', root);
  const okState = q('[data-state="success"]', form);
  const errState = q('[data-state="error"]', form);

  let submitting = false;
  let submitted = false;          // duplicate-submission guard

  /** Back to the blank form. Never clears `submitted`: see the submit guard. */
  function reset() {
    fields.hidden = false;
    if (foot) foot.hidden = false;
    okState.hidden = true;
    errState.hidden = true;
  }

  /* ---------------------------------------------------------------- errors */

  function setError(field, message) {
    const wrapper = field.closest('.field') || field.parentElement;
    const slot = q('[data-error-for="' + field.id + '"]', form);

    if (wrapper) wrapper.classList.add('has-error');
    field.setAttribute('aria-invalid', 'true');

    if (slot) {
      fill(slot, [message]);
      if (!slot.id) slot.id = 'err-' + field.id;
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

  function validate() {
    let firstBad = null;

    RULES.forEach((rule) => {
      const field = q('[name="' + rule.name + '"]', form);
      if (!field) return;
      clearError(field);

      const value = field.value || '';
      if (value.trim() === '' || !rule.test(value)) {
        setError(field, rule.message);
        firstBad = firstBad || field;
      }
    });

    // Present only when privacy.requireConsentTick is on.
    const consent = q('[name="consent"]', form);
    if (consent) {
      clearError(consent);
      if (!consent.checked) {
        setError(consent, 'Please confirm we may contact you about this enquiry.');
        firstBad = firstBad || consent;
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
    if (field.matches('input') && field.getAttribute('aria-invalid')) clearError(field);
  });
  form.addEventListener('change', (event) => {
    if (event.target.name === 'consent') clearError(event.target);
  });

  /* ---------------------------------------------------------------- data */

  function collect() {
    const data = new FormData(form);
    const out = {};
    for (const [key, value] of data.entries()) {
      out[key] = typeof value === 'string' ? value.trim() : value;
    }
    const consent = q('[name="consent"]', form);
    // No tick-box means consent was given by the notice line above the
    // button, which the visitor had to pass to reach it.
    out.consent = consent ? Boolean(consent.checked) : true;
    out.pageUrl = window.location.href;
    return out;
  }

  /** The rows the business needs, in the order it wants to read them. */
  function summaryRows(data) {
    return [
      ['Name', data.name],
      ['Mobile', data.phone ? '+91 ' + data.phone : ''],
      ['Moving from', data.movingFrom],
      ['Moving to', data.movingTo],
    ].filter(([, value]) => value && String(value).trim() !== '');
  }

  /** A WhatsApp click-to-chat link carrying the request, correctly encoded. */
  function whatsappFallbackHref(data, reference) {
    const lines = ['Callback request', ''];
    summaryRows(data).forEach(([label, value]) => lines.push(label + ': ' + value));
    lines.push('', 'Sent: ' + new Date().toLocaleString('en-IN'));
    if (reference) lines.push('Reference: ' + reference);
    return whatsappHref(lines.join('\n'));   // does the URL encoding
  }

  /* ---------------------------------------------------------------- states */

  function showState(which, { text, waHref, reference } = {}) {
    fields.hidden = true;
    if (foot) foot.hidden = true;
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
    if (which === 'success' && onSuccess) onSuccess();
  }

  function setSubmitting(on) {
    submitting = on;
    btnSubmit.disabled = on;
    fill(btnSubmit, on
      ? [el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Sending…']
      : ['Request a callback']);
    btnSubmit.setAttribute('aria-busy', String(on));
  }

  /* ---------------------------------------------------------------- submit */

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Duplicate-submission protection: a second click, a double-tap, or a
    // reopen after success must not create a second lead.
    if (submitting || submitted) return;
    if (!validate()) return;

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
      const promise = SITE_CONFIG.callback.promiseResponseTime
        ? ' ' + SITE_CONFIG.callback.responseText
        : '';
      const text = delivered
        ? 'Your request has been received and our team has been notified.' + promise
        : 'Your request has been received and saved.' + promise;

      showState('success', {
        text,
        reference,
        waHref: delivered
          ? whatsappHref('Hi, I just requested a callback. Reference: ' + reference)
          : whatsappFallbackHref(data, reference),
      });
    } catch (error) {
      console.error('[lead-form] submission failed', error);
      showState('error', {
        text: 'We could not send your request just now. Please try again, or send the '
            + 'same details straight to us on WhatsApp so nothing is lost.',
        waHref: whatsappFallbackHref(data, ''),
      });
    } finally {
      setSubmitting(false);
    }
  });

  q('[data-retry]', form)?.addEventListener('click', () => {
    reset();
    q('[name="name"]', form)?.focus();
  });

  return { reset, stamp: () => {
    const started = q('[data-started-at]', form);
    if (started) started.value = String(Date.now());
  } };
}

/* --------------------------------------------------------------------------
   The dialog
   -------------------------------------------------------------------------- */

function wireModal() {
  const modal = ensureCallbackModal();
  const form = q('#callbackForm', modal);
  if (!modal || !form) return null;

  const panel = q('.modal__panel', modal);
  const api = wireForm(form);
  let lastTrigger = null;

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

  function open(trigger) {
    lastTrigger = trigger || null;
    modal.hidden = false;
    document.body.classList.add('is-locked');

    // Stamp the time the form was opened; the server rejects submissions
    // completed impossibly fast.
    api.stamp();
    api.reset();

    // Focus the first control rather than the panel, so a keyboard user can
    // start typing straight away.
    setTimeout(() => (q('[name="name"]', form) || panel).focus(), 40);
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    document.removeEventListener('keydown', onKeydown);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  qa('[data-close-callback]', modal).forEach((button) => {
    button.addEventListener('click', close);
  });

  return { open, close, modal };
}

/* --------------------------------------------------------------------------
   Entry point
   -------------------------------------------------------------------------- */

export function initLeadForm() {
  /* The inline card first, so that a page carrying both has a working form
     in the flow even if nothing is ever clicked. */
  qa('[data-callback-form]').forEach((host, index) => {
    const form = buildInlineForm('cbi' + (index || ''));
    host.append(form);
    const api = wireForm(form);
    api.stamp();
  });

  /* The dialog is only built on pages that have something to open it. */
  const triggers = qa('[data-open-callback]');
  if (!triggers.length) return;

  const dialog = wireModal();
  if (!dialog) return;

  /* The CTAs are anchors pointing at /contact.html, so they still go
     somewhere useful if this script never runs. Here they are upgraded into
     buttons that open the dialog instead — progressive enhancement, so a
     visitor is never left clicking something dead. */
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      dialog.open(trigger);
    });
  });

  /* --- Optional single prompt, off by default in config. --- */
  if (SITE_CONFIG.features.timedQuotePrompt) {
    const KEY = 'callbackPromptDismissed';
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(KEY) === '1'; } catch { /* private mode */ }

    if (!dismissed) {
      setTimeout(() => {
        if (dialog.modal.hidden) {
          dialog.open(null);
          try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
        }
      }, 45000);
    }
  }
}
