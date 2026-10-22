"use client";
import { useState } from "react";
import { RESOLUTIONS } from "@/lib/constants";

const field =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export default function ApproveDialog({ onSubmit, onClose }) {
  const [resolution, setResolution] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fields = error?.details?.fields ?? {};
  const generalError =
    error && Object.keys(fields).length === 0 ? error.message : null;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { status: "Approved", resolution };
    if (resolution === "Refund") payload.refundAmount = Number(amount);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err); // the server's message is shown, not swallowed
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-title"
        className="w-full max-w-md space-y-4 rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 id="approve-title" className="text-lg font-semibold">
          Approve request
        </h2>

        <div>
          <label
            htmlFor="resolution"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Resolution
          </label>
          <select
            id="resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className={field}
          >
            <option value="">Select a resolution…</option>
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {fields.resolution && (
            <p className="mt-1 text-sm text-red-700">
              Resolution {fields.resolution}
            </p>
          )}
        </div>

        {resolution === "Refund" && (
          <div>
            <label
              htmlFor="amount"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Refund amount (₹)
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={field}
            />
            {fields.refundAmount && (
              <p className="mt-1 text-sm text-red-700">
                Refund amount {fields.refundAmount}
              </p>
            )}
          </div>
        )}

        {generalError && (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-800"
          >
            {generalError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "Approving…" : "Approve"}
          </button>
        </div>
      </form>
    </div>
  );
}
