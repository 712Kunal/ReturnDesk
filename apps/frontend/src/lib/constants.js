export const STATUSES = [
  "Open",
  "In Review",
  "Approved",
  "Rejected",
  "Completed",
];
export const REASONS = [
  "Damaged",
  "Wrong Item",
  "Size Issue",
  "Not As Described",
  "Changed Mind",
];

export const SORT_OPTIONS = [
  { value: "createdAt", label: "Date created" },
  { value: "reference", label: "Reference" },
  { value: "customer", label: "Customer" },
  { value: "order", label: "Order" },
  { value: "status", label: "Status" },
  { value: "reason", label: "Reason" },
];

export const RESOLUTIONS = ["Refund", "Replacement", "Store Credit"];

// Full class names (not built dynamically) so Tailwind can detect them
export const STATUS_STYLES = {
  Open: {
    badge: "bg-blue-50 text-blue-700 ring-blue-600/20",
    dot: "bg-blue-500",
  },
  "In Review": {
    badge: "bg-amber-50 text-amber-800 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  Approved: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  Rejected: {
    badge: "bg-red-50 text-red-700 ring-red-600/20",
    dot: "bg-red-500",
  },
  Completed: {
    badge: "bg-slate-100 text-slate-700 ring-slate-500/20",
    dot: "bg-slate-500",
  },
};
