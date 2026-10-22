"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getRequest, transitionRequest, removeRequest } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import NotesSection from "./NotesSection";
import ApproveDialog from "./ApproveDialog";

const ACTION_LABELS = {
  "In Review": "Start review",
  Approved: "Approve…",
  Rejected: "Reject",
  Completed: "Mark completed",
};

const buttonStyle = (status) =>
  status === "Rejected"
    ? "bg-red-700 text-white hover:bg-red-800"
    : "bg-slate-900 text-white hover:bg-slate-700";

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-slate-900">
        {children || "—"}
      </dd>
    </div>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [state, setState] = useState({
    phase: "loading",
    request: null,
    error: null,
  });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getRequest(id);
      setState({ phase: "ready", request: res.data, error: null });
    } catch (err) {
      setState({ phase: "error", request: null, error: err });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs a server action. On a refusal, show the server's reason and refresh so the buttons match reality.
  async function runAction(fn) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err);
    } finally {
      await load();
      setBusy(false);
    }
  }

  const changeStatus = (status) =>
    runAction(() => transitionRequest(id, { status }));

  async function approve(payload) {
    await transitionRequest(id, payload); // errors go back to the dialog
    setApproving(false);
    await load();
  }

  function remove() {
    if (
      !window.confirm(
        "Remove this request from the desk? The record is kept in the database.",
      )
    )
      return;
    runAction(async () => {
      await removeRequest(id);
      router.push("/");
    });
  }

  const { phase, request, error } = state;

  if (phase === "loading") {
    return (
      <div
        className="h-64 animate-pulse rounded-lg bg-slate-200"
        aria-busy="true"
        aria-label="Loading request"
      />
    );
  }

  if (phase === "error") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <p className="font-medium text-red-800">
          {error.status === 404
            ? "Request not found"
            : "Could not load request"}
        </p>
        <p className="mt-1 text-sm text-red-700">{error.message}</p>
        <div className="mt-3 flex gap-2">
          {error.status !== 404 && (
            <button
              onClick={load}
              className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Try again
            </button>
          )}
          <Link
            href="/"
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const { actions } = request;
  const hasActions = actions.transitions.length > 0 || actions.canRemove;

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← All requests
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-xl font-semibold">{request.reference}</h1>
        <StatusBadge status={request.status} />
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="font-medium text-red-800">That action was refused</p>
          <p className="mt-1 text-sm text-red-700">{actionError.message}</p>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-semibold">Actions</h2>
        {hasActions ? (
          <div className="flex flex-wrap gap-2">
            {actions.transitions.map((status) => (
              <button
                key={status}
                disabled={busy}
                onClick={() =>
                  status === "Approved"
                    ? setApproving(true)
                    : changeStatus(status)
                }
                className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${buttonStyle(status)}`}
              >
                {ACTION_LABELS[status]}
              </button>
            ))}
            {actions.canRemove && (
              <button
                disabled={busy}
                onClick={remove}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Remove from desk
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            This request is {request.status} and is final. No further actions
            are available.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-semibold">Details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Customer">{request.customerName}</Detail>
          <Detail label="Email">{request.customerEmail}</Detail>
          <Detail label="Phone">{request.customerPhone}</Detail>
          <Detail label="Order">{request.orderNumber}</Detail>
          <Detail label="Item">{request.itemName}</Detail>
          <Detail label="Quantity">{request.quantity}</Detail>
          <Detail label="Reason">{request.reason}</Detail>
          <Detail label="Created">{formatDateTime(request.createdAt)}</Detail>
          {request.resolution && (
            <Detail label="Resolution">{request.resolution}</Detail>
          )}
          {request.refundAmount != null && (
            <Detail label="Refund amount">
              {formatMoney(request.refundAmount)}
            </Detail>
          )}
        </dl>
      </section>

      <NotesSection requestId={id} notes={request.notes} onAdded={load} />

      {approving && (
        <ApproveDialog onSubmit={approve} onClose={() => setApproving(false)} />
      )}
    </div>
  );
}
