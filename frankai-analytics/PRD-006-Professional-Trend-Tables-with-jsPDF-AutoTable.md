# PRD-006: Professional Trend Table PDF Export with jsPDF-AutoTable

## Overview

This PRD proposes migrating the trend tables PDF export from image-based rendering (html2canvas + jsPDF) to professional, text-based tables using [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable). This will dramatically reduce file size, improve readability, and enable selectable/searchable tables in the exported PDF.

---

## Rationale
- Current trend tables are rendered as high-resolution PNG images, resulting in very large PDF files (e.g., 70MB for 5 tables).
- Image-based tables are not selectable, searchable, or accessible.
- jsPDF-AutoTable produces crisp, vector-based tables that are much smaller and more professional.
- This approach is standard in analytics/reporting tools.

---

## Requirements

1. **Replace html2canvas+jsPDF Table Export:**
   - Use jsPDF-AutoTable to render all trend tables in the trend tables PDF export.
   - Each company gets a new page with its table, as before.

2. **Table Content and Format:**
   - Table columns: Activity Type, then for each period (7d, 14d, 30d, 90d, 180d): Avg, Actual.
   - Table rows: All activity types (alphabetical), with "Total Activities" as the last row.
   - Data: Calculated as currently (Avg = actual/period, Actual = total in period, periods end at today).
   - Table header and cell styling should match or improve on current appearance (bold headers, alternating row colors, etc.).
   - Add a legend for "Avg" and "Actual" at the bottom of each page or as a note.

3. **PDF Features:**
   - Tables should be selectable and searchable in the PDF.
   - File size should be dramatically reduced (target: <1MB for typical exports).
   - Support landscape orientation and proper page margins.

4. **No Change to Chart Exports:**
   - Chart exports (which use html2canvas) are unaffected and remain as images.

---

## Implementation Plan

1. **Install jsPDF-AutoTable:**
   - Add the `jspdf-autotable` package to the project.

2. **Refactor Table Export Logic:**
   - Replace the html2canvas-based table rendering in `handleGenerateTrendTablesPDF` with jsPDF-AutoTable calls.
   - Build the table data as a 2D array (header + rows) for each company.
   - Apply styling options (header color, font size, row striping, etc.).
   - Add a legend/note below the table.

3. **Test and Validate:**
   - Verify that the PDF is small, tables are crisp/selectable, and all data is correct.
   - Check for edge cases (long company names, many activity types, etc.).

4. **Documentation and Rollout:**
   - Update user documentation/screenshots as needed.
   - Announce the improvement in release notes.

---

## Migration Notes
- Remove all html2canvas-based table code from the trend tables PDF export.
- Keep html2canvas for chart image exports only.
- No changes to the main analytics workflow or UI.

---

**Status:**
- **Planned** (pending implementation)

---

*This document describes a planned product enhancement and is subject to review and prioritization.* 