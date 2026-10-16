/* ============================================================================
   POST /api/lead  —  Cloudflare Pages Function
   ============================================================================
   Receives a quote enquiry, validates it on the server, stores it, and
   notifies the business on WhatsApp.

   This file runs on Cloudflare's edge, NOT in the browser. It is the only
   place the WhatsApp access token is ever read, and that token comes from an
   environment variable that is never bundled into any client asset.

   ---------------------------------------------------------------------------
   REQUIRED CONFIGURATION  (Cloudflare Pages → Settings → Environment variables)
   ---------------------------------------------------------------------------
   WHATSAPP_PHONE_NUMBER_ID   The sending number's ID from Meta
   WHATSAPP_ACCESS_TOKEN      A permanent System User token — mark as SECRET
   WHATSAPP_RECIPIENT         The business number to notify. Digits with
                              country code, no + and no spaces. e.g. 919876543210

   OPTIONAL
   WHATSAPP_TEMPLATE_NAME     An approved template name. STRONGLY recommended —
                              see "The 24-hour window" below.
   WHATSAPP_TEMPLATE_LANG     Template language code. Default 'en'
   WHATSAPP_API_VERSION       Graph API version. Default 'v21.0'
   ALLOWED_ORIGIN             Exact origin permitted to post. Defaults to the
                              request's own host, which is what you want.

   OPTIONAL BINDINGS
   LEADS                      A KV namespace. Used for the lead record,
                              rate limiting and duplicate suppression.
   DB                         A D1 database. Used for the lead record if
                              present; see migrations/0001_leads.sql.

   ---------------------------------------------------------------------------
   THE 24-HOUR WINDOW — read this before testing
   ---------------------------------------------------------------------------
   The WhatsApp Cloud API does not let a business send a free-form text
   message to someone out of the blue. Plain text only delivers inside a
   24-hour customer-service window opened by that person messaging you first.

   So a plain-text notification to your own business number will work right
   after you have messaged the test number, and then silently stop working a
   day later. That surprises a lot of people in production.

   For a notification that always arrives, create and get approval for a
   message template in Meta Business Manager, then set
   WHATSAPP_TEMPLATE_NAME. A template with six body parameters suits this
   payload; the parameters sent are, in order:

     1. Customer name
     2. Customer phone
     3. Route            e.g. "Kanpur to Lucknow"
     4. Property type
     5. Move date
     6. Lead ID

   Template parameters cannot contain newlines or tabs, which is why the
   full enquiry is stored rather than crammed into the message. The message
   is the alert; the record is the detail.

   ---------------------------------------------------------------------------
   WHAT THIS ENDPOINT WILL NOT DO
   ---------------------------------------------------------------------------
   It never reports success for a lead it could not keep. If no storage is
   bound AND the WhatsApp notification fails, the response is an error, so
   the browser shows the click-to-chat fallback instead of telling the
   customer everything is fine. An enquiry that is silently dropped is worse
   than a visible failure.
   ========================================================================== */

const MAX_BODY_BYTES = 16 * 1024;     // a generous ceiling for this payload
const MIN_FILL_SECONDS = 3;           // faster than this is not a human
const RATE_LIMIT_MAX = 5;             // submissions per window, per IP
const RATE_LIMIT_WINDOW = 3600;       // seconds
const DUPLICATE_WINDOW = 600;         // seconds to suppress an identical resend

/* ==========================================================================
   Helpers
   ========================================================================== */

/** A JSON response with hardened headers and no caching. */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

/**
 * Collapse whitespace, strip control characters, and cap the length.
 *
 * Note on escaping: nothing here produces HTML. The browser renders these
 * values with textContent, and the WhatsApp message is a JSON string field.
 * Control characters are removed because they can forge line structure in
 * the notification message.
 */
function clean(value, maxLength = 200) {
  if (typeof value !== 'string') return '';
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Digits only, capped. */
function digits(value, maxLength = 15) {
  return typeof value === 'string' ? value.replace(/\D/g, '').slice(0, maxLength) : '';
}

const isPhone = (value) => /^[6-9]\d{9}$/.test(value);

/** A short, readable, non-guessable reference. */
function makeLeadId() {
  const now = new Date();
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
  const random = crypto.getRandomValues(new Uint8Array(3));
  const suffix = Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return 'LD-' + stamp + '-' + suffix;
}

/** SHA-256 hex, for rate-limit and duplicate keys (never stored as PII). */
async function hash(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ==========================================================================
   Validation
   ========================================================================== */

/*
 * The payload shrank with the form. The five-step estimate form sent twenty
 * fields; the callback form sends four, two of them optional.
 *
 * Only `name` and `phone` are required, and that is the whole point of the
 * change: the business needs a name and a number to ring back. Everything
 * the old form insisted on — two cities, two PIN codes, property type, at
 * least one service — is now a question for the call.
 *
 * `movingFrom` and `movingTo` are free text, not city names, because the
 * form asks "Moving from" and a visitor answers "Swaroop Nagar" as readily
 * as "Kanpur". They are stored in the from_city / to_city columns, which are
 * nullable and wide enough; renaming the columns would mean a migration for
 * no gain.
 */
function validate(raw) {
  const errors = [];

  const lead = {
    name: clean(raw.name, 80),
    phone: digits(raw.phone, 10),
    movingFrom: clean(raw.movingFrom, 80),
    movingTo: clean(raw.movingTo, 80),

    consent: raw.consent === true,
    pageUrl: clean(raw.pageUrl, 300),
  };

  if (lead.name.length < 2) errors.push('name');
  if (!isPhone(lead.phone)) errors.push('phone');

  // Consent is not a formality: without it we have no basis to contact them.
  if (!lead.consent) errors.push('consent');

  return { lead, errors };
}

/* ==========================================================================
   Storage
   ========================================================================== */

/**
 * Persist the lead. Returns which stores actually accepted it.
 * Never throws: a storage failure must be reported, not hidden.
 */
async function store(env, record) {
  const stored = { d1: false, kv: false };

  if (env.DB) {
    try {
      /* Only the columns the callback form actually fills. The rest of the
         table is left alone: every other column is nullable or has a
         default, so the shorter form needs no migration. The columns the old
         estimate form used are kept rather than dropped, so historical leads
         stay readable. */
      await env.DB.prepare(
        `INSERT INTO leads (
           lead_id, created_at, name, phone,
           from_city, to_city, source_url, country, user_agent
         ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
      ).bind(
        record.leadId, record.createdAt, record.lead.name, record.lead.phone,
        record.lead.movingFrom, record.lead.movingTo, record.lead.pageUrl,
        record.meta.country, record.meta.userAgent
      ).run();
      stored.d1 = true;
    } catch (error) {
      console.error('lead_store_d1_failed', error.message);
    }
  }

  if (env.LEADS) {
    try {
      // Retention is enforced by the KV expiry rather than a cleanup job.
      await env.LEADS.put('lead:' + record.leadId, JSON.stringify(record), {
        expirationTtl: 60 * 60 * 24 * 400,
      });
      stored.kv = true;
    } catch (error) {
      console.error('lead_store_kv_failed', error.message);
    }
  }

  return stored;
}

/* ==========================================================================
   Abuse controls
   ========================================================================== */

/** Per-IP rate limit. Requires the LEADS KV binding; skipped without it. */
async function rateLimited(env, ip) {
  if (!env.LEADS || !ip) return false;
  try {
    const key = 'rl:' + (await hash(ip));
    const count = Number((await env.LEADS.get(key)) || 0);
    if (count >= RATE_LIMIT_MAX) return true;
    await env.LEADS.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
    return false;
  } catch {
    // A failing rate limiter must not block genuine enquiries.
    return false;
  }
}

/**
 * Suppress an identical resubmission — a double-tap, or a retry after a
 * timeout where the first request actually succeeded. Returns the original
 * lead ID when this is a repeat.
 */
async function duplicateOf(env, lead) {
  if (!env.LEADS) return null;
  try {
    const key = 'dup:' + (await hash([lead.phone, lead.movingFrom, lead.movingTo].join('|')));
    const existing = await env.LEADS.get(key);
    if (existing) return existing;
    return key;                        // caller writes the lead ID into it
  } catch {
    return null;
  }
}

/* ==========================================================================
   WhatsApp delivery
   ========================================================================== */

/**
 * Notify the business.
 * Returns { delivered, reason, messageId } and NEVER throws, so a delivery
 * problem cannot take down the endpoint.
 */
async function notifyWhatsApp(env, record) {
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const token = env.WHATSAPP_ACCESS_TOKEN;
  const to = digits(env.WHATSAPP_RECIPIENT || '', 15);

  if (!phoneNumberId || !token || !to) {
    return { delivered: false, reason: 'not_configured' };
  }

  const version = env.WHATSAPP_API_VERSION || 'v21.0';
  const url = 'https://graph.facebook.com/' + version + '/' + phoneNumberId + '/messages';

  const { lead, leadId } = record;
  const route = [lead.movingFrom, lead.movingTo].filter(Boolean).join(' to ') || 'Not stated';

  let payload;

  if (env.WHATSAPP_TEMPLATE_NAME) {
    /* Template parameters must be single-line; clean() has already ensured
       that. SIX parameters, because that is what the template documented in
       .env.example declares — a template is rejected outright if the count
       does not match, so the two the callback form no longer collects are
       sent as "Not stated" rather than dropped. If you create a fresh
       four-parameter template, shorten this list and .env.example together. */
    const params = [
      lead.name,
      '+91 ' + lead.phone,
      route,
      'Not stated',
      'Not stated',
      leadId,
    ].map((text) => ({ type: 'text', text: String(text).slice(0, 180) }));

    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: env.WHATSAPP_TEMPLATE_NAME,
        language: { code: env.WHATSAPP_TEMPLATE_LANG || 'en' },
        components: [{ type: 'body', parameters: params }],
      },
    };
  } else {
    // Plain text. Only delivers inside an open 24-hour window — see the
    // note at the top of this file.
    const lines = [
      'NEW CALLBACK REQUEST',
      '',
      'Customer Name: ' + lead.name,
      'Phone: +91 ' + lead.phone,
      lead.movingFrom ? 'Moving From: ' + lead.movingFrom : null,
      lead.movingTo ? 'Moving To: ' + lead.movingTo : null,
      'Received: ' + record.createdAt,
      'Lead ID: ' + leadId,
    ].filter(Boolean);

    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: false, body: lines.join('\n') },
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Log the API's own error code, never the token or the customer's data.
      console.error('whatsapp_send_failed', response.status, result?.error?.code, result?.error?.message);
      return { delivered: false, reason: 'api_error_' + response.status };
    }

    return { delivered: true, messageId: result?.messages?.[0]?.id || null };
  } catch (error) {
    console.error('whatsapp_send_exception', error.name);
    return { delivered: false, reason: 'network_error' };
  }
}

/* ==========================================================================
   Handler
   ========================================================================== */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    /* --- Same-origin only. There is no CORS header anywhere in this file,
           so a browser on another site cannot read the response, but we
           reject the request outright as well. --- */
    const requestUrl = new URL(request.url);
    const expected = env.ALLOWED_ORIGIN || requestUrl.origin;
    const origin = request.headers.get('Origin');
    if (origin && origin !== expected) {
      return json({ ok: false, message: 'Request origin not allowed.' }, 403);
    }

    /* --- Content type and size. --- */
    if (!(request.headers.get('Content-Type') || '').includes('application/json')) {
      return json({ ok: false, message: 'Expected application/json.' }, 415);
    }
    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BODY_BYTES) {
      return json({ ok: false, message: 'Request too large.' }, 413);
    }

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return json({ ok: false, message: 'Request too large.' }, 413);
    }

    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return json({ ok: false, message: 'Could not read that submission.' }, 400);
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return json({ ok: false, message: 'Could not read that submission.' }, 400);
    }

    /* --- Bot checks. Both respond exactly like a success, so a bot gets no
           signal about which control caught it. Nothing is stored or sent. --- */
    if (clean(raw.website, 50) !== '') {
      return json({ ok: true, leadId: makeLeadId(), whatsappDelivered: false });
    }
    const startedAt = Number(raw.startedAt);
    if (Number.isFinite(startedAt) && startedAt > 0) {
      const seconds = (Date.now() - startedAt) / 1000;
      if (seconds < MIN_FILL_SECONDS) {
        return json({ ok: true, leadId: makeLeadId(), whatsappDelivered: false });
      }
    }

    /* --- Rate limit. --- */
    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (await rateLimited(env, ip)) {
      return json({
        ok: false,
        message: 'That is a lot of enquiries from one connection. Please call or WhatsApp us instead.',
      }, 429);
    }

    /* --- Validate. --- */
    const { lead, errors } = validate(raw);
    if (errors.length) {
      return json({ ok: false, message: 'Some details need checking.', fields: errors }, 422);
    }

    /* --- Duplicate suppression. --- */
    const dupKey = await duplicateOf(env, lead);
    if (dupKey && dupKey.startsWith('LD-')) {
      // An identical enquiry already went through; hand back the first ID
      // rather than creating a second lead.
      return json({ ok: true, leadId: dupKey, whatsappDelivered: true, duplicate: true });
    }

    /* --- Build the record. Note what is NOT kept: no IP address, and the
           user agent only for spam forensics. --- */
    const leadId = makeLeadId();
    const record = {
      leadId,
      createdAt: new Date().toISOString(),
      lead,
      meta: {
        country: request.headers.get('CF-IPCountry') || '',
        userAgent: clean(request.headers.get('User-Agent') || '', 200),
      },
    };

    /* --- Store, then notify. Storage first: if the notification fails we
           still have the enquiry. --- */
    const stored = await store(env, record);
    const delivery = await notifyWhatsApp(env, record);

    if (dupKey && env.LEADS) {
      try {
        await env.LEADS.put(dupKey, leadId, { expirationTtl: DUPLICATE_WINDOW });
      } catch { /* non-fatal */ }
    }

    /* --- The honesty gate ------------------------------------------------
           If nothing kept the lead and nothing delivered it, the enquiry is
           gone. Say so, so the browser can offer the WhatsApp fallback. --- */
    const kept = stored.d1 || stored.kv;
    if (!kept && !delivery.delivered) {
      console.error('lead_unrecoverable', leadId, 'storage=none', 'delivery=' + delivery.reason);
      return json({
        ok: false,
        message: 'We could not record your enquiry. Please send it to us on WhatsApp so it is not lost.',
      }, 502);
    }

    if (!delivery.delivered) {
      // Stored but not notified: a real state, reported as such.
      console.warn('lead_stored_not_notified', leadId, delivery.reason);
    }

    return json({
      ok: true,
      leadId,
      whatsappDelivered: delivery.delivered,
      stored: kept,
    });
  } catch (error) {
    // Never leak a stack trace or an internal message to the client.
    console.error('lead_handler_exception', error?.name, error?.message);
    return json({ ok: false, message: 'Something went wrong on our side. Please try again.' }, 500);
  }
}

/* --------------------------------------------------------------------------
   Other methods.

   Cloudflare Pages dispatches to the method-specific export, so declaring
   these keeps GET and HEAD from returning anything useful to someone probing
   the endpoint. Any method without a handler here gets a 405 from the
   platform automatically.

   There is deliberately no `onRequest` catch-all: it receives every method
   and would need to re-dispatch, which is an easy place to drop the `env`
   bindings by accident.
   -------------------------------------------------------------------------- */

export async function onRequestGet() {
  return json({ ok: false, message: 'Method not allowed.' }, 405);
}

export async function onRequestOptions() {
  // No CORS headers: this endpoint is same-origin only by design.
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
