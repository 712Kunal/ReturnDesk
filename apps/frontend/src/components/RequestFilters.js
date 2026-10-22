import { STATUSES, REASONS, SORT_OPTIONS } from "@/lib/constants";

const field =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export default function RequestFilters({
  search,
  onSearch,
  status,
  reason,
  sort,
  order,
  onChange,
  onClear,
  hasFilters,
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="search" className="sr-only">
          Search requests
        </label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by customer, email, order or reference"
          className={field}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => onChange({ status: e.target.value })}
          className={field}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by reason"
          value={reason}
          onChange={(e) => onChange({ reason: e.target.value })}
          className={field}
        >
          <option value="">All reasons</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort by"
          value={sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className={field}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onChange({ order: order === "asc" ? "desc" : "asc" })}
          className={`${field} text-left hover:bg-slate-50`}
        >
          {order === "asc" ? "↑ Ascending" : "↓ Descending"}
        </button>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-slate-600 underline hover:text-slate-900"
        >
          Clear search and filters
        </button>
      )}
    </div>
  );
}
