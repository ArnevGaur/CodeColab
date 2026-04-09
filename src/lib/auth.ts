const ACCESS_TOKEN_KEY = "token";
const USER_KEY = "user";

type FetchInput = RequestInfo | URL;

function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setStoredAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function refreshAccessToken() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    clearStoredAuth();
    return null;
  }

  const data = await response.json();
  if (!data.accessToken) {
    clearStoredAuth();
    return null;
  }

  setStoredAccessToken(data.accessToken);
  return data.accessToken as string;
}

export function getAccessTokenPayload() {
  const token = getStoredAccessToken();
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export async function authenticatedFetch(input: FetchInput, init: RequestInit = {}, allowRetry = true) {
  const headers = new Headers(init.headers);
  const token = getStoredAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status !== 401 || !allowRetry) {
    return response;
  }

  const nextToken = await refreshAccessToken();
  if (!nextToken) {
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("Authorization", `Bearer ${nextToken}`);

  return fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: "include",
  });
}
