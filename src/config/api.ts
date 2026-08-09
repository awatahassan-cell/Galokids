// Single Centralized API Base URL for all requests across the application
export const API_BASE_URL = 'https://galo.prodental.dev/API/api';
export const REMOTE_API_BASE = API_BASE_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  return fetch(url, options);
}
