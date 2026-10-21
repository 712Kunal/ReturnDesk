const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the server. Check your connection and try again.",
    );
  }

  if (res.status === 204) return null;

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const e = json?.error;
    throw new ApiError(
      res.status,
      e?.code ?? "UNKNOWN",
      e?.message ?? `Request failed (${res.status})`,
      e?.details ?? {},
    );
  }
  return json;
}

export function listRequests(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "")
      qs.set(key, value);
  }
  const suffix = qs.toString();
  return request(`/requests${suffix ? `?${suffix}` : ""}`);
}

export const getRequest = (id) => request(`/requests/${id}`);
export const createRequest = (body) =>
  request("/requests", { method: "POST", body });
export const updateRequest = (id, body) =>
  request(`/requests/${id}`, { method: "PATCH", body });
export const transitionRequest = (id, body) =>
  request(`/requests/${id}/transition`, { method: "POST", body });
export const addNote = (id, body) =>
  request(`/requests/${id}/notes`, { method: "POST", body: { body } });
export const removeRequest = (id) =>
  request(`/requests/${id}`, { method: "DELETE" });
