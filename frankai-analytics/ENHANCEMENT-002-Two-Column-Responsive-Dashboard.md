# ENHANCEMENT-002: Two-Column Responsive Dashboard Layout

## Overview

This enhancement proposes a new layout for the FrankAI Analytics Tool: a two-column responsive dashboard. The goal is to improve usability, reduce vertical scrolling, and provide a modern, dashboard-like experience for users analyzing CSV data.

## Rationale

- The current UI places all controls and results in a single vertical column, leading to excessive scrolling and less efficient workflows.
- A two-column layout allows users to adjust filters and immediately see results side-by-side, streamlining the analytics process.
- This approach is common in professional analytics and dashboard tools, improving both discoverability and productivity.

## Proposed Layout

### 1. Left Column (Controls, ~30-35% width)
- **1. Upload CSV File**
  - Upload button, filename display.
- **2. Select Date Range**
  - Preset buttons, date range picker.
- **3. Select Companies**
  - Radio group (All Brands, All Suppliers, Specific), multi-select dropdown.
- **Action Buttons**
  - Generate Reports, Generate Trend Tables PDF, Clear Selection.

### 2. Right Column (Results, ~65-70% width)
- **Data Table Preview**
  - Collapsible, shows filtered data.
- **Activity Timeline Chart**
  - Shows chart as in UI, with legend, export button, etc.

### 3. Responsive Behavior
- On desktop: columns are side-by-side.
- On mobile/tablet: columns stack vertically (controls on top, results below).

## Wireframe Sketch

```
+-------------------+--------------------------+
| Controls          | Results                  |
| (Upload, Filters, | Data Table Preview       |
| Entities, Actions)| Activity Timeline Chart  |
|                   | [Export/Download]        |
+-------------------+--------------------------+
```

## Implementation Notes
- Use Material-UI's `Grid` or `Box` with `display: flex` for layout.
- Each section should be wrapped in a `Paper` or `Card` for clarity.
- Set left column to `xs=12` (mobile), `md=4` (desktop); right column to `xs=12`, `md=8`.
- Add spacing and responsive breakpoints.
- Action buttons can be placed at the bottom of the left column for easy access.
- Consider making the left column sticky on large screens for persistent controls (optional).

## Status
- **Planned** (not yet implemented)

---

*This document is a product enhancement proposal and is subject to further review and prioritization.* 