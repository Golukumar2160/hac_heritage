import json

with open("scalene-profile.json", "r", encoding="utf-8") as f:
    data = json.load(f)

files = data.get("files", {})
print("=" * 80)
print(f" SCALENE PROFILING ANALYSIS -- BHARAT-DRISHTI BACKEND (Files: {len(files)})")
print("=" * 80)

ranked_files = []
for fname, fmeta in files.items():
    lines = fmeta.get("lines", [])
    total_py = sum(l.get("n_cpu_percent_python", 0) for l in lines)
    total_c = sum(l.get("n_cpu_percent_c", 0) for l in lines)
    ranked_files.append((fname, total_py, total_c, lines))

ranked_files.sort(key=lambda x: -(x[1] + x[2]))

for fname, total_py, total_c, lines in ranked_files:
    if total_py + total_c < 0.2:
        continue
    # Show relative path if inside workspace
    clean_name = fname.replace("C:\\Users\\shash\\OneDrive\\Desktop\\hack_heritage\\", "")
    print(f"\n[FILE] {clean_name}")
    print(f"       Python CPU: {total_py:.1f}% | C/Native CPU: {total_c:.1f}%")
    active_lines = [l for l in lines if (l.get("n_cpu_percent_python", 0) + l.get("n_cpu_percent_c", 0)) > 0]
    active_lines.sort(key=lambda l: -(l.get("n_cpu_percent_python", 0) + l.get("n_cpu_percent_c", 0)))
    for l in active_lines[:6]:
        py_cpu = l.get("n_cpu_percent_python", 0)
        c_cpu = l.get("n_cpu_percent_c", 0)
        lineno = l.get("lineno")
        code = l.get("line", "").strip()[:80]
        print(f"   L{lineno:<4} | Py: {py_cpu:>4.1f}% | C: {c_cpu:>4.1f}% | {code}")

print("\n" + "=" * 80)
