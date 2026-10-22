"use client";
import { useState } from "react";
import { addNote } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export default function NotesSection({ requestId, notes, onAdded }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addNote(requestId, text);
      setText("");
      await onAdded();
    } catch (err) {
      setError(
        err.details?.fields?.body
          ? `Note ${err.details.fields.body}`
          : err.message,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold">Notes</h2>

      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No notes yet.</p>
      ) : (
        <ol className="mt-4 space-y-4 border-l-2 border-slate-200 pl-4">
          {notes.map((n) => (
            <li key={n.id}>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-900">
                {n.body}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDateTime(n.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={submit} className="mt-5 space-y-2">
        <label htmlFor="note" className="text-sm font-medium text-slate-700">
          Add a note
        </label>
        <textarea
          id="note"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add note"}
        </button>
        <p className="text-xs text-slate-500">
          Notes can't be edited or deleted once added.
        </p>
      </form>
    </section>
  );
}
