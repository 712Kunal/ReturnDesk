import Link from "next/link";
import StatusBadge from "./StatusBadge.js";
import { formatDate } from "@/lib/format";

export default function RequestTable({ requests }) {
  return (
    <>
      {/* Phones: cards */}
      <ul className="space-y-3 md:hidden">
        {requests.map((r) => (
          <li key={r.id}>
            <Link
              href={`/requests/${r.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {r.reference}
                </span>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {r.customerName}
              </p>
              <p className="text-sm text-slate-600">
                {r.itemName} × {r.quantity} · {r.orderNumber}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {r.reason} · {formatDate(r.createdAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet and up: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Order / Item</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-semibold">
                  <Link
                    href={`/requests/${r.id}`}
                    className="text-slate-900 underline-offset-2 hover:underline"
                  >
                    {r.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {r.customerName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.customerEmail}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-900">{r.orderNumber}</div>
                  <div className="text-xs text-slate-500">
                    {r.itemName} × {r.quantity}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.reason}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDate(r.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
