from backend.main import app

for route in app.routes:
    methods = ','.join(getattr(route, 'methods', []))
    path = getattr(route, 'path', '')
    if any(k in path for k in ['kpis', 'flags', 'geo', 'work', 'export', 'summary', 'district']):
        print(f"{methods:10} {path}")
