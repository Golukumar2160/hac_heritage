if (typeof global.localStorage === 'undefined') {
  let store = {};
  global.localStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, setAuthSession, getAuthSession } from '../services/api';

describe('BHARAT-DRISHTI Frontend API & Auth Service Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthSession('', null);
    vi.restoreAllMocks();
  });

  describe('Session & Auth Management', () => {
    it('stores and retrieves authenticated user sessions correctly', () => {
      const mockUser = { username: 'ministry_admin', role: 'ministry', name: 'MoSPI Official' };
      const mockToken = 'mock-jwt-token-12345';

      setAuthSession(mockToken, mockUser);

      const session = getAuthSession();
      expect(session.token).toBe(mockToken);
      expect(session.user).toEqual(mockUser);
      expect(localStorage.getItem('bharat_drishti_token')).toBe(mockToken);
    });

    it('clears session properly on logout', () => {
      setAuthSession('dummy-token', { role: 'citizen' });
      setAuthSession('', null);

      const session = getAuthSession();
      expect(session.token).toBe('');
      expect(session.user).toBeNull();
      expect(localStorage.getItem('bharat_drishti_token')).toBeNull();
    });
  });

  describe('API Endpoints & Statutory Parameter Formatting', () => {
    it('calls /api/compliance/quotas with correct state and limit params', async () => {
      const mockResponse = {
        sc_quota_target_pct: 15.0,
        st_quota_target_pct: 7.5,
        national_sc_actual_pct: 16.2,
        national_st_actual_pct: 8.1,
        statutory_mandate: "MPLADS Guidelines Clause 3.2",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const res = await api.getQuotaCompliance({ state: 'Uttar Pradesh', limit: 50, violators_only: true });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/compliance/quotas');
      expect(calledUrl).toContain('state=Uttar+Pradesh');
      expect(calledUrl).toContain('limit=50');
      expect(calledUrl).toContain('violators_only=true');
      expect(res.sc_quota_target_pct).toBe(15.0);
    });

    it('properly URI-encodes MP names in getMpDetails', async () => {
      const mockMpData = {
        mp_name: 'Shri Javed Ali Khan',
        works_count: 145,
        total_sanctioned_cr: 12.5,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMpData,
      });

      const res = await api.getMpDetails('Shri Javed Ali Khan');
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/mp/Shri%20Javed%20Ali%20Khan');
      expect(res.mp_name).toBe('Shri Javed Ali Khan');
    });

    it('serializes getFlags filter parameters correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total_count: 10, items: [] }),
      });

      await api.getFlags({
        state: 'Uttar Pradesh',
        risk_label: 'HIGH',
        trigger: 'Cartel Bidding',
        page: 2,
        pageSize: 25,
      });

      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('state=Uttar+Pradesh');
      expect(calledUrl).toContain('risk_label=HIGH');
      expect(calledUrl).toContain('trigger=Cartel+Bidding');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('page_size=25');
    });

    it('attaches Bearer authorization token header when logged in', async () => {
      setAuthSession('test-secret-token-xyz', { username: 'test_admin' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success' }),
      });

      await api.getAuditLog();
      const calledHeaders = global.fetch.mock.calls[0][1].headers;
      expect(calledHeaders['Authorization']).toBe('Bearer test-secret-token-xyz');
    });

    it('handles HTTP errors gracefully by throwing structured error messages', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ detail: 'GFR 2017 Rule 144: Unauthorized access to sealed audit ledger' }),
      });

      await expect(api.getAuditLog()).rejects.toThrow(
        'GFR 2017 Rule 144: Unauthorized access to sealed audit ledger'
      );
    });
  });
});
