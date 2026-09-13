import unittest
from fastapi.testclient import TestClient
from backend.main import app

class CitizenRBACTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # Authenticate as citizen
        res = cls.client.post("/api/login", json={
            "username": "citizen_pilibhit",
            "password": "Citizen@2026"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        data = res.json()
        cls.token = data["access_token"]
        cls.role = data["role"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_citizen_credentials(self):
        """Citizen authentication succeeds with citizen role and district metadata."""
        self.assertEqual(self.role, "citizen")

    def test_02_citizen_audit_dismiss_blocked(self):
        """Citizens MUST be forbidden (HTTP 403) from dismissing or modifying audit logs."""
        payload = {
            "work_id": "135269",
            "action": "DISMISSED",
            "justification": "This justification is more than fifty characters long for audit testing purposes.",
            "original_risk_score": 85.0
        }
        res = self.client.post("/api/audit/dismiss", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Statutory authority restricted", res.json()["detail"])

    def test_03_citizen_pipeline_trigger_blocked(self):
        """Citizens MUST be forbidden (HTTP 403) from triggering the ML pipeline."""
        res = self.client.post("/api/run-pipeline", headers=self.headers)
        self.assertEqual(res.status_code, 403)

    def test_04_citizen_bulk_download_blocked(self):
        """Citizens MUST be forbidden (HTTP 403) from triggering bulk PDF scraping."""
        res = self.client.post("/api/forensics/bulk-download", json={"limit": 5}, headers=self.headers)
        self.assertEqual(res.status_code, 403)

    def test_05_citizen_feedback_allowed(self):
        """Citizens CAN submit ground reality feedback to trigger site audits."""
        payload = {
            "report_type": "ghost_asset",
            "description": "Visited site in village Bhogpur. No construction found on ground.",
            "citizen_name": "Test Citizen",
            "citizen_contact": "9876543210"
        }
        res = self.client.post("/api/work/135269/citizen-feedback", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("report_id", data)

    def test_06_citizen_scoped_kpis(self):
        """Citizen requesting KPIs receives valid district scoped data."""
        res = self.client.get("/api/kpis", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_works", data)
        self.assertIn("total_funds_at_risk", data)

    def test_07_citizen_scoped_flags(self):
        """Citizen requesting flags receives paginated alerts."""
        res = self.client.get("/api/flags?page=1&page_size=10", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)

if __name__ == "__main__":
    unittest.main()
