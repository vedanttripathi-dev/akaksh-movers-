-- ============================================================================
-- 0001_leads.sql  —  Cloudflare D1 schema for quote enquiries
-- ============================================================================
-- Apply with Wrangler:
--
--   wrangler d1 create movers-leads
--   wrangler d1 execute movers-leads --remote --file=./migrations/0001_leads.sql
--
-- Then bind the database in the Pages project:
--   Settings → Functions → D1 database bindings
--   Variable name: DB      Database: movers-leads
--
-- Binding this is optional. functions/api/lead.js writes to D1 when DB is
-- present and to KV when LEADS is present; either one keeps the lead.
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,

  -- The reference shown to the customer, e.g. LD-261011-A3F9C2.
  lead_id           TEXT    NOT NULL UNIQUE,
  created_at        TEXT    NOT NULL,              -- ISO 8601, UTC

  -- Contact
  name              TEXT    NOT NULL,
  phone             TEXT    NOT NULL,
  whatsapp          TEXT,
  email             TEXT,
  contact_preference TEXT,

  -- Route
  from_city         TEXT,
  from_locality     TEXT,
  from_pin          TEXT,
  to_city           TEXT,
  to_locality       TEXT,
  to_pin            TEXT,

  -- The move
  property_type     TEXT,
  move_date         TEXT,                          -- YYYY-MM-DD, or empty
  date_flexible     INTEGER NOT NULL DEFAULT 0,    -- 0 / 1
  services          TEXT,                          -- comma-separated
  other_service     TEXT,
  inventory_size    TEXT,
  pickup_floor      TEXT,
  destination_floor TEXT,
  lift_availability TEXT,
  large_items       TEXT,
  notes             TEXT,

  -- Consent. The enquiry itself cannot be submitted without the contact
  -- consent, so it is implied by the row existing; marketing consent is
  -- separate, optional, and never pre-ticked in the form.
  marketing_consent INTEGER NOT NULL DEFAULT 0,

  -- Provenance. Deliberately NO ip_address column: it is not needed to
  -- service an enquiry, so it is not collected. Rate limiting uses a hash
  -- of the IP in KV with a one-hour expiry and never writes it here.
  source_url        TEXT,
  country           TEXT,
  user_agent        TEXT,

  -- Workflow, for whoever handles the lead.
  status            TEXT    NOT NULL DEFAULT 'new',   -- new | contacted | quoted | won | lost
  handled_by        TEXT,
  internal_notes    TEXT
);

-- Most-recent-first is the default view, so index the sort column.
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);

-- Looking a customer up by the number they called from.
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);

-- Working the queue.
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);


-- ============================================================================
-- DATA RETENTION
-- ============================================================================
-- privacy.html states how long enquiries are kept
-- (SITE_CONFIG.privacy.leadRetentionDays, 365 by default). D1 has no
-- time-to-live, so retention has to be run deliberately. Keep the policy and
-- the practice in step — a published retention period you do not honour is
-- worse than not publishing one.
--
-- Run this periodically (a scheduled Worker, or by hand from the dashboard):
--
--   DELETE FROM leads
--   WHERE created_at < datetime('now', '-365 days')
--     AND status IN ('won', 'lost');
--
-- Deleting only resolved leads avoids destroying an enquiry that is still
-- being worked. If the business needs completed-job records for longer (for
-- tax or dispute reasons), move them to a separate table rather than
-- extending the retention period on personal contact details.
--
-- A customer asking to be deleted:
--
--   DELETE FROM leads WHERE phone = '9876543210';
--
-- Also remove the matching KV entries (keys are lead:LD-...) if LEADS is bound.
-- ============================================================================
