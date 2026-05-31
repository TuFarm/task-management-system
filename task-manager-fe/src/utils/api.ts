// Central API layer.
//
// 1. Holds the JWT in memory (NOT localStorage) — see AuthContext.
// 2. Installs a global fetch interceptor that, for calls to our backend:
//      - rewrites legacy "/api/..." paths to the versioned "/api/v1/..."
//      - attaches the "Authorization: Bearer <token>" header
//      - routes 401 responses to a logout handler
// 3. Exposes typed helpers (apiGet/apiPost/apiPut/apiDelete/apiUpload/apiDownload).

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/** Rewrites "/api/x" -> "/api/v1/x" (leaving already-versioned paths untouched). */
function versionPath(url: string): string {
  return url.replace(/\/api\/(?!v1\/)/, "/api/v1/");
}

function isBackendUrl(url: string): boolean {
  return url.startsWith(API_BASE_URL) || url.startsWith("/api/");
}

// --- Global fetch interceptor (installed once) ---
const NATIVE_FETCH: typeof fetch = window.fetch.bind(window);
let interceptorInstalled = false;

export function installFetchInterceptor(): void {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (isBackendUrl(url)) {
      const versioned = versionPath(url);
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (authToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${authToken}`);
      }

      const nextInit: RequestInit = { ...init, headers };
      const response =
        input instanceof Request && versioned === url
          ? await NATIVE_FETCH(input, nextInit)
          : await NATIVE_FETCH(versioned, nextInit);

      if (response.status === 401 && !versioned.includes("/auth/login")) {
        if (onUnauthorized) onUnauthorized();
      }
      return response;
    }

    return NATIVE_FETCH(input, init);
  };
}

// --- Typed helpers (preferred for new code) ---

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.message || data.error || message;
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const base = () => `${API_BASE_URL}/api/v1`;

export function apiGet<T>(path: string): Promise<T> {
  return NATIVE_FETCH(`${base()}${path}`, { headers: authHeaders() }).then((r) => handle<T>(r));
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return NATIVE_FETCH(`${base()}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => handle<T>(r));
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return NATIVE_FETCH(`${base()}${path}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => handle<T>(r));
}

export function apiDelete<T = void>(path: string): Promise<T> {
  return NATIVE_FETCH(`${base()}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then((r) => handle<T>(r));
}

export function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return NATIVE_FETCH(`${base()}${path}`, {
    method: "POST",
    headers: authHeaders(), // do NOT set Content-Type; browser adds the multipart boundary
    body: formData,
  }).then((r) => handle<T>(r));
}

export async function apiDownload(path: string): Promise<Blob> {
  const res = await NATIVE_FETCH(`${base()}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(`Download failed (${res.status})`, res.status);
  return res.blob();
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
}

// Install immediately on import so legacy fetch() calls are covered app-wide.
installFetchInterceptor();
