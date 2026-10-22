export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
export const formatMoney = (n) => inr.format(n);
