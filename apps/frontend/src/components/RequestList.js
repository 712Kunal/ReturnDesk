"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listRequests } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import RequestFilters from "./RequestFilters";
import RequestTable from "./RequestTable";
import Pagination from "./Pagination";

export default function RequestList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const reason = searchParams.get("reason") ?? "";
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") ?? "desc";
  const page = Number(searchParams.get("page") ?? 1);

  const [result, setResult] = useState({
    phase: "loading",
    data: null,
    meta: null,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  // Write changes into the URL. Any change except a page change resets to page 1.
  const updateParams = useCallback(
    (changes) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!("page" in changes)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `/?${qs}` : "/");
    },
    [router, searchParams],
  );

  // Debounced search: the box updates instantly, the URL (and the API call) 400ms after typing stops
  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebounce(search, 400);
  useEffect(() => {
    if (debouncedSearch.trim() !== q)
      updateParams({ q: debouncedSearch.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Fetch from the server whenever the URL's query string changes
  const queryString = searchParams.toString();
  useEffect(() => {
    let cancelled = false; // ignore responses that arrive after a newer request started
    setResult((prev) => ({ ...prev, phase: "loading" }));

    listRequests(Object.fromEntries(new URLSearchParams(queryString)))
      .then((res) => {
        if (!cancelled)
          setResult({
            phase: "ready",
            data: res.data,
            meta: res.meta,
            error: null,
          });
      })
      .catch((err) => {
        if (!cancelled)
          setResult((prev) => ({ ...prev, phase: "error", error: err }));
      });

    return () => {
      cancelled = true;
    };
  }, [queryString, reloadKey]);

  const hasFilters = Boolean(q || status || reason);
  const clearAll = () => {
    setSearch("");
    router.replace("/");
  };

  const { phase, data, meta, error } = result;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Return requests</h1>

      <RequestFilters
        search={search}
        onSearch={setSearch}
        status={status}
        reason={reason}
        sort={sort}
        order={order}
        onChange={updateParams}
        onClear={clearAll}
        hasFilters={hasFilters}
      />

      {phase === "error" && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="font-medium text-red-800">Could not load requests</p>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {phase === "loading" && !data && (
        <ul
          className="space-y-3"
          aria-busy="true"
          aria-label="Loading requests"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className="h-16 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </ul>
      )}

      {data &&
        phase !== "error" &&
        (data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-medium text-slate-900">
              {hasFilters
                ? "No requests match your search"
                : page > 1
                  ? "No requests on this page"
                  : "No return requests yet"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {hasFilters
                ? "Try a different search term or remove some filters."
                : "New requests will appear here."}
            </p>
            {(hasFilters || page > 1) && (
              <button
                onClick={clearAll}
                className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                {hasFilters ? "Clear search and filters" : "Go to first page"}
              </button>
            )}
          </div>
        ) : (
          <div
            className={
              phase === "loading"
                ? "opacity-60 transition-opacity"
                : "transition-opacity"
            }
          >
            <RequestTable requests={data} />
            <Pagination
              meta={meta}
              onPage={(p) => updateParams({ page: String(p) })}
            />
          </div>
        ))}
    </div>
  );
}
