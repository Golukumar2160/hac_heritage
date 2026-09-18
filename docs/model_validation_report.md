# 🏛️ BHARAT-DRISHTI Model Validation & Accuracy Report
**Generated:** 2026-09-18 22:36:27  
**Dataset Scope:** 98,649 MPLADS Works  

## 1. Executive Performance Summary

| Metric | Result | Methodology |
|---|---|---|
| **Statutory Rule Precision (Tier 1)** | **99.99%** | Zero-ambiguity statutory violations (0% FP) |
| **Ensemble Precision (CRITICAL+HIGH)** | **76.52%** | Evaluated against ground-truth statutory labels |
| **Ensemble Recall** | **73.93%** | Percentage of statutory violations captured |
| **Ensemble F1 Score** | **75.2%** | Balanced harmonic mean |
| **Model Generalization AUC-ROC** | **0.875** | 80/20 Stratified train-test split |
| **Benford's Law Cross-Validation** | **20/20 (100%)** | Top 20 high-risk MPs evaluated independently |

## 2. Confusion Matrix (Ensemble vs Ground Truth)

```
                 Confirmed Violation = True    Confirmed Violation = False
ML Flagged       16648                         5108                       
ML Clean         5872                          71021                      
```
