import os
import sys
import json
import urllib.parse
import re

ROOT_DIR = r"c:\Users\shash\OneDrive\Desktop\hack_heritage"
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from forensics.vision_auditor import run_full_vision_audit

def test_endpoint_logic(work_id, sample_file=None):
    extracted_dir = os.path.join(ROOT_DIR, "images", "extracted")
    work_id_clean = urllib.parse.unquote(work_id.strip())
    canon_id = work_id_clean
    work_desc = "Construction of CC Road in Village Rampur"
    sanction_amt = 1200000.0
    category = "Civil Works"
    
    target_img_path = None
    is_sample = False
    sample_note = None
    
    if sample_file:
        candidate = os.path.join(extracted_dir, os.path.basename(sample_file))
        if os.path.exists(candidate):
            target_img_path = candidate
            is_sample = True
            sample_note = f"Audited using requested sample photograph: {os.path.basename(candidate)}"
            
    if not target_img_path:
        dup_path = os.path.join(ROOT_DIR, "forensics", "duplicate_photo_flags.json")
        if os.path.exists(dup_path):
            with open(dup_path, "r", encoding="utf-8") as f:
                all_dups = json.load(f)
            for d in all_dups:
                w1 = str(d.get("numeric_work_id_1") or "").strip()
                w2 = str(d.get("numeric_work_id_2") or "").strip()
                cw1 = str(d.get("work_id_1") or "").strip()
                cw2 = str(d.get("work_id_2") or "").strip()
                if work_id_clean in (w1, w2) or canon_id in (cw1, cw2):
                    f1 = os.path.join(extracted_dir, d.get("file_1", ""))
                    f2 = os.path.join(extracted_dir, d.get("file_2", ""))
                    if os.path.exists(f1):
                        target_img_path = f1
                        break
                    elif os.path.exists(f2):
                        target_img_path = f2
                        break
                        
    if not target_img_path and os.path.exists(extracted_dir):
        tokens = re.findall(r"\d+", canon_id)
        for t in reversed(tokens):
            if len(t) >= 4:
                matches = [f for f in os.listdir(extracted_dir) if t in f and f.lower().endswith(('.jpeg', '.jpg', '.png')) and not f.endswith('_ela.png')]
                if matches:
                    target_img_path = os.path.join(extracted_dir, matches[0])
                    break

    all_imgs = [f for f in os.listdir(extracted_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png')) and not f.endswith('_ela.png')]
    available_samples = all_imgs[:10]
    if not target_img_path and all_imgs:
        target_img_path = os.path.join(extracted_dir, all_imgs[0])
        is_sample = True
        sample_note = f"Work has no uploaded physical inspection photo (Rule 3.12 violation flagged). Audited using benchmark ground completion photo ({all_imgs[0]})."
        
    audit_res = run_full_vision_audit(
        image_path=target_img_path,
        work_title=work_desc,
        sanction_amount=sanction_amt,
        category=category
    )
    
    filename = os.path.basename(target_img_path)
    audit_res["work_id"] = canon_id
    audit_res["filename"] = filename
    audit_res["image_url"] = f"/images/extracted/{filename}"
    audit_res["is_sample"] = is_sample
    audit_res["sample_note"] = sample_note
    return audit_res

if __name__ == "__main__":
    print("Testing work with direct photo collision:")
    r1 = test_endpoint_logic("59786")
    print(f"59786 -> Image: {r1['filename']}, Tamper: {r1['ela']['tamper_score']}, Verdict: {r1['ela']['verdict']}, IsSample: {r1['is_sample']}")
    
    print("\nTesting work with numeric ID match in extracted dir:")
    r2 = test_endpoint_logic("70387")
    print(f"70387 -> Image: {r2['filename']}, Tamper: {r2['ela']['tamper_score']}, Verdict: {r2['ela']['verdict']}, IsSample: {r2['is_sample']}")

    print("\nTesting work without photos (benchmark fallback):")
    r3 = test_endpoint_logic("UNKNOWN_WORK_99999")
    print(f"UNKNOWN -> Image: {r3['filename']}, Tamper: {r3['ela']['tamper_score']}, Verdict: {r3['ela']['verdict']}, IsSample: {r3['is_sample']}")
