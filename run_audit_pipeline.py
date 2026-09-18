"""
BHARAT-DRISHTI // Backward-Compatible Forwarder
===============================================
This file has been organized into: pipelines/run_audit_pipeline.py
This forwarder ensures zero breakage for existing commands, watchers, and scripts.
"""
import os
import sys
import runpy

TARGET = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pipelines", "run_audit_pipeline.py")

if __name__ == "__main__":
    sys.exit(runpy.run_path(TARGET, run_name="__main__"))
