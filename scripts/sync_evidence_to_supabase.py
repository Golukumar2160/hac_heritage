"""
BHARAT-DRISHTI // Supabase Evidence Photos Bucket Synchronizer
==============================================================
Synchronizes pre-extracted high-resolution forensic images & vouchers
from local `images/extracted/` to Supabase Storage bucket:
    Bucket: evidence_photos
    Public Access: true
    Path:   <filename>
"""

import os
import sys
import mimetypes
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
EXTRACTED_DIR = os.path.join(ROOT_DIR, "images", "extracted")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

def ensure_bucket_exists():
    """Ensure evidence_photos bucket exists in Supabase Storage with public RLS policies."""
    if DATABASE_URL:
        try:
            import psycopg2
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO storage.buckets (id, name, public)
                VALUES ('evidence_photos', 'evidence_photos', true)
                ON CONFLICT (id) DO UPDATE SET public = true;
            """)
            
            # Grant public RLS access on storage.objects for evidence_photos
            policies = [
                """
                CREATE POLICY "Public Uploads evidence_photos"
                ON storage.objects FOR INSERT
                TO public
                WITH CHECK (bucket_id = 'evidence_photos');
                """,
                """
                CREATE POLICY "Public Select evidence_photos"
                ON storage.objects FOR SELECT
                TO public
                USING (bucket_id = 'evidence_photos');
                """,
                """
                CREATE POLICY "Public Update evidence_photos"
                ON storage.objects FOR UPDATE
                TO public
                USING (bucket_id = 'evidence_photos')
                WITH CHECK (bucket_id = 'evidence_photos');
                """
            ]
            for pol in policies:
                try:
                    cur.execute(pol)
                except Exception:
                    pass
                    
            cur.close()
            conn.close()
            print("[OK] Supabase Storage bucket 'evidence_photos' & RLS policies registered (public=true).")
            return True
        except Exception as e:
            print(f"[*] Note creating bucket via SQL: {e}")
    return False

def sync_extracted_photos(limit: int = 50):
    """Uploads high-priority evidence images to Supabase Storage CDN."""
    ensure_bucket_exists()
    
    if not (SUPABASE_URL and SUPABASE_KEY):
        print("[!] SUPABASE_URL or SUPABASE_KEY not set in .env. Skipping cloud sync.")
        return False

    try:
        from supabase import create_client
        sp = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[!] Supabase client initialization error: {e}")
        return False

    if not os.path.exists(EXTRACTED_DIR):
        print(f"[!] Directory not found: {EXTRACTED_DIR}")
        return False

    all_files = [f for f in os.listdir(EXTRACTED_DIR) if f.lower().endswith(('.jpeg', '.jpg', '.png')) and not f.endswith('_ela.png')]
    target_batch = all_files[:limit]
    
    print(f"[*] Synchronizing {len(target_batch)} forensic evidence photos to Supabase Storage 'evidence_photos'...")
    success_count = 0
    
    for idx, fname in enumerate(target_batch):
        local_path = os.path.join(EXTRACTED_DIR, fname)
        try:
            with open(local_path, "rb") as f:
                data_bytes = f.read()
            
            ctype = "image/png" if fname.lower().endswith(".png") else "image/jpeg"
            sp.storage.from_("evidence_photos").upload(
                path=fname,
                file=data_bytes,
                file_options={"content-type": ctype, "upsert": "true"}
            )
            success_count += 1
            if (idx + 1) % 10 == 0 or (idx + 1) == len(target_batch):
                print(f"  [+] Uploaded {idx + 1}/{len(target_batch)}: {fname} ({len(data_bytes):,} bytes)")
        except Exception as e:
            # Upsert note or network glitch
            if "Duplicate" in str(e) or "already exists" in str(e):
                success_count += 1
            else:
                print(f"  [!] Note on {fname}: {e}")

    print(f"\n[OK] Evidence synchronization complete: {success_count}/{len(target_batch)} active in Supabase CDN!")
    cdn_sample = f"{SUPABASE_URL}/storage/v1/object/public/evidence_photos/{target_batch[0]}"
    print(f"   Sample CDN URL: {cdn_sample}\n")
    return True


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Sync Evidence Photos to Supabase Storage")
    parser.add_argument("--limit", type=int, default=25, help="Number of evidence photos to sync")
    args = parser.parse_args()
    sync_extracted_photos(limit=args.limit)
