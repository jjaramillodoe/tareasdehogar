const API_BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

/** Resolve relative /uploads/... paths against the backend host. */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  if (!API_BASE) return value;
  return `${API_BASE}${value.startsWith('/') ? value : `/${value}`}`;
}
