/* ============================================================================
   GET /api/reviews  —  Google Business Profile reviews, fetched server-side
   ============================================================================

   WHY THIS RUNS ON THE SERVER
   ---------------------------
   A Places API key is a billable credential. Anything in js/ is downloaded by
   every visitor, so a key placed there is public within minutes and someone
   else's traffic lands on the client's bill. The key lives in a Cloudflare
   environment variable and is read only here.

   WHAT IT RETURNS
   ---------------
     { ok: true, configured: true, rating, total, reviews: [...] }
     { ok: true, configured: false, reason }   when no key is set
     { ok: false, reason }                     when Google refused

   `configured: false` is a normal, successful response, not an error. The
   browser treats it as "nothing to show" and leaves the section hidden. It
   NEVER substitutes placeholder reviews — that is the whole point.

   LIMITS YOU SHOULD KNOW BEFORE PROMISING ANYTHING
   ------------------------------------------------
   1. The Places API returns AT MOST FIVE reviews per place. Not forty-six,
      not "all of them". Five. If the business wants more on the page, the
      only compliant route is to paste the text in manually with the owner's
      agreement — see `testimonials.verified` in js/config.js.

   2. Google's Places API terms restrict how long its content may be stored.
      Place IDs may be kept indefinitely; review content may not be cached
      long-term. This route caches for a few hours only — long enough to keep
      the bill and the latency down, short enough to stay inside the terms.
      Do not raise CACHE_SECONDS to "save quota" without reading the terms.

   3. Reviews must be shown as Google returns them: the reviewer's own name
      and words, unedited. Filtering to the better ones is allowed and is what
      `MIN_RATING` does, but then the page must not present the result as the
      business's overall rating. js/reviews.js handles that distinction.

   4. This endpoint is public. It exposes only what the Business Profile
      already shows publicly, so there is nothing to protect — but it is rate
      limited anyway so it cannot be used to burn through the API quota.

   REQUIRED CONFIGURATION
   ----------------------
     GOOGLE_PLACES_API_KEY   a key with "Places API (New)" enabled
     GOOGLE_PLACE_ID         the profile's place ID

   Both are set in Cloudflare → Settings → Environment variables, as secrets.
   See .env.example and README.md § Google reviews.
   ========================================================================== */

/** Only reviews at or above this rating are returned. */
const MIN_RATING = 4;

/** How long a successful response may be reused. See note 2 above. */
const CACHE_SECONDS = 60 * 60 * 6;   // 6 hours

/** Simple per-IP throttle, so the API quota cannot be drained from outside. */
const RATE_LIMIT = 30;               // requests
const RATE_WINDOW = 60 * 10;         // per 10 minutes

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=1800',
  'X-Content-Type-Options': 'nosniff',
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

/** Trim to a sane length without cutting a word in half. */
function clean(value, max = 1500) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max).replace(/\s\S*$/, '') + '…' : text;
}

export async function onRequestGet(context) {
  const { env, request } = context;

  const apiKey = env.GOOGLE_PLACES_API_KEY;
  const placeId = env.GOOGLE_PLACE_ID;

  /* Unconfigured is not a failure. Say so plainly and return nothing, so the
     page hides its reviews section rather than inventing content for it. */
  if (!apiKey || !placeId) {
    return json({
      ok: true,
      configured: false,
      reason: 'GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID are not set.',
      reviews: [],
    });
  }

  // --- Rate limit, when a KV namespace is bound. -------------------------
  if (env.RATE_LIMIT_KV) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `reviews:${ip}`;
    try {
      const used = parseInt((await env.RATE_LIMIT_KV.get(key)) || '0', 10);
      if (used >= RATE_LIMIT) {
        return json({ ok: false, reason: 'Too many requests.' }, 429);
      }
      await env.RATE_LIMIT_KV.put(key, String(used + 1), { expirationTtl: RATE_WINDOW });
    } catch {
      // A rate-limiter that is down must not take the endpoint down with it.
    }
  }

  // --- Serve from the edge cache when we can. ----------------------------
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/reviews', request.url).toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // --- Ask Google. -------------------------------------------------------
  // Places API (New). `fields` is required and is billed by what you request,
  // so this asks for exactly the three things the page uses.
  let payload;
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
        },
      }
    );

    if (!response.ok) {
      // Google's error body can contain the key in an echoed request URL, so
      // only the status is surfaced and nothing is logged verbatim.
      return json(
        { ok: false, reason: `Places API returned ${response.status}.`, reviews: [] },
        502
      );
    }

    payload = await response.json();
  } catch {
    return json({ ok: false, reason: 'Could not reach the Places API.', reviews: [] }, 502);
  }

  /* Google caps this at five reviews per place. Filtering to the better ones
     is a presentation choice; the overall rating below is NOT recalculated
     from them, it is the real figure for every review on the profile. */
  const reviews = (payload.reviews || [])
    .filter((r) => typeof r.rating === 'number' && r.rating >= MIN_RATING)
    .map((r) => ({
      name: clean(r.authorAttribution?.displayName, 80),
      rating: r.rating,
      text: clean(r.originalText?.text || r.text?.text),
      date: typeof r.publishTime === 'string' ? r.publishTime.slice(0, 10) : null,
      url: r.googleMapsUri || r.authorAttribution?.uri || null,
      // Google requires the reviewer's photo to be shown as supplied, if shown
      // at all. Passed through untouched; the page may ignore it.
      photo: r.authorAttribution?.photoUri || null,
    }))
    .filter((r) => r.name && r.text);

  const body = {
    ok: true,
    configured: true,
    // The profile's real overall figures, across every review.
    rating: typeof payload.rating === 'number' ? payload.rating : null,
    total: typeof payload.userRatingCount === 'number' ? payload.userRatingCount : null,
    profileUrl: payload.googleMapsUri || null,
    reviews,
  };

  const response = json(body, 200, {
    'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
  });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/** Anything other than GET is not meaningful here. */
export async function onRequestPost() {
  return json({ ok: false, reason: 'Method not allowed.' }, 405, { Allow: 'GET' });
}
