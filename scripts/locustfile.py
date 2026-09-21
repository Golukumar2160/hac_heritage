"""
BHARAT-DRISHTI // Sovereign MoSPI MPLADS Forensic Engine
Locust Load & Real-Time Latency Profiler Test Suite
Launches a high-concurrency web dashboard at http://localhost:8089
"""

from locust import HttpUser, task, between


class BharatDrishtiLoadTestUser(HttpUser):
    # Simulated human think time between clicks (0.5s to 2.0s)
    wait_time = between(0.5, 2.0)

    @task(5)
    def view_executive_kpis(self):
        """High frequency: Executive dashboard KPI summary."""
        self.client.get("/api/kpis", name="/api/kpis [Executive KPIs]")

    @task(4)
    def view_flagged_schemes(self):
        """High frequency: Paginated fraud & anomaly triage feed."""
        self.client.get("/api/flags?page=1&page_size=50", name="/api/flags [Page 1 (50 works)]")

    @task(3)
    def view_system_health(self):
        """Periodic: Uptime and database health ping."""
        self.client.get("/api/health", name="/api/health [System Health]")

    @task(3)
    def filter_critical_anomalies(self):
        """Investigation: Filter specifically for CRITICAL risk tier."""
        self.client.get(
            "/api/flags?risk_label=CRITICAL&page=1&page_size=20",
            name="/api/flags?risk_label=CRITICAL [Critical Flags]",
        )

    @task(2)
    def check_statutory_quotas(self):
        """Statutory Compliance: Clause 3.2 SC/ST fund compliance tracking."""
        self.client.get("/api/compliance/quotas", name="/api/compliance/quotas [Statutory SC/ST]")

    @task(2)
    def view_filter_options(self):
        """Navigation: States, districts, and categories dropdowns."""
        self.client.get("/api/filters", name="/api/filters [Dropdown Metadata]")

    @task(1)
    def view_macro_trends(self):
        """Analytics: Macro spending and timeline trend analysis."""
        self.client.get("/api/trends", name="/api/trends [Spending & Timeline Trends]")

    @task(1)
    def view_vendor_leaderboard(self):
        """Cartel Detection: Monopolized vendor concentration leaderboard."""
        self.client.get(
            "/api/vendors/leaderboard?limit=20",
            name="/api/vendors/leaderboard [Cartel Leaderboard]",
        )

    @task(1)
    def view_benford_analysis(self):
        """Forensic L1: First-digit Benford distribution anomaly summary."""
        self.client.get("/api/benford/summary", name="/api/benford/summary [Benford Forensic L1]")
