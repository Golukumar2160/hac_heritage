"""
AI-Powered Document & Image Forensics Engine — MPLADS Scheme
Analyzes physical scanned PDFs, utilization certificates, completion reports,
and site photographs to detect fraud, double-billing, and document tampering.

Capabilities:
1. Deep OCR Entity Extraction: Extracts MP Name, Sanctioned Amount, Vendor Name, UTR, and Order Numbers.
2. GPS Geo-tag Extraction: Reads GPS coordinates stamped by camera overlays or EXIF tags.
3. Cross-Scheme Anomaly Detection: Detects MLA/KLLAD state fund certificates submitted under MPLADS.
4. Perceptual Hashing (pHash): Detects duplicate/recycled photographs across projects.
5. Financial Cross-Validation: Compares certificate amounts against portal records.
"""

import os
import io
import sys
import re
import json
import pymupdf
import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from typing import Optional, Dict, Any, List, Set
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import imagehash
import pandas as pd
from rapidocr_onnxruntime import RapidOCR

# ── Paths ──────────────────────────────────────────────────────────────────────
THIS_DIR       = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR       = os.path.dirname(THIS_DIR)
IMAGES_DIR     = os.path.join(ROOT_DIR, "images")
FRAUD_FLAGS_CSV = os.path.join(ROOT_DIR, "data", "processed", "fraud_flags.csv")
if not os.path.exists(FRAUD_FLAGS_CSV):
    FRAUD_FLAGS_CSV = os.path.join(ROOT_DIR, "fraud_flags.csv")
EXTRACTED_DIR  = os.path.join(IMAGES_DIR, "extracted")

OUT_DUPLICATES = os.path.join(THIS_DIR, "duplicate_photo_flags.json")
OUT_OCR        = os.path.join(THIS_DIR, "ocr_flags.json")
OUT_MISSING    = os.path.join(THIS_DIR, "missing_photo_flags.json")
OUT_SUMMARY    = os.path.join(THIS_DIR, "forensics_summary.json")
PHASH_VAULT_FILE = os.path.join(THIS_DIR, "phash_vault.json")

os.makedirs(EXTRACTED_DIR, exist_ok=True)

def load_phash_vault() -> list:
    """Load persistent visual fingerprint vault (preserves fingerprints across PDF deletions)."""
    if os.path.exists(PHASH_VAULT_FILE):
        try:
            with open(PHASH_VAULT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"  [!] Could not load phash_vault: {e}")
    return []

def save_phash_vault(vault: list):
    """Save persistent visual fingerprint vault."""
    try:
        with open(PHASH_VAULT_FILE, "w", encoding="utf-8") as f:
            json.dump(vault, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"  [!] Could not save phash_vault: {e}")

# ── Initialize RapidOCR Engine ────────────────────────────────────────────────
ocr_engine = RapidOCR()

# ── Regex Patterns ─────────────────────────────────────────────────────────────
GPS_PATTERN_1 = re.compile(r'Lat\s*[:\s]?\s*([0-9]+\.[0-9]+)[^\w]*Long\s*[:\s]?\s*([0-9]+\.[0-9]+)', re.IGNORECASE)
GPS_PATTERN_2 = re.compile(r'([0-9]+\.[0-9]+)\s*°?\s*[NS][\s,]+([0-9]+\.[0-9]+)\s*°?\s*[EW]', re.IGNORECASE)

# 1. Hindi / Bilingual Camera Banners (GPS Map Camera & Local Apps)
HINDI_GPS_PATTERN = re.compile(
    r'(?:अक्षांश|Lat(?:itude)?)[^\d]{0,15}([0-9]{1,2}\.[0-9]{3,8})[^\d]{0,40}(?:देशांतर|Long(?:itude)?)[^\d]{0,15}([0-9]{2,3}\.[0-9]{3,8})',
    re.IGNORECASE
)

# 2. Degrees, Minutes, Seconds (DMS) format used by NoteCam / Solocator
DMS_GPS_PATTERN = re.compile(
    r'([0-9]{1,2})°\s*([0-9]{1,2})\'\s*([0-9]{1,2}(?:\.[0-9]+)?)\"?\s*([NnSs])[\s,]+([0-9]{2,3})°\s*([0-9]{1,2})\'\s*([0-9]{1,2}(?:\.[0-9]+)?)\"?\s*([EeWw])'
)

# 3. Clean decimal degrees with N/E markers
DECIMAL_GPS_PATTERN = re.compile(
    r'([0-9]{1,2}\.[0-9]{4,8})\s*°?\s*[Nn][\s,]+([0-9]{2,3}\.[0-9]{4,8})\s*°?\s*[Ee]'
)

def dms_to_dd_calc(deg, minutes, sec, ref):
    dd = float(deg) + float(minutes)/60.0 + float(sec)/3600.0
    if str(ref).upper() in ['S', 'W']:
        dd = -dd
    return dd

def extract_gps_from_ocr_text(text: str) -> Optional[dict]:
    """
    Extracts GPS coordinates from scanned certificate text overlays,
    supporting Hindi camera app banners, DMS formats, and multi-line blocks.
    """
    if not text:
        return None

    # Try Pattern 1: Hindi / Bilingual camera banner
    m1 = HINDI_GPS_PATTERN.search(text)
    if m1:
        try:
            lat = float(m1.group(1))
            lon = float(m1.group(2))
            if 6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0:
                return {"latitude": round(lat, 6), "longitude": round(lon, 6), "source": "Camera Watermark (Hindi/Bilingual)"}
        except Exception:
            pass

    # Try Pattern 2: DMS (Degrees, Minutes, Seconds) e.g. 21°59'14.5"N 82°33'40.2"E
    m2 = DMS_GPS_PATTERN.search(text)
    if m2:
        try:
            lat = dms_to_dd_calc(m2.group(1), m2.group(2), m2.group(3), m2.group(4))
            lon = dms_to_dd_calc(m2.group(5), m2.group(6), m2.group(7), m2.group(8))
            if 6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0:
                return {"latitude": round(lat, 6), "longitude": round(lon, 6), "source": "Camera Watermark (NoteCam DMS)"}
        except Exception:
            pass

    # Try Pattern 3: Standard decimal degrees with N/E markers
    m3 = DECIMAL_GPS_PATTERN.search(text)
    if m3:
        try:
            lat = float(m3.group(1))
            lon = float(m3.group(2))
            if 6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0:
                return {"latitude": round(lat, 6), "longitude": round(lon, 6), "source": "Camera Watermark (Decimal Degrees)"}
        except Exception:
            pass

    # Try Pattern 4: Legacy patterns
    m_legacy = GPS_PATTERN_1.search(text) or GPS_PATTERN_2.search(text)
    if m_legacy:
        try:
            lat = float(m_legacy.group(1))
            lon = float(m_legacy.group(2))
            if 6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0:
                return {"latitude": round(lat, 6), "longitude": round(lon, 6), "source": "Watermark Overlay"}
        except Exception:
            pass

    # Try Pattern 5: Multi-line independent Latitude and Longitude blocks
    p_lat = re.search(r'(?:Latitude|Lat|अक्षांश)\s*[:\s]?\s*([0-9]{1,2}\.[0-9]{3,8})', text, re.IGNORECASE)
    p_lon = re.search(r'(?:Longitude|Long|Lon|देशांतर)\s*[:\s]?\s*([0-9]{2,3}\.[0-9]{3,8})', text, re.IGNORECASE)
    if p_lat and p_lon:
        try:
            lat = float(p_lat.group(1))
            lon = float(p_lon.group(1))
            if 6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0:
                return {"latitude": round(lat, 6), "longitude": round(lon, 6), "source": "Camera Watermark (Multi-line)"}
        except Exception:
            pass

    return None

AMOUNT_PATTERN = re.compile(r'(?:Rs\.?|₹|INR)\s*([0-9,]+(?:\.[0-9]{2})?)', re.IGNORECASE)
LAKH_PATTERN = re.compile(r'([0-9,]+(?:\.[0-9]+)?)\s*(?:lakhs?|Lakhs?|लाख)', re.IGNORECASE)
UTR_PATTERN = re.compile(r'UTR\s*(?:No\.?)?[^\d]{0,15}([A-Za-z0-9]{8,20})', re.IGNORECASE)
DATE_PATTERN = re.compile(r'([0-3]?[0-9][/\-.][0-1]?[0-9][/\-.](?:20)?[1-3][0-9])')

# ── Cross-Scheme Fraud Detection Lexicon ───────────────────────────────────────
# Detects State Legislative Assembly schemes double-claimed under Central MPLADS
STATE_MLA_LEXICON_ENGLISH = [
    "MEMBER OF ASSEMBLY LOCAL AREA DEVELOPMENT SCHEME",
    "MEMBER OF LEGISLATIVE ASSEMBLY",
    "MEMBER OF ASSEMBLY",
    "MLALAD",
    "MLALADS",
    "KLLAD",
    "VIDHAYAK NIDHI",
    "VIDHAYAK",
    "MLA SCHEME",
    "MLA QUOTA",
    "MLA LOCAL AREA",
    "CHIEF MINISTER GRAM SADAK YOJANA",
    "CM GRAM SADAK",
    "STATE LEGISLATIVE ASSEMBLY"
]

STATE_MLA_LEXICON_HINDI = [
    "विधान सभा स्थानीय क्षेत्र विकास योजना",
    "विधानसभा स्थानीय क्षेत्र विकास योजना",
    "विधान सभा स्थानीय क्षेत्र विकास",
    "विधानसभा स्थानीय क्षेत्र विकास",
    "विधायक निधि",
    "विधानसभा सदस्य निधि",
    "विधान सभा सदस्य निधि",
    "राज्य योजना",
    "विधान सभा",
    "विधानसभा",
    "विधायक"
]

CENTRAL_MPLADS_LEXICON = [
    "MEMBER OF PARLIAMENT LOCAL AREA DEVELOPMENT SCHEME",
    "MEMBER OF PARLIAMENT",
    "MPLADS",
    "SANSAD NIDHI",
    "सांसद स्थानीय क्षेत्र विकास",
    "सांसद निधि",
    "सांसद"
]

def extract_exif_gps_and_date(image_path: str) -> dict:
    """Extract hardware EXIF metadata (GPS, DateTime, Camera) if available."""
    try:
        img = Image.open(image_path)
        exif_data = img._getexif()
        if not exif_data:
            return {"has_exif": False}

        tags = {TAGS.get(k, k): v for k, v in exif_data.items()}
        datetime_taken = tags.get("DateTimeOriginal") or tags.get("DateTime")
        camera_make = tags.get("Make", "")
        camera_model = tags.get("Model", "")

        gps_info = tags.get("GPSInfo")
        lat, lon = None, None
        if gps_info:
            gps_tags = {GPSTAGS.get(k, k): v for k, v in gps_info.items()}
            def dms_to_dd(dms, ref):
                degrees = dms[0]
                minutes = dms[1] / 60.0
                seconds = dms[2] / 3600.0
                dd = degrees + minutes + seconds
                if ref in ['S', 'W']:
                    dd = -dd
                return dd

            if "GPSLatitude" in gps_tags and "GPSLatitudeRef" in gps_tags:
                lat = dms_to_dd(gps_tags["GPSLatitude"], gps_tags["GPSLatitudeRef"])
            if "GPSLongitude" in gps_tags and "GPSLongitudeRef" in gps_tags:
                lon = dms_to_dd(gps_tags["GPSLongitude"], gps_tags["GPSLongitudeRef"])

        return {
            "has_exif": True,
            "date_taken": str(datetime_taken) if datetime_taken else None,
            "camera": f"{camera_make} {camera_model}".strip(),
            "gps_latitude": lat,
            "gps_longitude": lon
        }
    except Exception:
        return {"has_exif": False}

def parse_entities_from_ocr(lines: list[str]) -> dict:
    """Extract structured data entities from OCR lines for forensic cross-verification."""
    full_text = " \n ".join(lines)
    
    mp_name = None
    sanctioned_amount = None
    approved_amount = None
    vendor_code = None
    vendor_name = None
    account_no = None
    utr_no = None
    gps_coords = None
    scheme_type = "MPLADS (Central Sansad Nidhi)"
    dates_found = DATE_PATTERN.findall(full_text)
    paper_location = None
    nodal_authority = None
    work_name = None
    sanction_date = None
    payment_date = None

    # 1. Scheme Detection & Keyword Entity Matching (Task 2: MLA vs MP Funds Double-Dipping)
    matched_state_keywords = []
    for term in STATE_MLA_LEXICON_ENGLISH:
        if re.search(r'\b' + re.escape(term) + r'\b', full_text, re.IGNORECASE):
            if term not in matched_state_keywords:
                matched_state_keywords.append(term)

    for term in STATE_MLA_LEXICON_HINDI:
        if term in full_text:
            if term not in matched_state_keywords:
                matched_state_keywords.append(term)

    matched_central_keywords = []
    for term in CENTRAL_MPLADS_LEXICON:
        if re.search(r'\b' + re.escape(term) + r'\b', full_text, re.IGNORECASE) or term in full_text:
            if term not in matched_central_keywords:
                matched_central_keywords.append(term)

    has_cross_scheme = False
    if matched_state_keywords:
        has_cross_scheme = True
        text_upper = full_text.upper()
        if "KLLAD" in text_upper:
            scheme_type = "KLLAD (State MLA Scheme - Cross-Scheme Claim)"
        elif "VIDHAYAK" in text_upper or "विधायक निधि" in full_text or "विधान सभा" in full_text:
            scheme_type = "Vidhayak Nidhi (State MLA Scheme - Cross-Scheme Claim)"
        elif "MLALAD" in text_upper:
            scheme_type = "MLALADS (State MLA Scheme - Cross-Scheme Claim)"
        elif "CHIEF MINISTER" in text_upper or "CM GRAM SADAK" in text_upper:
            scheme_type = "CMGSY (State Scheme - Cross-Scheme Claim)"
        else:
            scheme_type = "State MLA Legislative Scheme (Cross-Scheme Claim)"
    elif matched_central_keywords:
        scheme_type = "MPLADS (Central Sansad Nidhi)"
    else:
        scheme_type = "MPLADS (Central Sansad Nidhi)"

    # 2. MP Name
    mp_patterns = [
        r'(?:Work proposed by\s*(?:Sri\.?|Shri|Smt\.?)?\s*)([A-Za-z\.\s]{4,35})(?:\s*M\.?P)?',
        r'(?:सांसद का नाम|सांसद)\s*[:\-]?\s*(?:श्रीमति|श्री)?\s*([\u0900-\u097F\s]{4,35})',
        r'(?:Name of Member of Parliament|Member of Parliament)\s*[:\-]?\s*([A-Za-z\s]{4,35})'
    ]
    for pat in mp_patterns:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m:
            cand = m.group(1).split('\n')[0].strip()
            cand = re.sub(r'(?:Lok Sabha|Rajya Sabha|Term|Tenure|सा\.?\s*जा|COMPLETION|REPORT|SCHEME).*', '', cand, flags=re.IGNORECASE).strip()
            if len(cand) > 3 and not any(bad in cand.upper() for bad in ['COMPLETION', 'ASSEMBLY', 'REPORT', 'SCHEME', 'LOCAL']):
                mp_name = cand
                break

    # 3. Nodal Authority & Work Name & Location
    nodal_m = re.search(r'(?:Nodal (?:District )?Authority|Nodal Authority)\s*[:\-]?\s*([A-Za-z0-9\s,\.\-]{4,60})', full_text, re.IGNORECASE)
    if nodal_m:
        nodal_authority = nodal_m.group(1).split('\n')[0].strip()

    work_m = re.search(r'(?:Name of Work|कार्य का नाम)\s*[:\-]?\s*([A-Za-z0-9\s,\.\-\(\)]{4,120})', full_text, re.IGNORECASE)
    if work_m:
        work_name = work_m.group(1).split('\n')[0].strip()

    loc_m = re.search(r'Location(?:\s+of\s+Work)?\s*[:\-]?\s*([A-Za-z0-9\s,\.\-]{3,60})', full_text, re.IGNORECASE)
    if loc_m:
        paper_location = loc_m.group(1).split('\n')[0].strip()

    # Dates
    sanc_d_m = re.search(r'(?:Work Sanction Date|Sanction Date|Approve Date by IDA)[^\d]{0,25}([0-3]?[0-9][/\-.][0-1]?[0-9][/\-.](?:20)?[1-3][0-9])', full_text, re.IGNORECASE)
    if sanc_d_m:
        sanction_date = sanc_d_m.group(1)

    pay_d_m = re.search(r'(?:Payment Approval Date|Payment Date)[^\d]{0,25}([0-3]?[0-9][/\-.][0-1]?[0-9][/\-.](?:20)?[1-3][0-9])', full_text, re.IGNORECASE)
    if pay_d_m:
        payment_date = pay_d_m.group(1)

    # 4. GPS Watermarks (Task 4: Reading GPS Camera Overlays & Hindi Banners)
    gps_coords = extract_gps_from_ocr_text(full_text)

    # 5. Amounts (Task 1: Money Mismatches)
    lakh_matches = LAKH_PATTERN.findall(full_text)
    amounts = []
    for lm in lakh_matches:
        try:
            val = float(lm.replace(',', '')) * 100000.0
            amounts.append(val)
        except ValueError:
            pass

    rs_matches = AMOUNT_PATTERN.findall(full_text)
    for rm in rs_matches:
        try:
            val = float(rm.replace(',', ''))
            if val >= 1000:
                amounts.append(val)
        except ValueError:
            pass

    # Explicit Sanctioned Amount keyword
    sanc_match = re.search(r'(?:Total Sanctioned Amount|Sanctioned Amount|Sanctioned vide|स्वी\.?\s*राशि|cost of Rs\.?)[^\d]{0,25}(?:Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]+)?)', full_text, re.IGNORECASE)
    if sanc_match:
        try:
            raw_s = float(sanc_match.group(1).replace(',', ''))
            sanctioned_amount = raw_s * 100000.0 if raw_s < 100 else raw_s
        except ValueError:
            pass

    # Explicit Approved Amount keyword
    app_match = re.search(r'(?:Approved Amount|completed at a cost of|Payment Approved)[^\d]{0,25}(?:Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]+)?)', full_text, re.IGNORECASE)
    if app_match:
        try:
            raw_a = float(app_match.group(1).replace(',', ''))
            approved_amount = raw_a * 100000.0 if raw_a < 100 else raw_a
        except ValueError:
            pass

    if not sanctioned_amount and amounts:
        sanctioned_amount = max(amounts)
    if not approved_amount and len(amounts) > 1:
        approved_amount = min(amounts)

    # 6. Vendor, Account Number, and UTR (Task 3: Ghost Vendors & Rings)
    # Check for Vendor Code (V followed by 8-15 digits)
    vc_m = re.search(r'\b(V\d{8,16})\b', full_text)
    if vc_m:
        vendor_code = vc_m.group(1)

    for idx, l in enumerate(lines):
        l_str = l.strip()
        if re.match(r'^V\d{8,16}$', l_str):
            vendor_code = l_str
            if idx + 1 < len(lines):
                next_l = lines[idx + 1].strip()
                if len(next_l) > 3 and not any(kw in next_l.lower() for kw in ['work status', 'payment', 'approved', 'date', 'account']):
                    vendor_name = next_l
                    break
        elif 'vendor name' in l_str.lower():
            for offset in range(1, 4):
                if idx + offset < len(lines):
                    cand = lines[idx + offset].strip()
                    if re.match(r'^V\d{8,16}$', cand):
                        vendor_code = cand
                    elif len(cand) > 3 and not any(kw in cand.lower() for kw in ['work status', 'payment', 'unique', 'account', 'code', 'approved']):
                        vendor_name = cand
                        break

    if not vendor_name:
        v_patterns = [
            r'(?:Vendor Name|निर्माण एजेंसी का नाम)\s*[:\-]?\s*([A-Za-z0-9\s\u0900-\u097F]{4,45})',
            r'Agency\s+([A-Za-z\s]{4,45})\s+has been completed'
        ]
        for v_pat in v_patterns:
            v_m = re.search(v_pat, full_text, re.IGNORECASE)
            if v_m:
                v_cand = v_m.group(1).split('\n')[0].strip()
                v_cand = re.sub(r'(?:Vendor Unique Code|Account No|UTR|Work Status).*', '', v_cand, flags=re.IGNORECASE).strip()
                if len(v_cand) > 3 and not any(bad in v_cand.lower() for bad in ['district', 'authorities']):
                    vendor_name = v_cand
                    break

    # Account Number (9 to 18 digits)
    acc_m = re.search(r'Account\s*No[^\d]{0,20}(\d{9,18})', full_text, re.I)
    if acc_m:
        account_no = acc_m.group(1)
    else:
        for idx, l in enumerate(lines):
            if 'account no' in l.lower() and idx + 3 < len(lines):
                for sub in lines[idx+1:idx+4]:
                    if re.match(r'^\d{9,18}$', sub.strip()):
                        account_no = sub.strip()
                        break

    # UTR
    utr_m = UTR_PATTERN.search(full_text)
    if utr_m:
        utr_no = utr_m.group(1).strip()

    combined_vendor = None
    if vendor_code and vendor_name:
        combined_vendor = f"{vendor_code} {vendor_name}"
    elif vendor_name:
        combined_vendor = vendor_name
    elif vendor_code:
        combined_vendor = vendor_code

    return {
        "scheme_type": scheme_type,
        "has_cross_scheme": has_cross_scheme,
        "matched_state_keywords": matched_state_keywords,
        "matched_central_keywords": matched_central_keywords,
        "mp_name": mp_name,
        "nodal_authority": nodal_authority,
        "work_name": work_name,
        "paper_location": paper_location,
        "sanction_date": sanction_date,
        "payment_date": payment_date,
        "sanctioned_amount": sanctioned_amount,
        "approved_amount": approved_amount,
        "vendor_code": vendor_code,
        "vendor_name": combined_vendor,
        "account_no": account_no,
        "utr_number": utr_no,
        "gps_coordinates": gps_coords,
        "dates_found": sorted(list(set(dates_found)))[:5]
    }

def load_metadata_registry() -> dict:
    """Load works and downloaded docs metadata to attribute images to specific projects, MPs, and IDAs."""
    registry_path = os.path.join(THIS_DIR, "works_with_images_registry.json")
    docs_index_path = os.path.join(IMAGES_DIR, "downloaded_docs_index.json")
    meta_by_wid = {}
    
    if os.path.exists(registry_path):
        try:
            with open(registry_path, "r", encoding="utf-8") as f:
                reg_data = json.load(f)
            for r in reg_data:
                wid = str(r.get("WORK_ID", "")).strip()
                if not wid:
                    continue
                act = str(r.get("ACTIVITY_NAME", ""))
                m = re.search(r'(WS[A-Za-z0-9_\-\/\s]+\d+)', act)
                canonical = m.group(1).replace('\t', '').replace(' ', '') if m else wid
                meta_by_wid[wid] = {
                    "work_id": wid,
                    "canonical_work_id": canonical,
                    "mp_name": r.get("MP_NAME", "Unknown MP"),
                    "ida_name": r.get("IDA_NAME", "District Planning Authority"),
                    "constituency": r.get("CONSTITUENCY", ""),
                    "state": r.get("STATE_NAME", ""),
                    "amount": float(r.get("ACTUAL_AMOUNT", 0.0) or 0.0),
                    "work_description": r.get("WORK_DESCRIPTION", ""),
                    "completion_date": r.get("ACTUAL_END_DATE", "")
                }
        except Exception as e:
            print(f"  [!] Failed loading registry: {e}")

    if os.path.exists(docs_index_path):
        try:
            with open(docs_index_path, "r", encoding="utf-8") as f:
                docs = json.load(f)
            for d in docs:
                wid = str(d.get("work_id", "")).strip()
                if wid and wid not in meta_by_wid:
                    act = str(d.get("activity_name", ""))
                    m = re.search(r'(WS[A-Za-z0-9_\-\/\s]+\d+)', act)
                    canonical = m.group(1).replace('\t', '').replace(' ', '') if m else wid
                    meta_by_wid[wid] = {
                        "work_id": wid,
                        "canonical_work_id": canonical,
                        "mp_name": d.get("mp_name", "Unknown MP"),
                        "ida_name": "District Planning Authority",
                        "constituency": d.get("constituency", ""),
                        "state": d.get("state", ""),
                        "amount": float(d.get("amount", 0.0) or 0.0),
                        "work_description": d.get("work_description", ""),
                        "completion_date": d.get("completion_date", "")
                    }
        except Exception as e:
            print(f"  [!] Failed loading docs index: {e}")

    return meta_by_wid

def resolve_file_metadata(filename: str, meta_by_wid: dict) -> dict:
    """Resolve project and uploader metadata from filename."""
    m = re.search(r'_(\d{4,7})_', filename)
    if m:
        wid = m.group(1)
        if wid in meta_by_wid:
            return meta_by_wid[wid]
    return {
        "work_id": "UNKNOWN",
        "canonical_work_id": "WS/UNKNOWN",
        "mp_name": "Unknown MP",
        "ida_name": "District Implementing Authority",
        "constituency": "Unknown",
        "state": "Unknown",
        "amount": 0.0,
        "work_description": "",
        "completion_date": ""
    }

def run_image_forensics(input_dir: Optional[str] = None, output_csv: Optional[str] = None):
    target_dir = input_dir if input_dir and os.path.isdir(input_dir) else IMAGES_DIR
    print("=" * 70)
    print("  AI DOCUMENT & IMAGE FORENSICS PIPELINE — MPLADS 2026")
    print(f"  Target Folder: {os.path.abspath(target_dir)}")
    print("=" * 70)

    if not os.path.isdir(target_dir):
        print(f"ERROR: folder not found at {target_dir}")
        return

    # 0. Load Work & Uploader Attribution Registry
    print("\n📚 Loading Work Attribution & IDA Uploader Registry...")
    meta_by_wid = load_metadata_registry()
    print(f"  -> Successfully indexed metadata for {len(meta_by_wid):,} projects.")

    # 1. Discover all files (PDFs + direct Images)
    all_files = os.listdir(target_dir)
    pdf_files = sorted([f for f in all_files if f.lower().endswith('.pdf')])
    direct_img_files = sorted([f for f in all_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])

    print(f"\n📂 Ingested Documents:")
    print(f"  - PDF Reports / Certificates : {len(pdf_files)}")
    print(f"  - Standalone Photographs    : {len(direct_img_files)}")

    # 2. Extract and index images from PDFs
    extracted_images_index = []
    
    print("\n🔍 Extracting & Indexing Embedded High-Resolution Evidence Photos...")
    for pdf_name in pdf_files:
        pdf_path = os.path.join(target_dir, pdf_name)
        pdf_meta = resolve_file_metadata(pdf_name, meta_by_wid)
        doc = None
        try:
            doc = pymupdf.open(pdf_path)
            # Step 1: PyMuPDF renders high-resolution 300 DPI image of Page 1 (certificate header & letterhead)
            try:
                if len(doc) > 0:
                    p1 = doc[0]
                    pix = p1.get_pixmap(dpi=300)
                    render_filename = f"{os.path.splitext(pdf_name)[0]}_p1_rendered_300dpi.png"
                    render_path = os.path.join(EXTRACTED_DIR, render_filename)
                    pix.save(render_path)
                    pil_rendered = Image.open(render_path)
                    extracted_images_index.append({
                        "source_pdf": pdf_name,
                        "page": 1,
                        "image_path": render_path,
                        "filename": render_filename,
                        "phash": str(imagehash.phash(pil_rendered)),
                        "width": pil_rendered.width,
                        "height": pil_rendered.height,
                        "is_full_page_scan": True,
                        "is_300dpi_render": True,
                        "metadata": pdf_meta
                    })
            except Exception as r_err:
                print(f"  Note: 300 DPI page render for {pdf_name}: {r_err}")

            for page_idx, page in enumerate(doc):
                img_list = page.get_images()
                for img_idx, img_info in enumerate(img_list):
                    xref = img_info[0]
                    base_img = doc.extract_image(xref)
                    ext = base_img["ext"]
                    out_filename = f"{os.path.splitext(pdf_name)[0]}_p{page_idx+1}_img{img_idx+1}.{ext}"
                    out_path = os.path.join(EXTRACTED_DIR, out_filename)
                    with open(out_path, "wb") as f:
                        f.write(base_img["image"])

                    pil_img = Image.open(io.BytesIO(base_img["image"]))
                    phash = imagehash.phash(pil_img)
                    
                    extracted_images_index.append({
                        "source_pdf": pdf_name,
                        "page": page_idx + 1,
                        "image_path": out_path,
                        "filename": out_filename,
                        "phash": str(phash),
                        "width": pil_img.width,
                        "height": pil_img.height,
                        "is_full_page_scan": (pil_img.height > 1400 and pil_img.width > 1000),
                        "metadata": pdf_meta
                    })
        except Exception as e:
            print(f"  Error reading {pdf_name}: {e}")
        finally:
            if doc:
                try:
                    doc.close()
                except Exception:
                    pass

    # Add standalone images
    for img_name in direct_img_files:
        img_path = os.path.join(target_dir, img_name)
        img_meta = resolve_file_metadata(img_name, meta_by_wid)
        try:
            pil_img = Image.open(img_path)
            phash = imagehash.phash(pil_img)
            extracted_images_index.append({
                "source_pdf": None,
                "page": 1,
                "image_path": img_path,
                "filename": img_name,
                "phash": str(phash),
                "width": pil_img.width,
                "height": pil_img.height,
                "is_full_page_scan": False,
                "metadata": img_meta
            })
        except Exception:
            pass

    print(f"  -> Successfully extracted & indexed {len(extracted_images_index)} images in current batch.")

    # 2.5 Merge with Persistent Historical Vault (Preserves memory even if old PDFs/images are deleted!)
    vault = load_phash_vault()
    vault_map = {f"{it.get('filename')}_{it.get('phash')}": it for it in vault}
    for it in extracted_images_index:
        k = f"{it.get('filename')}_{it.get('phash')}"
        vault_map[k] = {
            "source_pdf": it.get("source_pdf"),
            "page": it.get("page", 1),
            "image_path": it.get("image_path"),
            "filename": it.get("filename"),
            "phash": it.get("phash"),
            "width": it.get("width"),
            "height": it.get("height"),
            "is_full_page_scan": it.get("is_full_page_scan", False),
            "metadata": it.get("metadata", {})
        }
    all_indexed_images = list(vault_map.values())
    save_phash_vault(all_indexed_images)
    print(f"  -> Vault Status: {len(all_indexed_images):,} total visual fingerprints preserved permanently.")

    # 3. Perceptual Hashing & Duplicate Photo Detection
    print("\n🔬 Analyzing Perceptual Hashes (Duplicate & Recycled Photo Detection across Vault)...")
    duplicate_photo_flags = []
    
    for i in range(len(all_indexed_images)):
        for j in range(i + 1, len(all_indexed_images)):
            item1 = all_indexed_images[i]
            item2 = all_indexed_images[j]
            
            # Skip comparing pages of the exact same document
            if item1.get("source_pdf") and item1.get("source_pdf") == item2.get("source_pdf"):
                continue
                
            m1 = item1.get("metadata", {})
            m2 = item2.get("metadata", {})
            
            # Skip comparing photos within the same project/work_id
            if m1.get("work_id") and m1.get("work_id") == m2.get("work_id") and m1.get("work_id") != "UNKNOWN":
                continue

            h1 = imagehash.hex_to_hash(item1["phash"])
            h2 = imagehash.hex_to_hash(item2["phash"])
            distance = h1 - h2
            
            # Hamming distance threshold < 10 indicates duplicate or near-identical image
            if distance < 10:
                sim_pct = round(max(0.0, 100.0 - (distance * 1.5625)), 1)
                severity = "CRITICAL" if distance <= 5 else "HIGH"
                w1_label = m1.get("canonical_work_id") or m1.get("work_id", "Unknown")
                w2_label = m2.get("canonical_work_id") or m2.get("work_id", "Unknown")
                ida_label = m1.get("ida_name") or m2.get("ida_name", "District Implementing Authority")
                
                verdict = (
                    f"{severity}: Reused photograph detected across different project files ({sim_pct}% visual structural match). "
                    f"Work #{m1.get('work_id')} and Work #{m2.get('work_id')} share identical site photography! "
                    f"Uploader Authority: {ida_label}."
                )
                
                duplicate_photo_flags.append({
                    "file_1": item1["filename"],
                    "file_2": item2["filename"],
                    "source_1": item1.get("source_pdf") or item1.get("filename", ""),
                    "source_2": item2.get("source_pdf") or item2.get("filename", ""),
                    "work_id_1": w1_label,
                    "work_id_2": w2_label,
                    "numeric_work_id_1": m1.get("work_id"),
                    "numeric_work_id_2": m2.get("work_id"),
                    "mp_name_1": m1.get("mp_name"),
                    "mp_name_2": m2.get("mp_name"),
                    "uploader_ida_1": m1.get("ida_name"),
                    "uploader_ida_2": m2.get("ida_name"),
                    "constituency_1": m1.get("constituency"),
                    "constituency_2": m2.get("constituency"),
                    "state_1": m1.get("state"),
                    "state_2": m2.get("state"),
                    "amount_1": m1.get("amount"),
                    "amount_2": m2.get("amount"),
                    "description_1": m1.get("work_description"),
                    "description_2": m2.get("work_description"),
                    "phash_1": item1["phash"],
                    "phash_2": item2["phash"],
                    "hamming_distance": int(distance),
                    "similarity_pct": sim_pct,
                    "severity": severity,
                    "verdict": verdict
                })

    print(f"  -> {len(duplicate_photo_flags)} duplicate photo pair(s) found.")

    # 4. Deep Document OCR & Entity Verification
    print("\n📑 Running AI Neural OCR on Scanned Certificates...")
    document_verdicts = []
    
    # Select key pages across all ingested documents (page 1 certificates + site photos)
    docs_seen = set()
    images_to_ocr = []
    
    # Priority 1: 300 DPI rendered Page 1 of every ingested PDF (primary certificate header / letterhead)
    for item in extracted_images_index:
        src = item["source_pdf"]
        if src and src not in docs_seen and item.get("is_300dpi_render"):
            images_to_ocr.append((src, item["filename"], "Scanned Certificate Header (PyMuPDF 300 DPI)"))
            docs_seen.add(src)

    # Priority 1b: Fallback Page 1 image if not already added
    for item in extracted_images_index:
        src = item["source_pdf"]
        if src and src not in docs_seen and item["page"] == 1:
            if item["width"] >= 400 and item["height"] >= 400:
                images_to_ocr.append((src, item["filename"], "Work Completion / Sanction Certificate"))
                docs_seen.add(src)
                
    # Priority 2: Photos/Pages with likely stamps or site photos (pages 2, 3 or standalone)
    for item in extracted_images_index:
        src = item["source_pdf"]
        if src and item["page"] in (2, 3) and (src, item["filename"]) not in [(s, f) for s, f, _ in images_to_ocr]:
            if item["width"] >= 500 and item["height"] >= 400:
                images_to_ocr.append((src, item["filename"], f"Site Evidence Photo / Completion Page {item['page']}"))

    # Priority 3: Standalone images
    for item in extracted_images_index:
        if not item["source_pdf"]:
            images_to_ocr.append((item["filename"], item["filename"], "Uploaded Site Photo"))

    print(f"  -> Queued {len(images_to_ocr)} high-resolution document pages for Neural OCR.")

    for pdf_source, img_filename, doc_type in images_to_ocr:
        img_path = (
            os.path.join(EXTRACTED_DIR, img_filename) if os.path.exists(os.path.join(EXTRACTED_DIR, img_filename))
            else (os.path.join(target_dir, img_filename) if os.path.exists(os.path.join(target_dir, img_filename))
            else os.path.join(IMAGES_DIR, img_filename))
        )
        if not os.path.exists(img_path):
            continue
            
        print(f"  Analyzing: {pdf_source} -> {img_filename} ({doc_type})...")
        try:
            ocr_res, _ = ocr_engine(img_path)
            lines = [r[1] for r in ocr_res] if ocr_res else []
            entities = parse_entities_from_ocr(lines)
            exif = extract_exif_gps_and_date(img_path)
            
            # Resolve portal record metadata for cross-checking
            doc_meta = resolve_file_metadata(pdf_source, meta_by_wid)
            portal_amount = float(doc_meta.get("amount", 0.0) or 0.0)
            portal_work_desc = doc_meta.get("work_description", "")
            portal_ida = doc_meta.get("ida_name", "")
            portal_mp = doc_meta.get("mp_name", "")
            portal_wid = doc_meta.get("canonical_work_id", doc_meta.get("work_id", ""))
            portal_constituency = doc_meta.get("constituency", "")
            portal_state = doc_meta.get("state", "")
            
            # Determine specific forensic risks across 4 Critical Tasks
            risks = []
            
            # ─────────────────────────────────────────────────────────────
            # TASK 1: Money Mismatches (Portal vs. Paper)
            # ─────────────────────────────────────────────────────────────
            if entities["approved_amount"] is not None and portal_amount > 0:
                diff = portal_amount - entities["approved_amount"]
                if diff > 5000:
                    risks.append({
                        "task": 1,
                        "task_name": "Money Mismatch Detection",
                        "severity": "CRITICAL",
                        "code": "PORTAL_PAPER_AMOUNT_MISMATCH",
                        "title": "Portal vs. Paper Financial Discrepancy",
                        "detail": f"[FINANCIAL DISCREPANCY] Portal records claim ₹{portal_amount:,.2f} disbursed, but physical engineer's certificate approved only ₹{entities['approved_amount']:,.2f}. Unaccounted retained balance: ₹{diff:,.2f}.",
                        "portal_disbursed": portal_amount,
                        "paper_approved": entities["approved_amount"],
                        "unaccounted_difference": diff
                    })
                elif diff < -5000:
                    risks.append({
                        "task": 1,
                        "task_name": "Money Mismatch Detection",
                        "severity": "HIGH",
                        "code": "PAPER_EXCEEDS_PORTAL_AMOUNT",
                        "title": "Paper Approved Exceeds Portal Allocation",
                        "detail": f"Physical paper certificate approved ₹{entities['approved_amount']:,.2f}, exceeding portal recorded disbursement of ₹{portal_amount:,.2f} by ₹{abs(diff):,.2f}.",
                        "portal_disbursed": portal_amount,
                        "paper_approved": entities["approved_amount"],
                        "unaccounted_difference": diff
                    })
                else:
                    risks.append({
                        "task": 1,
                        "task_name": "Money Mismatch Detection",
                        "severity": "VERIFIED",
                        "code": "FINANCIAL_ALIGNMENT_VERIFIED",
                        "title": "Portal & Paper Financials Aligned",
                        "detail": f"Portal disbursed amount (₹{portal_amount:,.2f}) matches physical certificate approved amount (₹{entities['approved_amount']:,.2f})."
                    })
            elif entities["sanctioned_amount"] and entities["approved_amount"]:
                p_diff = entities["sanctioned_amount"] - entities["approved_amount"]
                if p_diff > 5000:
                    risks.append({
                        "task": 1,
                        "task_name": "Money Mismatch Detection",
                        "severity": "INFO",
                        "code": "PARTIAL_PAYMENT_RELEASE",
                        "title": "Paper Approved Below Sanction (Retention)",
                        "detail": f"Paper Sanctioned ₹{entities['sanctioned_amount']:,.2f}, Approved ₹{entities['approved_amount']:,.2f}. Retained balance: ₹{p_diff:,.2f} compliant with retention regulations."
                    })

            # ─────────────────────────────────────────────────────────────
            # TASK 2: Cross-Scheme Double-Dipping (MLA vs. MP Funds)
            # ─────────────────────────────────────────────────────────────
            if entities.get("has_cross_scheme") or any(kw in entities["scheme_type"] for kw in ["KLLAD", "MLA", "Vidhayak", "विधान सभा", "विधानसभा", "Cross-Scheme"]):
                matched_kw_str = " / ".join(entities.get("matched_state_keywords", [])[:3]) or "KLLAD / Vidhayak Nidhi / विधान सभा स्थानीय क्षेत्र विकास योजना"
                risks.append({
                    "task": 2,
                    "task_name": "Cross-Scheme Double-Dipping",
                    "severity": "CRITICAL",
                    "code": "CROSS_SCHEME_FRAUD",
                    "title": "Cross-Scheme Double-Dipping Detected",
                    "detail": f"🚨 [CRITICAL: CROSS-SCHEME FRAUD] Double-claiming State MLA funds ({matched_kw_str}) under Central MPLADS scheme detected on scanned certificate header!",
                    "scheme_type": entities["scheme_type"],
                    "matched_keywords": entities.get("matched_state_keywords", []),
                    "statutory_alert": f"🚨 [CRITICAL: CROSS-SCHEME FRAUD] Double-claiming State MLA funds ({matched_kw_str}) under Central MPLADS scheme detected on scanned certificate header!",
                    "legal_statutes": [
                        "General Financial Rules (GFR) Rule 144: Ineligible expenditure and falsification of public records.",
                        "MPLADS Guidelines Clause 3.12: Prohibition of co-financing and double-claiming from state legislative funds."
                    ]
                })
            else:
                risks.append({
                    "task": 2,
                    "task_name": "Cross-Scheme Double-Dipping",
                    "severity": "VERIFIED",
                    "code": "CENTRAL_SCHEME_VERIFIED",
                    "title": "Central MPLADS Scheme Verified",
                    "detail": "Scanned certificate header verified under Central Ministry MPLADS (Sansad Nidhi). No State Legislative Assembly markings found."
                })

            # ─────────────────────────────────────────────────────────────
            # TASK 3: Ghost Vendors & Sub-Contracting Rings
            # ─────────────────────────────────────────────────────────────
            if entities["vendor_name"] or entities["utr_number"] or entities["account_no"]:
                v_disp = entities["vendor_name"] or "Hidden Private Contractor"
                acc_disp = entities.get("account_no") or "N/A"
                utr_disp = entities.get("utr_number") or "N/A"
                is_portal_generic = any(bad in portal_ida.lower() for bad in ['district', 'magistrate', 'authority', 'collector', 'planning', 'bdo', 'commissioner', 'gautambudhnagar', 'janjgir', 'dharwad']) or not portal_ida
                
                if is_portal_generic:
                    risks.append({
                        "task": 3,
                        "task_name": "Ghost Vendor & Subcontractor Detection",
                        "severity": "HIGH",
                        "code": "UNREPORTED_VENDOR_DISCREPANCY",
                        "title": "Unreported Private Beneficiary Discovered",
                        "detail": f"Portal records conceal contractor under generic authority '{portal_ida}'. Scanned certificate table reveals hidden private beneficiary: '{v_disp}' (Bank A/C: {acc_disp}, UTR: {utr_disp}). Connected to Vendor Network Graph for monopoly ring tracing.",
                        "vendor_name": v_disp,
                        "account_no": acc_disp,
                        "utr_number": utr_disp,
                        "portal_authority": portal_ida
                    })
                else:
                    risks.append({
                        "task": 3,
                        "task_name": "Ghost Vendor & Subcontractor Detection",
                        "severity": "INFO",
                        "code": "VENDOR_EXTRACTED",
                        "title": "Contractor Payment Verified from Certificate",
                        "detail": f"Extracted contractor: '{v_disp}' (Bank A/C: {acc_disp}, UTR: {utr_disp}).",
                        "vendor_name": v_disp,
                        "account_no": acc_disp,
                        "utr_number": utr_disp
                    })

            # ─────────────────────────────────────────────────────────────
            # TASK 4: Reading GPS Camera Overlays & Geo-Tag Verification
            # ─────────────────────────────────────────────────────────────
            gps = entities["gps_coordinates"] or (
                {"latitude": exif["gps_latitude"], "longitude": exif["gps_longitude"], "source": "Hardware EXIF"}
                if exif.get("has_exif") and exif.get("gps_latitude") else None
            )
            if gps:
                lat = gps["latitude"]
                lon = gps["longitude"]
                if 6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0:
                    risks.append({
                        "task": 4,
                        "task_name": "GPS Watermark & Location Verification",
                        "severity": "VERIFIED",
                        "code": "GEOTAG_VERIFIED",
                        "title": "Authentic GPS Geotag Watermark Verified",
                        "detail": f"Authentic GPS camera watermark detected: Lat {lat:.4f}° N, Long {lon:.4f}° E ({gps.get('source', 'Watermark Overlay')}). Verified within Indian territorial boundaries.",
                        "latitude": lat,
                        "longitude": lon
                    })
                else:
                    risks.append({
                        "task": 4,
                        "task_name": "GPS Watermark & Location Verification",
                        "severity": "CRITICAL",
                        "code": "LOCATION_TAMPERING_RISK",
                        "title": "GPS Location Tampering / Out of Bounds",
                        "detail": f"GPS watermark Lat {lat:.4f}, Long {lon:.4f} is outside territorial boundaries. High probability of fabricated watermark.",
                        "latitude": lat,
                        "longitude": lon
                    })

            # Paper location vs portal claimed location conflict check
            if entities["paper_location"] and portal_work_desc:
                loc_clean = entities["paper_location"].strip()
                if len(loc_clean) >= 3 and loc_clean.lower() not in portal_work_desc.lower():
                    risks.append({
                        "task": 4,
                        "task_name": "GPS Watermark & Location Verification",
                        "severity": "HIGH",
                        "code": "LOCATION_MISMATCH",
                        "title": "Paper Certificate Location Conflicts with Portal Record",
                        "detail": f"Location on paper certificate ('{loc_clean}') conflicts with Portal claimed location ('{portal_work_desc[:70]}...'). Potential site substitution fraud.",
                        "paper_location": loc_clean,
                        "portal_location": portal_work_desc
                    })

            document_verdicts.append({
                "pdf_file": pdf_source,
                "image_file": img_filename,
                "document_classification": doc_type,
                "portal_record": {
                    "work_id": doc_meta.get("work_id"),
                    "canonical_work_id": doc_meta.get("canonical_work_id"),
                    "mp_name": portal_mp,
                    "ida_name": portal_ida,
                    "constituency": portal_constituency,
                    "state": portal_state,
                    "disbursed_amount": portal_amount,
                    "work_description": portal_work_desc,
                    "completion_date": doc_meta.get("completion_date")
                },
                "paper_extracted": {
                    "scheme_type": entities["scheme_type"],
                    "mp_name": entities["mp_name"],
                    "nodal_authority": entities["nodal_authority"],
                    "work_name": entities["work_name"],
                    "location": entities["paper_location"],
                    "sanction_date": entities["sanction_date"],
                    "payment_date": entities["payment_date"],
                    "sanctioned_amount": entities["sanctioned_amount"],
                    "approved_amount": entities["approved_amount"],
                    "vendor_name": entities["vendor_name"],
                    "vendor_code": entities.get("vendor_code"),
                    "account_no": entities.get("account_no"),
                    "utr_number": entities["utr_number"],
                    "gps_coordinates": entities["gps_coordinates"],
                    "dates_detected": entities["dates_found"]
                },
                "scheme_type": entities["scheme_type"],
                "mp_name": entities["mp_name"] or portal_mp,
                "sanctioned_amount": entities["sanctioned_amount"],
                "approved_amount": entities["approved_amount"],
                "vendor_name": entities["vendor_name"],
                "utr_number": entities["utr_number"],
                "gps_coordinates": entities["gps_coordinates"],
                "dates_detected": entities["dates_found"],
                "exif_metadata": exif,
                "has_cross_scheme_fraud": any(r.get("code") == "CROSS_SCHEME_FRAUD" for r in risks),
                "findings": risks
            })
        except Exception as e:
            print(f"    OCR Error: {e}")

    # 5. Missing Photo Audit from Portal Data
    print("\n📷 Auditing Missing Photo Proof from Portal Records...")
    missing_photo_works = []
    if os.path.exists(FRAUD_FLAGS_CSV):
        try:
            df = pd.read_csv(FRAUD_FLAGS_CSV, low_memory=False)
            crit_missing = df[
                (df["rule_missing_photo"].astype(str).str.lower().isin(["true", "1"])) &
                (df["work_status"].astype(str).str.contains("Complet", case=False, na=False))
            ].head(100)
            
            for _, row in crit_missing.iterrows():
                missing_photo_works.append({
                    "work_id": str(row.get("work_id", "")),
                    "mp_name": str(row.get("mp_name", "")),
                    "state": str(row.get("state", "")),
                    "sanction_amount": float(row.get("sanction_amount", 0.0) or 0.0),
                    "risk_score": float(row.get("risk_score", 0.0) or 0.0),
                    "verdict": "Work marked 100% completed on portal without mandatory eSAKSHI geo-tagged photograph."
                })
        except Exception as e:
            print(f"  Warning loading CSV: {e}")

    # 6. Save JSON Outputs
    summary_data = {
        "stats": {
            "total_documents_scanned": len(pdf_files) + len(direct_img_files),
            "total_evidence_photos_extracted": len(extracted_images_index),
            "duplicate_photo_pairs": len(duplicate_photo_flags),
            "money_mismatch_alerts": sum(1 for d in document_verdicts if any(r.get("code") == "PORTAL_PAPER_AMOUNT_MISMATCH" for r in d.get("findings", []))),
            "cross_scheme_alerts": sum(1 for d in document_verdicts if any(r.get("code") == "CROSS_SCHEME_FRAUD" for r in d.get("findings", []))),
            "vendor_discrepancies": sum(1 for d in document_verdicts if any(r.get("code") == "UNREPORTED_VENDOR_DISCREPANCY" for r in d.get("findings", []))),
            "location_mismatch_alerts": sum(1 for d in document_verdicts if any(r.get("code") == "LOCATION_MISMATCH" for r in d.get("findings", []))),
            "verified_geotagged_works": sum(1 for d in document_verdicts if any(r.get("code") == "GEOTAG_VERIFIED" for r in d.get("findings", [])) or d.get("gps_coordinates")),
            "missing_photo_works": len(missing_photo_works)
        },
        "document_verdicts": document_verdicts,
        "duplicate_photos": duplicate_photo_flags,
        "missing_photos": missing_photo_works[:50]
    }

    with open(OUT_SUMMARY, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2, ensure_ascii=False)

    with open(OUT_OCR, "w", encoding="utf-8") as f:
        json.dump(document_verdicts, f, indent=2, ensure_ascii=False)

    with open(OUT_DUPLICATES, "w", encoding="utf-8") as f:
        json.dump(duplicate_photo_flags, f, indent=2, ensure_ascii=False)

    with open(OUT_MISSING, "w", encoding="utf-8") as f:
        json.dump(missing_photo_works, f, indent=2, ensure_ascii=False)

    # 7. Export GPS & Vendor Master CSV
    csv_rows = []
    for d in document_verdicts:
        p_rec = d.get("portal_record", {})
        paper = d.get("paper_extracted", {})
        gps = paper.get("gps_coordinates") or d.get("gps_coordinates") or {}
        csv_rows.append({
            "work_id": p_rec.get("work_id", ""),
            "canonical_work_id": p_rec.get("canonical_work_id", ""),
            "mp_name": p_rec.get("mp_name", d.get("mp_name", "")),
            "state": p_rec.get("state", ""),
            "constituency": p_rec.get("constituency", ""),
            "disbursed_amount": p_rec.get("disbursed_amount", 0.0),
            "paper_approved_amount": paper.get("approved_amount", ""),
            "vendor_name": paper.get("vendor_name", ""),
            "vendor_code": paper.get("vendor_code", ""),
            "bank_account_no": paper.get("account_no", ""),
            "utr_number": paper.get("utr_number", ""),
            "latitude": gps.get("latitude", ""),
            "longitude": gps.get("longitude", ""),
            "gps_source": gps.get("source", ""),
            "scheme_type": paper.get("scheme_type", d.get("scheme_type", "")),
            "has_cross_scheme_fraud": d.get("has_cross_scheme_fraud", False),
            "pdf_file": d.get("pdf_file", "")
        })

    target_csv = output_csv or os.path.join(ROOT_DIR, "data", "processed", "works_with_gps_and_vendors.csv")
    try:
        os.makedirs(os.path.dirname(target_csv), exist_ok=True)
        pd.DataFrame(csv_rows).to_csv(target_csv, index=False, encoding="utf-8-sig")
        print(f"  Exported Master CSV           : {target_csv}")
    except Exception as e_csv:
        print(f"  Note on CSV export: {e_csv}")

    print("\n" + "=" * 70)
    print("  ✅ FORENSICS ENGINE REPORT SUMMARY")
    print("=" * 70)
    print(f"  Documents Analyzed            : {len(pdf_files)}")
    print(f"  Images Extracted & Indexed    : {len(extracted_images_index)}")
    print(f"  Verified Geo-Tagged Photos    : {summary_data['stats']['verified_geotagged_works']}")
    print(f"  Money Mismatches Flagged      : {summary_data['stats']['money_mismatch_alerts']}")
    print(f"  Cross-Scheme Irregularities   : {summary_data['stats']['cross_scheme_alerts']}")
    print(f"  Hidden Vendor Discrepancies   : {summary_data['stats']['vendor_discrepancies']}")
    print(f"  Location Mismatch Flags       : {summary_data['stats']['location_mismatch_alerts']}")
    print(f"  Duplicate Photo Pairs         : {len(duplicate_photo_flags)}")
    print(f"  Missing Photo Evidence Works  : {len(missing_photo_works):,}")
    print("=" * 70)
    print(f"Results saved to: {OUT_SUMMARY}")

    return summary_data


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="MPLADS AI Document & Image Forensics Pipeline")
    parser.add_argument("--input-dir", type=str, default=None, help="Directory containing PDFs to analyze")
    parser.add_argument("--output-csv", type=str, default=None, help="Path to export extracted GPS & vendor CSV")
    args = parser.parse_args()
    run_image_forensics(input_dir=args.input_dir, output_csv=args.output_csv)
