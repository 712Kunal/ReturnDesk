CREATE SEQUENCE IF NOT EXISTS request_ref_seq START 1001;

CREATE TABLE IF NOT EXISTS return_requests (
  id              BIGSERIAL PRIMARY KEY,
  reference       TEXT NOT NULL UNIQUE
                  DEFAULT 'RD-' || lpad(nextval('request_ref_seq')::text, 6, '0'),
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  order_number    TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  reason          TEXT NOT NULL CHECK (reason IN
                  ('Damaged','Wrong Item','Size Issue','Not As Described','Changed Mind')),
  status          TEXT NOT NULL DEFAULT 'Open' CHECK (status IN
                  ('Open','In Review','Approved','Rejected','Completed')),
  resolution      TEXT CHECK (resolution IN ('Refund','Replacement','Store Credit')),
  refund_amount   NUMERIC(10,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT refund_rules CHECK (
    (resolution = 'Refund' AND refund_amount > 0)
    OR (resolution IS DISTINCT FROM 'Refund' AND refund_amount IS NULL)
  ),
  CONSTRAINT approved_needs_resolution CHECK (
    status NOT IN ('Approved','Completed') OR resolution IS NOT NULL
  )
);

-- Rule 3: one live request per order + item
CREATE UNIQUE INDEX IF NOT EXISTS one_live_request_per_item
  ON return_requests (lower(order_number), lower(item_name))
  WHERE status NOT IN ('Rejected','Completed') AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requests_status  ON return_requests (status)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_reason  ON return_requests (reason)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_created ON return_requests (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS request_notes (
  id          BIGSERIAL PRIMARY KEY,
  request_id  BIGINT NOT NULL REFERENCES return_requests(id),
  body        TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_request ON request_notes (request_id, created_at, id);

-- Notes are append-only: block UPDATE and DELETE at the database level
CREATE OR REPLACE FUNCTION forbid_note_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'request_notes rows are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_immutable ON request_notes;
CREATE TRIGGER notes_immutable
  BEFORE UPDATE OR DELETE ON request_notes
  FOR EACH ROW EXECUTE FUNCTION forbid_note_changes();