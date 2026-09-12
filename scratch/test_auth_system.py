import os
import sys
import unittest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))

# Import FastAPI app
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
from backend.main import app, get_supabase_conn, find_user_by_identifier, is_supabase_alive

client = TestClient(app)

class TestAuthSystem(unittest.TestCase):
    def test_01_health_and_supabase(self):
        print("\n--- Test 1: Health & Supabase Connectivity ---")
        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        print("Health status:", data.get("status"))
        print("Supabase connected:", data.get("supabase_connected"))
        print("Registered officials count:", data.get("registered_officials"))
        self.assertTrue(data.get("supabase_connected"), "Supabase should be connected")

    def test_02_auth_options(self):
        print("\n--- Test 2: Auth Options (States, Districts, MPs) ---")
        res = client.get("/api/auth/options")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        states = data.get("states", [])
        districts = data.get("districts_by_state", {})
        mps = data.get("mps", [])
        print(f"Total States/UTs: {len(states)}")
        print(f"Total States with districts mapped: {len(districts)}")
        print(f"Total MPs in directory: {len(mps)}")
        self.assertGreater(len(states), 10)
        self.assertGreater(len(mps), 500)
        print(f"Sample MP: {mps[0]['name']} ({mps[0]['state']}, {mps[0]['house']})")

    def test_03_login_demo_users(self):
        print("\n--- Test 3: Demo Users Login ---")
        demo_logins = [
            ("ministry_admin", "Ministry@2026", "ministry"),
            ("state_nodal_up", "StateUP@2026", "state"),
            ("district_pilibhit", "District@2026", "district"),
            ("mp_javed", "MP@2026", "mp"),
        ]
        for username, password, expected_role in demo_logins:
            res = client.post("/api/login", json={"username": username, "password": password})
            self.assertEqual(res.status_code, 200, f"Login failed for {username}: {res.text}")
            data = res.json()
            self.assertIn("access_token", data)
            self.assertEqual(data["role"], expected_role)
            print(f"[OK] {username} logged in successfully as {data['role']} ({data['name']})")

    def test_04_login_by_email_and_mp_name(self):
        print("\n--- Test 4: Flexible Login (Email and MP Name) ---")
        # By official email
        res = client.post("/api/login", json={"username": "ministry.admin@mospi.gov.in", "password": "Ministry@2026"})
        self.assertEqual(res.status_code, 200)
        print("[OK] Logged in using official email: ministry.admin@mospi.gov.in")

        # By MP full name
        res = client.post("/api/login", json={"username": "Shri Javed Ali Khan", "password": "MP@2026"})
        self.assertEqual(res.status_code, 200)
        print("[OK] Logged in using MP full name: Shri Javed Ali Khan")

    def test_05_register_new_official_user(self):
        print("\n--- Test 5: Register New Official User into Supabase ---")
        import time
        timestamp = int(time.time())
        test_user = {
            "username": f"officer_{timestamp}",
            "email": f"officer_{timestamp}@mospi.gov.in",
            "password": "OfficialSecure@2026",
            "name": f"Auditor General Test {timestamp}",
            "role": "ministry",
            "designation": "Senior Forensic Auditor",
            "clearance_code": "SEC-CENTRAL-LVL5"
        }
        res = client.post("/api/register", json=test_user)
        self.assertEqual(res.status_code, 200, f"Registration failed: {res.text}")
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["username"], test_user["username"])
        print(f"[OK] Successfully registered new official in Supabase: {data['username']} ({data['name']})")

        # Verify user can log in with their credentials
        login_res = client.post("/api/login", json={"username": test_user["username"], "password": test_user["password"]})
        self.assertEqual(login_res.status_code, 200)
        print(f"[OK] Logged in with newly registered username: {test_user['username']}")

        # Verify user can log in with their email
        login_email_res = client.post("/api/login", json={"username": test_user["email"], "password": test_user["password"]})
        self.assertEqual(login_email_res.status_code, 200)
        print(f"[OK] Logged in with newly registered email: {test_user['email']}")

    def test_06_registered_users_list(self):
        print("\n--- Test 6: Registered Users Directory Endpoint ---")
        res = client.get("/api/auth/users")
        self.assertEqual(res.status_code, 200)
        users = res.json().get("users", [])
        print(f"Total registered official accounts in directory: {len(users)}")
        self.assertGreater(len(users), 0)
        for u in users[:4]:
            print(f" - @{u['username']}: {u['name']} ({u['role'].upper()})")

if __name__ == "__main__":
    unittest.main()
