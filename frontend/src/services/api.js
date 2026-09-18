/**
 * BHARAT-DRISHTI API Service Layer
 * Direct connection to FastAPI backend (http://127.0.0.1:8000)
 */

export const API_BASE = import.meta.env.VITE_API_BASE || '';

let authToken = typeof localStorage !== 'undefined' ? (localStorage.getItem('bharat_drishti_token') || '') : '';
let currentUser = null;
try {
  currentUser = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('bharat_drishti_user') || 'null') : null;
} catch {
  currentUser = null;
}

export const setAuthSession = (token, user) => {
  authToken = token || '';
  currentUser = user || null;
  clearClientCache();
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem('bharat_drishti_token', token);
      localStorage.setItem('bharat_drishti_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('bharat_drishti_token');
      localStorage.removeItem('bharat_drishti_user');
    }
  }
};

export const getAuthSession = () => ({ token: authToken, user: currentUser });

// In-Memory Client Request Cache for Sub-Millisecond Tab Transitions
const clientCache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default TTL to minimize server requests

export const clearClientCache = () => {
  clientCache.clear();
};

async function cachedFetch(url, options = {}, ttl = DEFAULT_TTL_MS) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return fetch(url, options).then(handleResponse);
  }
  const tokenSuffix = authToken ? `_${authToken.slice(-8)}` : '_anon';
  const cacheKey = `${url}${tokenSuffix}`;
  const now = Date.now();

  const cached = clientCache.get(cacheKey);
  if (cached && (now - cached.timestamp < ttl)) {
    return JSON.parse(JSON.stringify(cached.data));
  }

  const res = await fetch(url, options);
  const data = await handleResponse(res);
  clientCache.set(cacheKey, { data, timestamp: now });
  return data;
}

const getHeaders = (extraHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const err = await response.json();
      errorMsg = err.detail || err.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Health & Server Status
  async checkHealth() {
    const t0 = performance.now();
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      const ping = Math.round(performance.now() - t0);
      if (res.ok) {
        const data = await res.json();
        return { ok: true, ping, ...data };
      }
    } catch {
      // Fallback to docs HEAD ping
    }
    try {
      const res = await fetch(`${API_BASE}/docs`, { method: 'HEAD' });
      const ping = Math.round(performance.now() - t0);
      return { ok: res.ok, ping, supabase_connected: false };
    } catch {
      return { ok: false, ping: 0, supabase_connected: false };
    }
  },

  // Auth & Roles
  async getDemoAccounts() {
    return {
      demo_accounts: [
        { username: 'ministry_admin', name: 'MoSPI Ministry Official', role: 'ministry', designation: 'Central Vigilance & National Oversight' },
        { username: 'state_nodal_up', name: 'State Nodal Authority - UP', role: 'state', state: 'Uttar Pradesh', designation: 'Principal Secretary (Planning)' },
        { username: 'district_pilibhit', name: 'District Authority - Pilibhit', role: 'district', state: 'Uttar Pradesh', ida: 'PILIBHIT', designation: 'District Magistrate & Collector' },
        { username: 'mp_javed', name: 'Shri Javed Ali Khan (MP)', role: 'mp', mp_name: 'Shri Javed Ali Khan', state: 'Uttar Pradesh', designation: 'Member of Parliament (Rajya Sabha)' },
        { username: 'citizen_pilibhit', name: 'Shri Rajesh Verma', role: 'citizen', state: 'Uttar Pradesh', ida: 'PILIBHIT', designation: 'Jan-Drishti Public Watchdog' }
      ]
    };
  },

  async getStates() {
    try {
      const filters = await this.getFilterOptions();
      return { states: filters.states || [] };
    } catch {
      return { states: ['Uttar Pradesh', 'Maharashtra', 'Bihar', 'West Bengal', 'Tamil Nadu', 'Rajasthan', 'Madhya Pradesh', 'Karnataka', 'Gujarat', 'Andhra Pradesh', 'Odisha', 'Kerala', 'Jharkhand', 'Assam', 'Punjab', 'Haryana', 'Chhattisgarh', 'Delhi', 'Jammu & Kashmir', 'Uttarakhand', 'Himachal Pradesh', 'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Goa', 'Arunachal Pradesh', 'Mizoram', 'Sikkim'] };
    }
  },

  async getAuthOptions() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/options`);
      return await handleResponse(res);
    } catch (err) {
      console.error('Failed to load auth options from backend:', err);
      return {
        states: ['Uttar Pradesh', 'Maharashtra', 'West Bengal', 'Bihar', 'Tamil Nadu', 'Rajasthan', 'Madhya Pradesh', 'Karnataka', 'Gujarat', 'Delhi'],
        districts_by_state: {
          'Uttar Pradesh': ['PILIBHIT', 'VARANASI', 'LUCKNOW', 'AGRA', 'KANPUR NAGAR', 'GORAKHPUR', 'PRAYAGRAJ'],
        },
        mps: [
          { name: 'Shri Javed Ali Khan', state: 'Uttar Pradesh', house: 'RS' },
          { name: 'Sk Nurul Islam', state: 'West Bengal', house: 'LS' },
          { name: 'R.K. Chaudhary', state: 'Uttar Pradesh', house: 'LS' }
        ]
      };
    }
  },

  async getRegisteredUsers() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`);
      return await handleResponse(res);
    } catch {
      return { users: [] };
    }
  },

  async login(username, password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(res);
    setAuthSession(data.access_token, {
      username: data.username || username,
      role: data.role,
      name: data.name,
      state: data.state || '',
      ida: data.ida || '',
      mp_name: data.mp_name || '',
      designation: data.designation || '',
      ...data,
    });
    return data;
  },

  async register(userData) {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await handleResponse(res);
    setAuthSession(data.access_token, {
      username: data.username || userData.username,
      role: data.role,
      name: data.name,
      state: data.state || '',
      ida: data.ida || '',
      mp_name: data.mp_name || '',
      designation: data.designation || '',
      ...data,
    });
    return data;
  },

  logout() {
    setAuthSession(null, null);
  },

  getCurrentUser() {
    return currentUser;
  },

  // Executive Overview & KPIs
  async getKpis(filters = {}) {
    const params = new URLSearchParams();
    if (filters.state && filters.state !== 'all') params.set('state', filters.state);
    if (filters.district && filters.district !== 'all') params.set('district', filters.district);
    if (filters.ida && filters.ida !== 'all') params.set('ida', filters.ida);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const data = await cachedFetch(`${API_BASE}/api/kpis${qs}`, { headers: getHeaders() }, 180000);
    // Transform into standard format for UI
    return {
      total_works: data.total_works !== undefined ? data.total_works : 0,
      total_sanctioned_cr: (data.total_sanctioned_amount || 0) / 10000000,
      total_spent_cr: (data.total_spent_amount || 0) / 10000000,
      total_at_risk_cr: (data.total_funds_at_risk || 0) / 10000000,
      critical_count: data.critical_count || 0,
      high_count: data.high_count || 0,
      medium_count: data.medium_count || 0,
      low_count: data.low_count || 0,
      missing_photos_count: data.missing_photo_works || 0,
      monopoly_works_count: data.monopoly_vendor_works || 0,
      duplicate_photos_count: data.duplicate_photos_count !== undefined ? data.duplicate_photos_count : 0,
      average_risk_score: data.average_risk_score || 0,
    };
  },

  // Statutory SC/ST Quota Compliance (MoSPI Clause 3.2)
  async getQuotaCompliance({ state, mp_name, violators_only, limit = 100 } = {}) {
    const params = new URLSearchParams();
    if (state && state !== 'all') params.set('state', state);
    if (mp_name && mp_name !== 'all') params.set('mp_name', mp_name);
    if (violators_only) params.set('violators_only', 'true');
    if (limit) params.set('limit', String(limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return cachedFetch(`${API_BASE}/api/compliance/quotas${qs}`, { headers: getHeaders() }, 600000);
  },

  // MP Constituency Analytical Drilldown
  async getMpDetails(mpName) {
    if (!mpName) throw new Error('MP name is required');
    return cachedFetch(`${API_BASE}/api/mp/${encodeURIComponent(mpName)}`, { headers: getHeaders() }, 600000);
  },

  // Macro Time-Series & March Rush Spending Forecaster
  async getTrends() {
    return cachedFetch(`${API_BASE}/api/trends`, { headers: getHeaders() }, 600000);
  },

  // Background Non-Blocking Prefetch for Instant Tab Navigation
  prefetchCoreViews() {
    try {
      Promise.allSettled([
        cachedFetch(`${API_BASE}/api/kpis`, { headers: getHeaders() }, 180000),
        cachedFetch(`${API_BASE}/api/map/states`, { headers: getHeaders() }, 600000),
        cachedFetch(`${API_BASE}/api/trends`, { headers: getHeaders() }, 600000),
        cachedFetch(`${API_BASE}/api/filters`, { headers: getHeaders() }, 600000),
      ]).catch(() => {});
    } catch {
      // Ignore background errors
    }
  },

  // Immutable Tamper-Evident Audit Ledger
  async getAuditLog() {
    const res = await fetch(`${API_BASE}/api/audit`, { headers: getHeaders() });
    return await handleResponse(res);
  },

  // District Authority Surveillance (Rogue DA Auto-Flagging - Master Plan Part 8)
  async getFlaggedDas() {
    const res = await fetch(`${API_BASE}/api/audit/da-flagged`, { headers: getHeaders() });
    return await handleResponse(res);
  },

  // Live Alert Feed & Flagged Schemes
  async getFlags({ page = 1, pageSize = 50, risk_label, state, district, ida, category, search, vendor_flag, trigger } = {}) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (risk_label && risk_label !== 'all') params.set('risk_label', risk_label.toUpperCase());
    if (state && state !== 'all') params.set('state', state);
    if (district && district !== 'all') params.set('district', district);
    if (ida && ida !== 'all') params.set('ida', ida);
    if (category && category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    if (vendor_flag !== undefined && vendor_flag !== null) params.set('vendor_flag', String(vendor_flag));
    if (trigger && trigger !== 'all') params.set('trigger', trigger);

    const data = await cachedFetch(`${API_BASE}/api/flags?${params.toString()}`, { headers: getHeaders() }, 15000);
    return {
      total: data.total_count !== undefined ? data.total_count : (data.total || 0),
      page: data.page || 1,
      totalPages: data.total_pages !== undefined ? data.total_pages : (data.totalPages || 1),
      flags: (data.items || []).map((item) => ({
        ...item,
        work_title: item.work_description || item.work_title || `Work #${item.work_id}`,
        category: item.work_category || item.category,
        risk_tier: (item.risk_label || 'LOW').toLowerCase(),
        risk_score: item.risk_score ? (item.risk_score > 1 ? item.risk_score / 100 : item.risk_score) : 0,
      })),
    };
  },

  // Specific Scheme Detail
  async getWorkDetail(workId) {
    const res = await fetch(`${API_BASE}/api/work/${encodeURIComponent(workId)}`, { headers: getHeaders() });
    const data = await handleResponse(res);
    const w = data.work || {};
    return {
      ...w,
      work_title: w.work_description || w.work_title || `Scheme #${w.work_id}`,
      risk_tier: (w.risk_label || w.risk_tier || 'LOW').toLowerCase(),
      risk_score: w.risk_score ? (w.risk_score > 1 ? w.risk_score / 100 : w.risk_score) : 0,
      audit_history: data.audit_history || [],
      document_forensics: data.document_forensics || w.document_forensics || [],
      duplicate_photo_evidence: data.duplicate_photo_evidence || w.duplicate_photo_evidence || []
    };
  },

  async getWork(workId) {
    return this.getWorkDetail(workId);
  },

  // AI Explainer & CAG Memo
  async getAiExplanation(workId) {
    const res = await fetch(`${API_BASE}/api/explain/work/${encodeURIComponent(workId)}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getExplainStreamUrl(workId) {
    return `${API_BASE}/api/explain/stream/${encodeURIComponent(workId)}`;
  },

  // Completion Probability Inference
  async predictCompletion(workId) {
    const res = await fetch(`${API_BASE}/api/predict/completion/${encodeURIComponent(workId)}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Jan-Drishti Citizen Ground Vigilance & QR Plaque
  getWorkQrCodeUrl(workId) {
    return `${API_BASE}/api/work/${encodeURIComponent(workId)}/qr-code`;
  },

  async submitCitizenFeedback(workId, { report_type = 'ghost_asset', description = '', citizen_name = '', citizen_contact = '' } = {}) {
    try {
      const res = await fetch(`${API_BASE}/api/citizen/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: String(workId),
          report_type,
          description,
          citizen_name,
          citizen_contact,
        }),
      });
      if (res.ok) {
        return await handleResponse(res);
      }
    } catch {
      // fallback to path endpoint below
    }

    const fallbackRes = await fetch(`${API_BASE}/api/work/${encodeURIComponent(workId)}/citizen-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_type,
        description,
        citizen_name,
        citizen_contact,
      }),
    });
    return handleResponse(fallbackRes);
  },

  // Statutory Audit Investigation PDF Export
  getWorkPdfUrl(workId) {
    return `${API_BASE}/api/export/work-pdf/${encodeURIComponent(workId)}`;
  },

  getWorkPdfExportUrl(workId) {
    return this.getWorkPdfUrl(workId);
  },

  downloadWorkPdf(workId) {
    const url = this.getWorkPdfUrl(workId);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MoSPI_Statutory_Audit_${encodeURIComponent(workId)}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // MoSPI Secretary Executive AI Briefing
  async getSecretaryBriefing() {
    const res = await fetch(`${API_BASE}/api/explain/briefing`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Benford's Law Forensic Intelligence
  async getBenfordSummary() {
    return cachedFetch(`${API_BASE}/api/benford/summary`, { headers: getHeaders() }, 45000);
  },

  async getBenfordDistribution(digitType = 'first', dataset = 'sanctioned') {
    const dType = digitType.includes('second') ? 'second_digit' : 'first_digit';
    const dSet = dataset.includes('exp') ? 'expenditures' : 'sanctions';
    return cachedFetch(`${API_BASE}/api/benford/distribution?digit_type=${dType}&dataset=${dSet}`, {
      headers: getHeaders(),
    }, 45000);
  },

  async getBenfordThresholdEvasion() {
    return cachedFetch(`${API_BASE}/api/benford/thresholds`, { headers: getHeaders() }, 45000);
  },

  async getBenfordHighRiskWorks() {
    return cachedFetch(`${API_BASE}/api/benford/transactions?limit=10`, { headers: getHeaders() }, 45000);
  },

  // Vendor Analytics & Collusion Rings
  async getVendorLeaderboard(limit = 50) {
    return cachedFetch(`${API_BASE}/api/vendors/leaderboard?limit=${limit}`, { headers: getHeaders() }, 45000);
  },

  async getVendorNetwork(topN = 30) {
    return cachedFetch(`${API_BASE}/api/vendors/network?top_n=${topN}`, { headers: getHeaders() }, 45000);
  },

  async getVendorProfile(vendorName) {
    const res = await fetch(`${API_BASE}/api/vendors/${encodeURIComponent(vendorName)}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Geospatial Map Points
  async getMapStates() {
    return cachedFetch(`${API_BASE}/api/map/states`, { headers: getHeaders() }, 45000);
  },

  async getMapDistricts(state) {
    const query = state ? `?state=${encodeURIComponent(state)}` : '';
    const res = await fetch(`${API_BASE}/api/map/districts${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getMapGpsPoints(limit) {
    const query = limit ? `?limit=${encodeURIComponent(limit)}` : '';
    const res = await fetch(`${API_BASE}/api/map/gps-points${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Dropdown Metadata Filters
  async getFilterOptions() {
    return cachedFetch(`${API_BASE}/api/filters`, { headers: getHeaders() }, 60000);
  },

  // Immutable Audit Log
  async getAuditLog() {
    const res = await fetch(`${API_BASE}/api/audit`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Dismiss / Escalate Flag (Strict 50 chars validation)
  async submitAuditAction(workId, action, justification, originalRiskScore = 85.0) {
    clearClientCache();
    const rawScore = Number(originalRiskScore);
    const normalizedScore = isNaN(rawScore) ? 85.0 : (rawScore <= 1.0 ? rawScore * 100 : rawScore);
    const res = await fetch(`${API_BASE}/api/audit/dismiss`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        work_id: String(workId),
        action: (action || 'DISMISSED').toUpperCase(),
        justification: String(justification),
        original_risk_score: normalizedScore,
      }),
    });
    return handleResponse(res);
  },

  // Early Warning Radar & Forecasting
  async getEarlyWarningWorks(state = null, threshold = 0.40) {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (threshold !== undefined && threshold !== null) params.append('threshold', threshold);
    return cachedFetch(`${API_BASE}/api/works/early-warning?${params.toString()}`, { headers: getHeaders() }, 30000);
  },

  async getConstituencyForecast(state = null, limit = 100) {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (limit) params.append('limit', limit);
    return cachedFetch(`${API_BASE}/api/constituency/unspent-forecast?${params.toString()}`, { headers: getHeaders() }, 30000);
  },

  // Image Forensics
  async getImageForensics() {
    const res = await fetch(`${API_BASE}/api/image-forensics`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getForensicsResults() {
    const res = await fetch(`${API_BASE}/api/image-forensics/results`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getOcrFlags() {
    const res = await fetch(`${API_BASE}/api/image-forensics/ocr-flags`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getForensicsOcrFlags() {
    return this.getOcrFlags();
  },

  async getForensicsDuplicates() {
    const res = await fetch(`${API_BASE}/api/image-forensics/duplicates`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async triggerImageForensics() {
    clearClientCache();
    const res = await fetch(`${API_BASE}/api/image-forensics/run`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Model Validation & Triangulation Metrics
  async getModelValidation() {
    return cachedFetch(`${API_BASE}/api/model-validation`, { headers: getHeaders() }, 30000);
  },

  async runModelValidation() {
    clearClientCache();
    const res = await fetch(`${API_BASE}/api/model-validation/run`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // MLflow MLOps & 30-Day Model Retraining Lifecycle
  async getMlflowStatus() {
    return cachedFetch(`${API_BASE}/api/mlflow/status`, { headers: getHeaders() }, 15000);
  },

  async getMlflowRuns() {
    return cachedFetch(`${API_BASE}/api/mlflow/runs`, { headers: getHeaders() }, 30000);
  },

  async triggerMlflowRetrain() {
    clearClientCache();
    const res = await fetch(`${API_BASE}/api/mlflow/retrain`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async rollbackModelVersion(targetVersion, reason) {
    clearClientCache();
    const res = await fetch(`${API_BASE}/api/mlflow/rollback`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_version: targetVersion ? parseInt(targetVersion, 10) : undefined,
        reason: reason || 'Statutory CVC model version rollback',
      }),
    });
    return handleResponse(res);
  },

  // Batch Background ML Pipeline
  async triggerPipeline() {
    clearClientCache();
    const res = await fetch(`${API_BASE}/api/run-pipeline`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getPipelineStatus() {
    const res = await fetch(`${API_BASE}/api/pipeline-status`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Live Batch CSV Audit Lab
  async uploadAuditCsv(fileOrFiles) {
    clearClientCache();
    const formData = new FormData();
    if (Array.isArray(fileOrFiles) || (fileOrFiles && typeof fileOrFiles.length === 'number' && typeof fileOrFiles.item === 'function')) {
      for (let i = 0; i < fileOrFiles.length; i++) {
        formData.append('files', fileOrFiles[i]);
      }
    } else if (fileOrFiles) {
      formData.append('file', fileOrFiles);
      formData.append('files', fileOrFiles);
    }
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const res = await fetch(`${API_BASE}/api/audit/batch-upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  async runDemoBenchmark() {
    const res = await fetch(`${API_BASE}/api/audit/demo-benchmark`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getSampleCsvUrl() {
    return `${API_BASE}/api/audit/sample-csv`;
  },
};

export default api;

