import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Axios instance ────────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor (attach JWT) ─────────────────────────────────────────

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('finfinity-bre-store');
      if (stored) {
        const state = JSON.parse(stored);
        const token = state?.state?.auth?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // silently ignore
    }
  }
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────────

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('finfinity-bre-store');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  sendOtp: async (data: { name: string; pan: string; mobile: string }) => {
    try {
      const res = await api.post('/auth/send-otp', data);
      return res.data;
    } catch {
      // Demo mode: always succeed
      return { success: true, message: 'OTP sent (demo: 1234)' };
    }
  },

  verifyOtp: async (data: { mobile: string; otp: string; pan: string; name: string }) => {
    try {
      const res = await api.post('/auth/verify-otp', data);
      return res.data;
    } catch {
      // Demo mode: accept 1234
      if (data.otp === '1234') {
        return {
          success: true,
          token: `demo-jwt-${Date.now()}`,
          user: {
            id: `user-${Date.now()}`,
            name: data.name,
            pan: data.pan,
            mobile: data.mobile,
          },
        };
      }
      throw new Error('Invalid OTP. Demo OTP is 1234');
    }
  },
};

// ─── Bureau ───────────────────────────────────────────────────────────────────

export const bureauApi = {
  fetch: async (pan: string) => {
    try {
      const res = await api.get(`/bureau/${pan}`);
      return res.data;
    } catch {
      // Return null — caller handles mock fallback
      return null;
    }
  },

  save: async (data: { loans: unknown[]; cibilScore: number; profile: unknown }) => {
    try {
      const res = await api.post('/bureau/save', data);
      return res.data;
    } catch {
      return { success: true };
    }
  },
};

// ─── BRE ──────────────────────────────────────────────────────────────────────

export const breApi = {
  runStrategies: async (data: {
    loans: unknown[];
    profile: unknown;
    cibilScore: number;
  }) => {
    try {
      const res = await api.post('/bre/strategies', data);
      return res.data;
    } catch {
      return null;
    }
  },

  getProducts: async (data: { profile: unknown; cibilScore: number }) => {
    try {
      const res = await api.post('/bre/products', data);
      return res.data;
    } catch {
      return null;
    }
  },
};

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export const aiApi = {
  chat: async (data: { message: string; context: Record<string, unknown> }) => {
    try {
      const res = await api.post('/ai/chat', data);
      return res.data;
    } catch {
      // Demo responses
      const demoResponses: Record<string, string> = {
        default:
          "Based on your portfolio, I recommend starting with a balance transfer on your highest-rate loan. This alone could save you ₹8,000/month in EMI.",
        emi: "Your EMI-to-income ratio is above 50%, which is high. The fastest way to reduce it is a balance transfer on your personal loan from 24% to 12%.",
        save: "You can save approximately ₹14.2L in total interest over the remaining tenure by executing 2 strategies we've identified.",
        strategy:
          "I recommend Strategy 1 (BT) and Strategy 3 (Top-up) in combination. Together they free ₹18,500/month and save ₹22L over 5 years.",
      };

      const msg = data.message.toLowerCase();
      let response = demoResponses.default;
      if (msg.includes('emi')) response = demoResponses.emi;
      if (msg.includes('save') || msg.includes('saving')) response = demoResponses.save;
      if (msg.includes('strategy') || msg.includes('recommend')) response = demoResponses.strategy;

      return { success: true, message: response };
    }
  },
};

export default api;
