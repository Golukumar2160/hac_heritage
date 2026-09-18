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
});
