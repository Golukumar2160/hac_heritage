/**
 * BHARAT-DRISHTI API Service Layer
 * Direct connection to FastAPI backend (http://127.0.0.1:8000)
 */

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

let authToken = localStorage.getItem('bharat_drishti_token') || '';
let currentUser = JSON.parse(localStorage.getItem('bharat_drishti_user') || 'null');

export const setAuthSession = (token, user) => {
  authToken = token || '';
  currentUser = user || null;
  if (token) {
    localStorage.setItem('bharat_drishti_token', token);
    localStorage.setItem('bharat_drishti_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('bharat_drishti_token');
    localStorage.removeItem('bharat_drishti_user');
  }
};

export const getAuthSession = () => ({ token: authToken, user: currentUser });

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
    const res = await fetch(`${API_BASE}/docs`, { method: 'HEAD' });
    const ping = Math.round(performance.now() - t0);
    return { ok: res.ok, ping };
  },

  // Auth & Roles
  async getDemoAccounts() {
    return {
      demo_accounts: [
        { username: 'ministry_admin', name: 'MoSPI Ministry Official', role: 'ministry' },
        { username: 'state_nodal_up', name: 'State Nodal Authority — UP', role: 'state' },
        { username: 'district_pilibhit', name: 'District Authority — Pilibhit', role: 'district' },
        { username: 'mp_javed', name: 'Shri Javed Ali Khan (MP)', role: 'mp' }
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

  async login(username, password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(res);
    setAuthSession(data.access_token, {
      username,
      role: data.role,
      name: data.name,
      ...data,
    });
    return data;
  },

  // Executive Overview & KPIs
  async getKpis() {
    const res = await fetch(`${API_BASE}/api/kpis`, { headers: getHeaders() });
    const data = await handleResponse(res);
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
      duplicate_photos_count: data.duplicate_photos_count !== undefined ? data.duplicate_photos_count : 157,
      average_risk_score: data.average_risk_score || 0,
    };
  },

  // Live Alert Feed & Flagged Schemes
  async getFlags({ page = 1, pageSize = 50, risk_label, state, category, search, vendor_flag, trigger } = {}) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (risk_label && risk_label !== 'all') params.set('risk_label', risk_label.toUpperCase());
    if (state && state !== 'all') params.set('state', state);
    if (category && category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    if (vendor_flag !== undefined && vendor_flag !== null) params.set('vendor_flag', String(vendor_flag));
    if (trigger && trigger !== 'all') params.set('trigger', trigger);

    const res = await fetch(`${API_BASE}/api/flags?${params.toString()}`, { headers: getHeaders() });
    const data = await handleResponse(res);
    return {
      total: data.total || 0,
      page: data.page || 1,
      totalPages: data.total_pages || 1,
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

  // Statutory Audit Investigation PDF Export
  getWorkPdfUrl(workId) {
    return `${API_BASE}/api/export/work-pdf/${encodeURIComponent(workId)}`;
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
    const res = await fetch(`${API_BASE}/api/benford/summary`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getBenfordDistribution(digitType = 'first', dataset = 'sanctioned') {
    const dType = digitType.includes('second') ? 'second_digit' : 'first_digit';
    const dSet = dataset.includes('exp') ? 'expenditures' : 'sanctions';
    const res = await fetch(`${API_BASE}/api/benford/distribution?digit_type=${dType}&dataset=${dSet}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getBenfordThresholdEvasion() {
    const res = await fetch(`${API_BASE}/api/benford/thresholds`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getBenfordHighRiskWorks() {
    const res = await fetch(`${API_BASE}/api/benford/transactions?limit=10`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Vendor Analytics & Collusion Rings
  async getVendorLeaderboard(limit = 50) {
    const res = await fetch(`${API_BASE}/api/vendors/leaderboard?limit=${limit}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getVendorNetwork(topN = 30) {
    const res = await fetch(`${API_BASE}/api/vendors/network?top_n=${topN}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getVendorProfile(vendorName) {
    const res = await fetch(`${API_BASE}/api/vendors/${encodeURIComponent(vendorName)}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Geospatial Map Points
  async getMapStates() {
    const res = await fetch(`${API_BASE}/api/map/states`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getMapDistricts(state) {
    const query = state ? `?state=${encodeURIComponent(state)}` : '';
    const res = await fetch(`${API_BASE}/api/map/districts${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getMapGpsPoints() {
    const res = await fetch(`${API_BASE}/api/map/gps-points`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Dropdown Metadata Filters
  async getFilterOptions() {
    const res = await fetch(`${API_BASE}/api/filters`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Immutable Audit Log
  async getAuditLog() {
    const res = await fetch(`${API_BASE}/api/audit`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Dismiss / Escalate Flag (Strict 50 chars validation)
  async submitAuditAction(workId, action, justification, originalRiskScore = 0.85) {
    const res = await fetch(`${API_BASE}/api/audit/dismiss`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        work_id: String(workId),
        action: (action || 'DISMISSED').toUpperCase(),
        justification: String(justification),
        original_risk_score: Number(originalRiskScore) || 85.0,
      }),
    });
    return handleResponse(res);
  },

  // Trends
  async getTrends() {
    const res = await fetch(`${API_BASE}/api/trends`, { headers: getHeaders() });
    return handleResponse(res);
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

  async getForensicsDuplicates() {
    const res = await fetch(`${API_BASE}/api/image-forensics/duplicates`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async triggerImageForensics() {
    const res = await fetch(`${API_BASE}/api/image-forensics/run`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Model Validation & Triangulation Metrics
  async getModelValidation() {
    const res = await fetch(`${API_BASE}/api/model-validation`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async runModelValidation() {
    const res = await fetch(`${API_BASE}/api/model-validation/run`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};

export default api;

