import { pool, withTransaction } from "../db.js";
import { AppError, notFound } from "../utils/errors.js";
import {
  TRANSITIONS,
  EDITABLE_STATUSES,
  REMOVABLE_STATUSES,
} from "../utils/constants.js";
import { COLUMN_FOR } from "../validators/validation.js";

const COLS = `
  id, reference,
  customer_name AS "customerName", customer_email AS "customerEmail",
  customer_phone AS "customerPhone", order_number AS "orderNumber",
  item_name AS "itemName", quantity, reason, status, resolution,
  refund_amount AS "refundAmount",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

// Rule 3: translate the unique-index violation into a clear 409
function rethrowDuplicate(err) {
  if (err.code === "23505" && err.constraint === "one_live_request_per_item") {
    throw new AppError(
      409,
      "DUPLICATE_LIVE_REQUEST",
      "A live request already exists for this item on this order",
    );
  }
  throw err;
}

async function lockRequest(client, id) {
  const { rows } = await client.query(
    `SELECT ${COLS} FROM return_requests WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
    [id],
  );
  if (!rows[0]) throw notFound();
  return rows[0];
}

export async function createRequest(d) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO return_requests
         (customer_name, customer_email, customer_phone, order_number, item_name, quantity, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
      [
        d.customerName,
        d.customerEmail,
        d.customerPhone ?? null,
        d.orderNumber,
        d.itemName,
        d.quantity,
        d.reason,
      ],
    );
    return rows[0];
  } catch (err) {
    rethrowDuplicate(err);
  }
}

export async function listRequests({
  q,
  status,
  reason,
  sortColumn,
  order,
  page,
  pageSize,
}) {
  const where = ["deleted_at IS NULL"];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };

  if (status) add("status = ?", status);
  if (reason) add("reason = ?", reason);
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    add(
      `(customer_name ILIKE ? OR customer_email ILIKE ? OR order_number ILIKE ? OR reference ILIKE ?)`.replaceAll(
        "?",
        "?",
      ),
      like,
    );
  }
  const whereSql = where.join(" AND ");

  const total = (
    await pool.query(
      `SELECT count(*)::int AS n FROM return_requests WHERE ${whereSql}`,
      params,
    )
  ).rows[0].n;

  const { rows } = await pool.query(
    `SELECT ${COLS} FROM return_requests WHERE ${whereSql}
     ORDER BY ${sortColumn} ${order === "asc" ? "ASC" : "DESC"}, id DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    params,
  );

  return {
    data: rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getRequest(id) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM return_requests WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!rows[0]) throw notFound();
  const notes = await pool.query(
    `SELECT id, body, created_at AS "createdAt" FROM request_notes
     WHERE request_id = $1 ORDER BY created_at ASC, id ASC`,
    [id],
  );
  return { ...rows[0], notes: notes.rows };
}

// Rule 4: locked once decided
export async function updateRequest(id, changes) {
  try {
    return await withTransaction(async (client) => {
      const current = await lockRequest(client, id);
      if (!EDITABLE_STATUSES.includes(current.status)) {
        throw new AppError(
          409,
          "REQUEST_LOCKED",
          `A request that is ${current.status} can no longer be edited`,
          { status: current.status },
        );
      }
      const keys = Object.keys(changes);
      const sets = keys.map((k, i) => `${COLUMN_FOR[k]} = $${i + 2}`);
      const { rows } = await client.query(
        `UPDATE return_requests SET ${sets.join(", ")}, updated_at = now()
         WHERE id = $1 RETURNING ${COLS}`,
        [id, ...keys.map((k) => changes[k])],
      );
      return rows[0];
    });
  } catch (err) {
    rethrowDuplicate(err);
  }
}

// Rules 1 and 2: status flow and approval needs a resolution
export async function transitionRequest(
  id,
  { status, resolution, refundAmount },
) {
  return withTransaction(async (client) => {
    const current = await lockRequest(client, id);
    const allowed = TRANSITIONS[current.status];

    if (!allowed.includes(status)) {
      throw new AppError(
        409,
        "INVALID_TRANSITION",
        `Cannot move a request from ${current.status} to ${status}`,
        { from: current.status, to: status, allowed },
      );
    }

    // Completed keeps the resolution recorded at approval; everything else sets it explicitly
    const keep = status === "Completed";
    const { rows } = await client.query(
      `UPDATE return_requests
       SET status = $2,
           resolution = ${keep ? "resolution" : "$3"},
           refund_amount = ${keep ? "refund_amount" : "$4"},
           updated_at = now()
       WHERE id = $1 RETURNING ${COLS}`,
      keep ? [id, status] : [id, status, resolution, refundAmount],
    );
    return rows[0];
  });
}

export async function addNote(requestId, body) {
  const exists = await pool.query(
    "SELECT 1 FROM return_requests WHERE id = $1 AND deleted_at IS NULL",
    [requestId],
  );
  if (!exists.rowCount) throw notFound();
  const { rows } = await pool.query(
    `INSERT INTO request_notes (request_id, body) VALUES ($1, $2)
     RETURNING id, body, created_at AS "createdAt"`,
    [requestId, body],
  );
  return rows[0];
}

// Rule 5: soft delete, only Open or Rejected
export async function removeRequest(id) {
  await withTransaction(async (client) => {
    const current = await lockRequest(client, id);
    if (!REMOVABLE_STATUSES.includes(current.status)) {
      throw new AppError(
        409,
        "NOT_REMOVABLE",
        `Only Open or Rejected requests can be removed; this one is ${current.status}`,
        { status: current.status },
      );
    }
    await client.query(
      "UPDATE return_requests SET deleted_at = now(), updated_at = now() WHERE id = $1",
      [id],
    );
  });
}
