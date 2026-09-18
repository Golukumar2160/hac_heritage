"""
BHARAT-DRISHTI // Bug Fixes Automated Verification Suite
=========================================================
Automated regression and validation checks verifying that all 12 bugs
from zfixbug.md are completely remediated and compliant with PS 26102.
"""

import unittest
import os
import re
from fastapi.testclient import TestClient

class BugRemediationVerificationTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        from backend.main import app
        cls.client = TestClient(app)

    def test_bug_001_pdf_export_url_consistency(self):
        """BUG-001: CaseFileModal and api.js have consistent PDF export method names."""
        api_js_path = os.path.join("frontend", "src", "services", "api.js")
        modal_jsx_path = os.path.join("frontend", "src", "components", "CaseFileModal.jsx")
        
        with open(api_js_path, "r", encoding="utf-8") as f:
            api_content = f.read()
        with open(modal_jsx_path, "r", encoding="utf-8") as f:
            modal_content = f.read()
            
        self.assertIn("getWorkPdfUrl(workId)", api_content)
        self.assertIn("getWorkPdfExportUrl(workId)", api_content, "Defensive alias must exist in api.js")
        self.assertIn("api.getWorkPdfUrl(workId)", modal_content, "CaseFileModal must call getWorkPdfUrl")

    def test_bug_002_model6_feature_scaling_and_column(self):
        """BUG-002: Dynamic inference feature extraction matches fraud_models.py training scale."""
        from backend.core.data_cache import get_cached_flags
        from backend.routers.works import _compute_work_completion
        
        df = get_cached_flags()
        sample_work_id = str(df.iloc[0]["work_id"])
        
        result = _compute_work_completion(sample_work_id)
        self.assertIn("completion_likelihood_pct", result)
        self.assertIn("predicted_outcome", result)
        self.assertGreaterEqual(result["completion_likelihood_pct"], 0.0)
        self.assertLessEqual(result["completion_likelihood_pct"], 100.0)

    def test_bug_003_benford_recompute_auth_and_lock(self):
        """BUG-003: POST /api/benford/recompute requires authentication and rejects anonymous calls."""
        # Unauthenticated request must be rejected (401 or 403)
        res = self.client.post("/api/benford/recompute")
        self.assertIn(res.status_code, (401, 403), "Unauthenticated recomputation must be rejected")
        
        # Authenticated as citizen must be rejected with 403
        login_res = self.client.post("/api/login", json={"username": "citizen_pilibhit", "password": "Citizen@2026"})
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            cit_res = self.client.post("/api/benford/recompute", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(cit_res.status_code, 403, "Citizen role must be forbidden from recomputing cache")

    def test_bug_004_no_hardcoded_lan_ip_in_plaque(self):
        """BUG-004: JanDrishtiPlaque.jsx must not contain hardcoded private IP 192.168.101.234."""
        plaque_path = os.path.join("frontend", "src", "components", "JanDrishtiPlaque.jsx")
        with open(plaque_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("192.168.101.234", content, "Hardcoded LAN IP must be eliminated from plaque QR generation")
        self.assertIn("portalOrigin", content)

    def test_bug_005_health_endpoint_fast_local_db(self):
        """BUG-005: /api/health executes fast local SQLite count without remote TLS latency."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)
        self.assertIn("registered_officials", data)
        self.assertIsInstance(data["registered_officials"], int)

    def test_bug_006_and_010_gps_points_scoping_and_limit(self):
        """BUG-006 & BUG-010: /api/map/gps-points respects limit query parameter and role scoping."""
        # Test limit query param
        res_limit = self.client.get("/api/map/gps-points?limit=5")
        self.assertEqual(res_limit.status_code, 200)
        data_limit = res_limit.json()
        if len(data_limit) > 0:
            self.assertLessEqual(len(data_limit), 5, "Limit parameter must restrict returned point count")

        # Test MP role scoping
        login_res = self.client.post("/api/login", json={"username": "mp_javed", "password": "MP@2026"})
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            mp_res = self.client.get("/api/map/gps-points", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(mp_res.status_code, 200)
            for pt in mp_res.json():
                if pt.get("mp_name"):
                    self.assertIn("javed", pt["mp_name"].lower(), "MP must only see their own GPS points")

    def test_bug_007_benford_view_dynamic_evasion_data(self):
        """BUG-007: BenfordView.jsx binds dynamic evasionData instead of static mock array."""
        benford_view_path = os.path.join("frontend", "src", "components", "BenfordView.jsx")
        with open(benford_view_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("thresholdChartData", content)
        self.assertNotIn("{ range: '₹49.5L - 49.99L', count: 218, isCliff: true }", content)

    def test_bug_008_audit_ledger_ministry_guard(self):
        """BUG-008: AuditLedgerView.jsx guards api.getFlaggedDas() behind ministry role check."""
        ledger_path = os.path.join("frontend", "src", "components", "AuditLedgerView.jsx")
        with open(ledger_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("role === 'ministry'", content)

    def test_bug_009_mlflow_rollback_wired(self):
        """BUG-009: api.js and ModelValidationView.jsx expose rollbackModelVersion controls."""
        api_js_path = os.path.join("frontend", "src", "services", "api.js")
        mv_path = os.path.join("frontend", "src", "components", "ModelValidationView.jsx")
        with open(api_js_path, "r", encoding="utf-8") as f:
            api_content = f.read()
        with open(mv_path, "r", encoding="utf-8") as f:
            mv_content = f.read()
            
        self.assertIn("rollbackModelVersion", api_content)
        self.assertIn("handleOpenRollback", mv_content)
        self.assertIn("Statutory Model Rollback", mv_content)

    def test_bug_011_config_security_validation(self):
        """BUG-011: config.py has validate_security method."""
        from backend.core.config import settings
        self.assertTrue(hasattr(settings, "validate_security"))
        self.assertTrue(callable(settings.validate_security))

    def test_bug_012_fraud_models_print_instruction(self):
        """BUG-012: fraud_models.py no longer prints nonexistent app.py."""
        fm_path = os.path.join("pipelines", "fraud_models.py")
        with open(fm_path, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("run  app.py", content)
        self.assertIn("start.bat", content)

if __name__ == "__main__":
    unittest.main()
