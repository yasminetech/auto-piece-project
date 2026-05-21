import type { Order, Product, User } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

type RequestOptions = {
  token?: string;
  method?: string;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Une erreur est survenue');
  }

  return payload as T;
}

export function login(email: string, password: string) {
  return request<User>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function register(username: string, password: string, email: string, phone: string) {
  return request<{ message: string }>('/auth/register', {
    method: 'POST',
    body: { username, password, email, phone },
  });
}

export function getProducts(search = '', category = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  const query = params.toString();

  return request<Product[]>(`/products${query ? `?${query}` : ''}`);
}

export function createOrder(token: string, items: { productId: string; quantity: number }[], paymentMethod: string) {
  return request<Order>('/orders', {
    method: 'POST',
    token,
    body: { items, paymentMethod },
  });
}

export function getOrders(token: string) {
  return request<Order[]>('/orders', { token });
}

export function getAllOrders(token: string) {
  return request<(Order & { username: string })[]>('/orders/all', { token });
}

export function getStats(token: string) {
  return request<{
    totalProducts: number;
    outOfStock: number;
    totalOrders: number;
    recentMovements: any[];
  }>('/dashboard/stats', { token });
}

export function getMovements(token: string) {
  return request<any[]>('/stock/movements', { token });
}

export function cancelOrder(token: string, orderId: string) {
  return request<Order>(`/orders/${orderId}/cancel`, {
    method: 'PUT',
    token,
  });
}
