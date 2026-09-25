import { describe, it, expect } from 'vitest';

describe('Sovereign Statutory Compliance & Governance Rules (PS 26102)', () => {
  describe('Clause 3.2 SC/ST Affirmative Allocation Norms', () => {
    it('mandates min 15% SC allocation and flags non-compliant constituencies', () => {
      const SC_TARGET_PCT = 15.0;
      const isCompliant = (actual) => actual >= SC_TARGET_PCT;

      expect(isCompliant(16.5)).toBe(true);
      expect(isCompliant(14.9)).toBe(false);
      expect(isCompliant(0.0)).toBe(false);
    });

    it('mandates min 7.5% ST allocation and flags deficits', () => {
      const ST_TARGET_PCT = 7.5;
      const isCompliant = (actual) => actual >= ST_TARGET_PCT;

      expect(isCompliant(8.2)).toBe(true);
      expect(isCompliant(7.4)).toBe(false);
    });
  });

  describe('GFR 2017 Rule 144 / 149 Split-Tendering Thresholds', () => {
    it('flags cluster of transactions just below the ₹2.5L and ₹5L open-tender ceilings', () => {
      const GEM_DIRECT_PURCHASE_LIMIT = 250000;
      const L2_TENDER_LIMIT = 500000;

      const isSplitTenderSuspicious = (amount, hoursBetweenWorks) => {
        // Issuing multiple work orders within 72h right beneath statutory thresholds
        const nearLimit = (amount >= 240000 && amount < GEM_DIRECT_PURCHASE_LIMIT) ||
                          (amount >= 480000 && amount < L2_TENDER_LIMIT);
        return nearLimit && hoursBetweenWorks <= 72;
      };

      expect(isSplitTenderSuspicious(248000, 24)).toBe(true);
      expect(isSplitTenderSuspicious(495000, 48)).toBe(true);
      expect(isSplitTenderSuspicious(100000, 24)).toBe(false);
      expect(isSplitTenderSuspicious(248000, 120)).toBe(false);
    });
  });

  describe('Role-Based Access Control (RBAC) Statutory Scoping', () => {
    const roles = {
      ministry: { canViewNational: true, canTriggerPipeline: true, canFreezeTranches: true },
      state: { canViewNational: false, canViewState: true, canFreezeTranches: false },
      district: { canViewNational: false, canViewState: false, canViewDistrict: true, canFreezeTranches: true },
      mp: { canViewNational: false, canViewConstituency: true, canFreezeTranches: false },
      citizen: { canViewNational: true, canViewConstituency: true, canFreezeTranches: false },
    };

    it('enforces that only Ministry & District can freeze disbursements/tranches', () => {
      expect(roles.ministry.canFreezeTranches).toBe(true);
      expect(roles.district.canFreezeTranches).toBe(true);
      expect(roles.state.canFreezeTranches).toBe(false);
      expect(roles.mp.canFreezeTranches).toBe(false);
      expect(roles.citizen.canFreezeTranches).toBe(false);
    });

    it('enforces that only Ministry can trigger production ML pipeline retraining', () => {
      expect(roles.ministry.canTriggerPipeline).toBe(true);
      expect(roles.district.canTriggerPipeline).toBeFalsy();
      expect(roles.citizen.canTriggerPipeline).toBeFalsy();
    });
  });

  describe('Clause 4.1 & 5.2 Barred Public Expenditure (Prohibited Works)', () => {
    const prohibitedRegex = /(\b(construction|renovation|repair|development|maintenance|beautification|upgradation|addition|extension|erection|installation)\s+(of\s+)?(a\s+)?([a-zA-Z\s]{0,25}?)(mandir|temple|masjid|mosque|church|gurudwara|gurdwara|ashram|samadhi|dargah|mutt|matha|makbara|shrine|prayer\s+hall|statue|bust|memorial|smarak|smruti)\b)|(\b(mandir|temple|masjid|mosque|church|gurudwara|ashram|samadhi|dargah|mutt|statue|bust|memorial|smarak)\s+([a-zA-Z\s]{0,20}?)(construction|repair|renovation|compound\s+wall|boundary\s+wall|shed|hall|gate|room|works?)\b)|(\bprivate\s+(property|school|college|trust|society|hospital|nursing\s+home|club|firm|land)\b)|(\b(commercial\s+complex|shopping\s+complex|shopping\s+mall)\b)/i;

    const isProhibited = (desc) => {
      if (!desc) return false;
      const m = prohibitedRegex.exec(desc);
      if (!m) return false;
      const prefix = desc.slice(0, m.index).trim().toLowerCase();
      const landmarkPreps = ['near', 'opposite', 'behind', 'beside', 'adjacent to'];
      if (landmarkPreps.some(prep => prefix.endsWith(prep))) return false;
      return true;
    };

    it('strictly flags construction or renovation of religious places, memorials, and commercial complexes', () => {
      expect(isProhibited('Renovation and compound wall construction of Durga Mandir')).toBe(true);
      expect(isProhibited('Construction of Shiva Temple Hall')).toBe(true);
      expect(isProhibited('Erection of bronze statue of leader at public square')).toBe(true);
      expect(isProhibited('Room Construction work in Bus stand commercial complex')).toBe(true);
      expect(isProhibited('Renovation of private school building')).toBe(true);
    });

    it('correctly does NOT flag legitimate community assets that merely cite a landmark', () => {
      expect(isProhibited('Construction of Community Hall near Mallikarjun Temple')).toBe(false);
      expect(isProhibited('Providing CC road near Hanuman Mandir')).toBe(false);
      expect(isProhibited('Installation of Solar Street Light near Jama Masjid')).toBe(false);
    });
  });

  describe('GFR 144 Semantic Textual Duplication (Ghost Work Prevention)', () => {
    const stopwords = new Set([
      'construction', 'of', 'at', 'in', 'near', 'from', 'to', 'village', 'gp',
      'gram', 'panchayat', 'ward', 'tq', 'taluk', 'district', 'work', 'works',
      'nos', 'sl', 'no', 'and', 'for', 'the', 'under', 'providing', 'provision',
      'reach', 'phase', 'stage', 'part', 'section', 'chainage', 'ch', 'km', 'item'
    ]);

    const normalizeTokens = (text) => {
      if (!text) return '';
      const clean = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
      const tokens = clean.split(/\s+/).filter(w => !stopwords.has(w) && w.length > 2);
      return Array.from(new Set(tokens)).sort().join(' ');
    };

    it('flags identical project scopes split into multi-reach orders under the same jurisdiction', () => {
      const desc1 = 'Providing CC road from Bus Stand to Primary School at Ward 4';
      const desc2 = 'Providing CC road from Bus Stand to Primary School (reach-2) at Ward 4';
      expect(normalizeTokens(desc1)).toBe(normalizeTokens(desc2));
    });

    it('keeps distinct public works differentiated', () => {
      const desc1 = 'Providing CC road from Bus Stand to Primary School at Ward 4';
      const desc2 = 'Construction of public drinking water filter plant at Ward 4';
      expect(normalizeTokens(desc1)).not.toBe(normalizeTokens(desc2));
    });
  });

  describe('Clause 3.10 Bureaucratic Sanction SLA (>45 Days Delay)', () => {
    const isSanctionStalled = (recommendedDate, sanctionDate) => {
      const rec = new Date(recommendedDate);
      const sanc = new Date(sanctionDate);
      const diffDays = Math.round((sanc - rec) / (1000 * 60 * 60 * 24));
      return diffDays > 45;
    };

    it('flags works delayed beyond the statutory 45-day SLA from recommendation to sanction', () => {
      expect(isSanctionStalled('2024-05-01', '2024-08-15')).toBe(true);  // 106 days
      expect(isSanctionStalled('2024-05-01', '2024-06-20')).toBe(true);  // 50 days
      expect(isSanctionStalled('2024-05-01', '2024-05-20')).toBe(false); // 19 days
    });
  });
});
