// src/lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface User {
  id: number;
  name: string;
  phone?: string;
  role: string;
  balance?: number;
  is_new_user?: boolean;  // true if 0 orders, false otherwise
}

export interface Order {
  id: number;
  address_details: string;
  time_slot: string;
  status: string;
  created_at: string;
  date: string; // Changed from scheduled_date
  scheduled_date?: string; // Keep for backward compatibility if needed
  comment?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    window.location.href = '/auth/login';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    // CRITICAL FIX: Always check localStorage for token (SSR issue)
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.logout();
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      
      // Handle different error formats
      let errorMessage = 'API request failed';
      
      if (typeof error.detail === 'string') {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        // FastAPI validation errors
        errorMessage = error.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth - ONLY works with real Telegram WebApp initData
  async login(name: string, phone?: string) {
    // Get real Telegram initData
    const initData = typeof window !== 'undefined' 
      ? (window as any).Telegram?.WebApp?.initData || ''
      : '';
    
    if (!initData) {
      throw new Error('Приложение работает только в Telegram');
    }

    const res = await this.request('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({
        init_data: initData,
        name,
        phone,
      }),
    });

    if (res?.access_token) {
      this.setToken(res.access_token);
      return res.user;
    }
    throw new Error('Ошибка авторизации');
  }

  // Users
  async getMe() {
    return this.request('/users/me');
  }

  async getBalance() {
    return this.request('/users/balance');
  }

  async getSubscriptions() {
    return this.request('/users/subscriptions');
  }

  async checkHasTrial(): Promise<{ has_trial: boolean }> {
    return this.request('/users/me/has-trial');
  }

  async getAddresses(): Promise<Array<{
    id: number;
    complex_id?: number;
    complex_name?: string;
    street?: string;
    building: string;
    entrance?: string;
    floor?: string;
    apartment: string;
    intercom?: string;
    is_default: boolean;
  }>> {
    return this.request('/users/addresses');
  }

  async createAddress(data: any) {
    return this.request('/users/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  // NEW: Public complexes for user
  async getResidentialComplexes() {
      return this.request('/users/complexes');
  }

  // Orders
  async getOrders() {
    return this.request('/orders/');
  }

  async createOrder(data: {
    address_id: number; 
    date: string;
    time_slot: string;
    is_urgent?: boolean;
    comment?: string;
    tariff_type?: string;
    tariff_details?: {
      bags_count: number;
      duration?: number;
      frequency?: 'daily' | 'every_other_day' | 'twice_week';
    };
  }) {
    return this.request('/orders/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rescheduleOrder(orderId: number, newDate: string, newTimeSlot: string) {
    return this.request(`/orders/${orderId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({
        new_date: newDate,
        new_time_slot: newTimeSlot
      }),
    });
  }

  async cancelOrder(orderId: number) {
    return this.request(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  // Admin
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getTodayOrders() {
    return this.request('/admin/orders/today');
  }

  async getCouriers() {
    return this.request('/admin/couriers');
  }

  async addCourier(data: { telegram_id: number; name: string }) {
    return this.request('/admin/couriers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCourier(id: number) {
      return this.request(`/admin/couriers/${id}`, { method: 'DELETE' });
  }

  async assignCourier(orderId: number, courierId: number) {
    return this.request(`/admin/orders/${orderId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ courier_id: courierId })
    });
  }

  async cancelOrderAdmin(orderId: number) {
      return this.request(`/admin/orders/${orderId}/cancel`, { method: 'POST' });
  }
  
  // Renamed for clarity
  async getAdminComplexes() {
      return this.request('/admin/complexes');
  }

  async createComplex(name: string, buildings: string[] = []) {
      return this.request('/admin/complexes', {
          method: 'POST',
          body: JSON.stringify({ name, buildings })
      });
  }

  async deleteComplex(id: number) {
      return this.request(`/admin/complexes/${id}`, {
          method: 'DELETE'
      });
  }

  // Clients management
  async getClients() {
      return this.request('/admin/clients');
  }

  async addCreditsToClient(userId: number, amount: number, description?: string) {
      return this.request('/admin/clients/add-credits', {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, amount, description })
      });
  }

  // Tariffs (PUBLIC - no auth required)
  async getPublicTariffs() {
    const response = await fetch(`${API_BASE}/admin/public/tariffs`);
    if (!response.ok) {
      throw new Error('Failed to fetch tariffs');
    }
    return response.json();
  }

  // Payments (YooKassa)
  async createPayment(data: {
    address_id: number;
    date: string;
    time_slot: string;
    is_urgent?: boolean;
    comment?: string;
    tariff_type: string;
    tariff_details?: {
      bags_count: number;
      duration?: number;
      frequency?: 'daily' | 'every_other_day' | 'twice_week';
    };
  }) {
    return this.request('/payments/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Tariffs (ADMIN)
  async getTariffs() {
    return this.request('/admin/tariffs');
  }

  async updateTariff(tariffId: string, data: any) {
    return this.request(`/admin/tariffs/${tariffId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
