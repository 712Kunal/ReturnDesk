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
export const RESOLUTIONS = ["Refund", "Replacement", "Store Credit"];

export const TRANSITIONS = {
  Open: ["In Review"],
  "In Review": ["Approved", "Rejected"],
  Approved: ["Completed"],
  Rejected: [],
  Completed: [],
};

export const EDITABLE_STATUSES = ["Open", "In Review"]; // rule 4
export const REMOVABLE_STATUSES = ["Open", "Rejected"]; // rule 5
