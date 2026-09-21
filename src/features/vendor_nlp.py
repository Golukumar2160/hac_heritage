"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
NLP Vendor Name Cleaning, Government Entity Masking, and TF-IDF Representation
"""

import re
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer


# Statutory Government Implementing Agencies (official state authorities, not private bid contractors)
GOVT_VENDOR_PATTERNS = (
    r"\bexecutive\s+engineer\b",
    r"\bassistant\s+engineer\b",
    r"\bjunior\s+engineer\b",
    r"\bsub\s*[- ]?divisional\s+officer\b",
    r"\bblock\s+development\s+officer\b",
    r"\bnirmithi?\s+kendra\b",
    r"\bkridl\b",
    r"\bpanchayat\s+secretary\b",
    r"\bgram\s+panchayat\b",
    r"\bzp\s+engineering\b",
    r"\bpwd\b",
    r"\brw&s\b",
    r"\brws\b",
    r"\bdrda\b",
    r"\bdistrict\s+collector\b",
    r"\bchief\s+executive\s+officer\b",
    r"\bdeputy\s+commissioner\b",
    r"\bmunicipal\s+commissioner\b",
    r"\bhescom\b",
    r"\bbescom\b",
    r"\bcesc\b",
    r"\bmescom\b",
)

LEGAL_SUFFIX_PATTERN = re.compile(
    r"\b(m/s|ms|pvt|ltd|private|limited|co|company|ent|enterprises|bros|brothers)\b",
    re.IGNORECASE
)


def is_government_agency(vendor_name: str) -> bool:
    """Checks whether a vendor string matches an official statutory implementing agency."""
    name = str(vendor_name).lower().strip()
    return any(re.search(pat, name) for pat in GOVT_VENDOR_PATTERNS)


def clean_vendor_name(vendor_name: str, strip_legal_suffixes: bool = True) -> str:
    """Standardizes vendor name strings (cleans whitespace, special characters, and optional legal suffixes)."""
    if pd.isna(vendor_name):
        return ""
    name = str(vendor_name).upper().strip()
    if strip_legal_suffixes:
        name = LEGAL_SUFFIX_PATTERN.sub(" ", name)
    name = re.sub(r"[^\w\s]", " ", name)
    if strip_legal_suffixes:
        name = re.sub(r"\b(M\s*S|PVT|LTD|CO|ENT|BROS)\b", " ", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def build_text_vectorizer(representation: str) -> TfidfVectorizer:
    """
    Constructs a TF-IDF vectorizer based on representation type:
      - 'char_wb_2_4': Char n-grams 2-4 within word boundaries
      - 'char_wb_3_5': Char n-grams 3-5
      - 'word_1_2': Word n-grams 1-2
      - 'hybrid_char_word': Hybrid subword char n-grams 2-3
    """
    if representation == "char_wb_2_4":
        return TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), max_features=10000, sublinear_tf=True)
    elif representation == "char_wb_3_5":
        return TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=12000, sublinear_tf=True)
    elif representation == "word_1_2":
        return TfidfVectorizer(analyzer="word", ngram_range=(1, 2), max_features=8000, sublinear_tf=True)
    elif representation == "hybrid_char_word":
        return TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 3), max_features=6000, sublinear_tf=True)
    else:
        # Default fallback
        return TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), max_features=10000, sublinear_tf=True)
