import { AppError, validationError } from "../utils/errors.js";
import { REASONS, RESOLUTIONS, STATUSES } from "../utils/constants.js";

const text = (max) => (v) =>
  typeof v !== "string"
    ? "must be a string"
    : v.trim().length > max
      ? `must be at most ${max} characters`
      : null;

const RULES = {
  customerName: {
    column: "customer_name",
    check: text(120),
    normalize: (v) => v.trim(),
  },
  customerEmail: {
    column: "customer_email",
    normalize: (v) => v.trim().toLowerCase(),
    check: (v) =>
      typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
        ? null
        : "must be a valid email",
  },
  customerPhone: {
    column: "customer_phone",
    optional: true,
    check: text(30),
    normalize: (v) => v.trim(),
  },
  orderNumber: {
    column: "order_number",
    check: text(60),
    normalize: (v) => v.trim(),
  },
  itemName: {
    column: "item_name",
    check: text(200),
    normalize: (v) => v.trim(),
  },
  quantity: {
    column: "quantity",
    check: (v) =>
      Number.isInteger(v) && v > 0 && v <= 1000
        ? null
        : "must be a whole number between 1 and 1000",
  },
  reason: {
    column: "reason",
    check: (v) =>
      REASONS.includes(v) ? null : `must be one of: ${REASONS.join(", ")}`,
  },
};

export const COLUMN_FOR = Object.fromEntries(
  Object.entries(RULES).map(([k, r]) => [k, r.column]),
);

function assertObject(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(
      400,
      "INVALID_BODY",
      "Request body must be a JSON object",
    );
  }
}

export function validateDetails(body, { partial }) {
  assertObject(body);
  const clean = {};
  const fields = {};

  for (const [key, rule] of Object.entries(RULES)) {
    const raw = body[key];
    const missing = raw === undefined || raw === null || raw === "";

    if (raw === undefined && partial) continue;
    if (missing) {
      if (rule.optional) clean[key] = null;
      else fields[key] = "is required";
      continue;
    }
    const problem = rule.check(raw);
    if (problem) fields[key] = problem;
    else clean[key] = rule.normalize ? rule.normalize(raw) : raw;
  }

  if (
    partial &&
    Object.keys(clean).length === 0 &&
    Object.keys(fields).length === 0
  ) {
    fields._ = "provide at least one field to update";
  }
  if (Object.keys(fields).length) throw validationError(fields);
  return clean;
}

export function validateNote(body) {
  assertObject(body);
  const note = typeof body.body === "string" ? body.body.trim() : "";
  if (!note) throw validationError({ body: "is required" });
  if (note.length > 2000)
    throw validationError({ body: "must be at most 2000 characters" });
  return note;
}

// Shape-only checks for a transition request; "is it legal right now?" lives in the service
export function validateTransition(body) {
  assertObject(body);
  const { status, resolution, refundAmount } = body;
  const fields = {};

  if (!STATUSES.includes(status))
    fields.status = `must be one of: ${STATUSES.join(", ")}`;

  if (status === "Approved") {
    if (!RESOLUTIONS.includes(resolution)) {
      fields.resolution = `is required to approve; one of: ${RESOLUTIONS.join(", ")}`;
    } else if (resolution === "Refund") {
      if (
        typeof refundAmount !== "number" ||
        !Number.isFinite(refundAmount) ||
        refundAmount <= 0
      ) {
        fields.refundAmount = "must be a number greater than zero for a Refund";
      }
    } else if (refundAmount !== undefined && refundAmount !== null) {
      fields.refundAmount = "must not be set unless the resolution is Refund";
    }
  } else if (STATUSES.includes(status)) {
    if (resolution != null)
      fields.resolution = "can only be set when approving";
    if (refundAmount != null)
      fields.refundAmount = "can only be set when approving";
  }

  if (Object.keys(fields).length) throw validationError(fields);
  return {
    status,
    resolution: status === "Approved" ? resolution : null,
    refundAmount:
      status === "Approved" && resolution === "Refund"
        ? Math.round(refundAmount * 100) / 100
        : null,
  };
}

const SORT_COLUMNS = {
  createdAt: "created_at",
  reference: "reference",
  customer: "customer_name",
  order: "order_number",
  status: "status",
  reason: "reason",
};

export function validateListQuery(query) {
  const fields = {};
  const { q, status, reason } = query;
  const sort = query.sort ?? "createdAt";
  const order = query.order ?? "desc";
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? 10 : Number(query.pageSize);

  if (status && !STATUSES.includes(status))
    fields.status = `must be one of: ${STATUSES.join(", ")}`;
  if (reason && !REASONS.includes(reason))
    fields.reason = `must be one of: ${REASONS.join(", ")}`;
  if (!SORT_COLUMNS[sort])
    fields.sort = `must be one of: ${Object.keys(SORT_COLUMNS).join(", ")}`;
  if (!["asc", "desc"].includes(order)) fields.order = "must be asc or desc";
  if (!Number.isInteger(page) || page < 1)
    fields.page = "must be a whole number >= 1";
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
    fields.pageSize = "must be a whole number from 1 to 100";

  if (Object.keys(fields).length) throw validationError(fields);
  return {
    q: typeof q === "string" ? q.trim() : "",
    status,
    reason,
    sortColumn: SORT_COLUMNS[sort],
    order,
    page,
    pageSize,
  };
}
