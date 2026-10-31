const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export async function api(path, options = {}) {
  const token = JSON.parse(localStorage.getItem('pos-session') ?? '{}')?.state?.token;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    const result = contentType.includes('application/json') ? await response.json() : null;
    throw new Error(result?.error?.message ?? 'Permintaan tidak dapat diproses.');
  }
  return contentType.includes('application/json') ? response.json() : response.blob();
}

export const money = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value ?? 0));

export const dateTime = (value) => new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

export function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localDateBoundary(value, endOfDay = false) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day);
  return date.toISOString();
}