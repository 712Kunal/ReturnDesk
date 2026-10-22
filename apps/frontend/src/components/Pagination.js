export default function Pagination({ meta, onPage }) {
  const { page, totalPages, total } = meta;
  const btn =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages} · {total}{" "}
        {total === 1 ? "request" : "requests"}
      </p>
      <div className="flex gap-2">
        <button
          className={btn}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          className={btn}
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
