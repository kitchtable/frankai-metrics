# CR-007: Trend Table Period Comparison Approaches

## Overview

This change request documents and compares two approaches for period-over-period comparison in trend tables for analytics reporting:

1. **Usual Left-to-Right Comparison (Shorter → Longer Periods)**
2. **Alternative: Each Period Compared to the Next Wider Period (Your Approach)**

---

## 1. Usual Left-to-Right Comparison (Shorter → Longer Periods)
**(e.g., 14d vs 7d, 30d vs 14d, 90d vs 30d, 180d vs 90d)**

### How it works:
- Each period is compared to the immediately shorter period to its left.
- For example, 14d is compared to 7d, 30d to 14d, and so on.

### Business Benefits:
- **Shows momentum and acceleration:**
  - Reveals if activity is increasing or decreasing as you look at progressively longer timeframes.
- **Highlights recent changes:**
  - Quickly spot if a recent spike or drop is a new trend or just a short-term fluctuation.
- **Standard in analytics:**
  - Most business dashboards, financial reports, and analytics tools use this approach (e.g., "week-over-week," "month-over-month").
- **Supports rolling trend analysis:**
  - Useful for understanding if performance is improving or deteriorating as you zoom out.

---

## 2. Your Approach: Each Period Compared to the Next Wider Period
**(e.g., 7d vs 14d, 14d vs 30d, 30d vs 90d, 90d vs 180d)**

### How it works:
- Each period is compared to the next wider period to its right.
- For example, 7d is compared to 14d, 14d to 30d, and so on.

### Business Benefits:
- **Puts recent performance in broader context:**
  - See if the most recent week is outperforming or underperforming the last two weeks, and so on.
- **Highlights sustainability:**
  - If 7d is higher than 14d, it suggests a recent surge that may or may not be sustainable.
- **Good for "recency vs. baseline" analysis:**
  - Useful for understanding if a recent change is significant compared to a longer-term average.
- **Helps spot short-term spikes or drops:**
  - If 7d is much higher than 14d, it may indicate a one-off event or campaign.

---

## Summary Table

| Approach                | What it Shows                        | Best For                        |
|-------------------------|--------------------------------------|---------------------------------|
| Left-to-Right (Shorter vs. Longer) | Momentum, trend acceleration, rolling changes | Standard analytics, trend detection |
| Your Approach (Each vs. Next Wider) | Recency vs. broader context, sustainability | Spotting short-term spikes, recency analysis |

---

## Recommendation
- Both approaches are valid and useful for different business questions.
- This CR documents the options and rationale for future reference and decision-making.

---

*This document is for product and analytics team review. Please indicate your preferred approach for implementation.* 