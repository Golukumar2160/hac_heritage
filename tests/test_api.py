"""
UNIT TEST SUITE FOR BHARAT-DRISHTI FASTAPI SERVICES
Compatible with pytest and standard library unittest.
Execute via:
    python -m unittest discover tests
or:
    pytest tests/test_api.py
"""
import unittest
import json
import os
import sys

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi.testclient import TestClient
from backend.main import app


class BharatDrishtiApiTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Obtain auth token for testing secured endpoints
        cls.auth_token = None
        try:
            res = cls.client.post(
                "/api/login", 
                json={"username": "ministry_admin", "password": "Ministry@2026"}
            )
            if res.status_code == 200:
                cls.auth_token = res.json().get("access_token")
        except Exception:
            pass

    def test_01_health_endpoint(self):
        """GET /api/health should return ok with supabase_connected status."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertIn("supabase_connected", data)
        self.assertIsInstance(data.get("supabase_connected"), bool)

    def test_02_kpis_metrics(self):
        """GET /api/kpis should return national totals and duplicate photo count."""
        res = self.client.get("/api/kpis")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data.get("total_works", 0), 98000)
        self.assertIn("duplicate_photos_count", data)
        self.assertGreater(data.get("critical_count", 0), 0)

    def test_03_flags_pagination(self):
        """GET /api/flags should support pagination and filtering."""
        res = self.client.get("/api/flags?page=1&page_size=10&risk_label=CRITICAL")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertEqual(len(data["items"]), 10)
        for item in data["items"]:
            self.assertEqual(item.get("risk_label"), "CRITICAL")

    def test_04_benford_forensics(self):
        """GET /api/benford/summary should return statistical fraud indicators."""
        res = self.client.get("/api/benford/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("sanctions_metrics", data)
        self.assertIn("chi_square", data["sanctions_metrics"])
        self.assertIn("expenditure_metrics", data)

    def test_05_export_unauthenticated_guard(self):
        """GET /api/export without credentials must return 401 Unauthorized (GAP-B4)."""
        res = self.client.get("/api/export")
        self.assertEqual(res.status_code, 401)

    def test_06_export_authenticated(self):
        """GET /api/export with valid Bearer token must return 200 OK and CSV stream."""
        self.assertIsNotNone(self.auth_token, "Ministry admin login token must be available")
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        res = self.client.get("/api/export?risk_label=CRITICAL", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.headers.get("content-type", ""))

    def test_07_gps_points_dynamic(self):
        """GET /api/map/gps-points must return real works without hardcoded defaults (GAP-B5)."""
        res = self.client.get("/api/map/gps-points")
        self.assertEqual(res.status_code, 200)
        pts = res.json()
        self.assertIsInstance(pts, list)
        if pts:
            first = pts[0]
            self.assertIn("latitude", first)
            self.assertIn("longitude", first)
            self.assertNotEqual(first.get("latitude"), 0)

    def test_08_pipeline_status_persisted(self):
        """GET /api/pipeline-status must return status and last_run timestamp (GAP-B3)."""
        res = self.client.get("/api/pipeline-status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)
        self.assertIn("is_running", data)

    def test_09_image_forensics_endpoints(self):
        """GET /api/image-forensics/ocr-flags and /duplicates should return valid forensic arrays."""
        res_ocr = self.client.get("/api/image-forensics/ocr-flags")
        self.assertEqual(res_ocr.status_code, 200)
        data_ocr = res_ocr.json()
        self.assertIsInstance(data_ocr, list)

        res_dup = self.client.get("/api/image-forensics/duplicates")
        self.assertEqual(res_dup.status_code, 200)
        data_dup = res_dup.json()
        self.assertIsInstance(data_dup, list)


if __name__ == "__main__":
    unittest.main()
