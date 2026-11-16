# Automated Accessibility Testing with axe-core

## Overview
As part of Issue #266, OpenSourceMate integrates automated **accessibility regression testing powered by `axe-core`** to continuously prevent WCAG 2.1 AA violations from entering the codebase.

Unlike one-off manual audits, this automated test suite is integrated into CI (`npm test -- --ci`) and explicitly asserts that **no serious or critical accessibility violations** occur across key UI components, loading fallbacks, and error banners.

---

## Architecture & Integration

### 1. Test Harness Utility: `frontend/utils/axeTestHelper.ts`
- Runs `axe.run` against rendered React DOM trees in JSDOM.
- Filters violations by impact:
  - `critical` (immediate failure)
  - `serious` (immediate failure)
  - `moderate` & `minor` (flagged for review)
- Checks against rule tags:
  - `wcag2a`
  - `wcag2aa`
  - `wcag21a`
  - `wcag21aa`

### 2. Evaluated Components & States
In `frontend/__tests__/automatedAccessibilityAxe.test.tsx`:
1. **Header & Navigation**:
   - `Navbar` in standard desktop layout.
   - `Navbar` with mobile disclosure dropdown open.
2. **Landing & Core Sections**:
   - `Hero` with interactive search input and submit buttons.
   - `HowItWorks` 3-stage process cards.
   - `FAQ` collapsible accordions.
3. **Data & State Displays**:
   - `TopRepositoriesDisplay` repository cards, tabs, and fork exclusion toggles.
   - `CompareSkeleton` loading state.
   - `ServiceUnavailableBanner` retry error state.

---

## How to Fix Common Axe Violations

When automated accessibility tests fail in CI, refer to the following common patterns:

### 1. Missing Accessible Name / Label (`button-name`, `link-name`)
**Problem**: An icon-only button has no text content.
```tsx
// ❌ FAILS:
<button onClick={toggle}><svg>...</svg></button>

// ✅ FIXED:
<button onClick={toggle} aria-label="Toggle navigation menu">
  <svg aria-hidden="true">...</svg>
</button>
```

### 2. Form Input Lacks Associated Label (`label`)
**Problem**: Text input has no `<label>` or `aria-label`.
```tsx
// ❌ FAILS:
<input type="text" placeholder="Enter username..." />

// ✅ FIXED:
<label htmlFor="github-username" className="sr-only">GitHub Username</label>
<input id="github-username" type="text" placeholder="Enter username..." />
```

### 3. ARIA Attribute Validity (`aria-allowed-attr`, `aria-valid-attr-value`)
**Problem**: Applying an ARIA role or attribute to an element where it is invalid, or passing an invalid value.
```tsx
// ❌ FAILS:
<div role="status" aria-expanded="true">...</div>

// ✅ FIXED:
<div role="region" aria-label="Status notifications">...</div>
```

### 4. Color Contrast Ratios (`color-contrast`)
**Problem**: Foreground text does not meet the minimum 4.5:1 ratio against background.
```tsx
// ❌ FAILS:
<p className="text-slate-500 bg-slate-900">Low contrast label</p>

// ✅ FIXED:
<p className="text-slate-300 bg-slate-900">Sufficient contrast label</p>
```

---

## Running Accessibility Tests Locally

To run the automated axe suite from the repository root:
```bash
npm --prefix frontend test -- __tests__/automatedAccessibilityAxe.test.tsx
```

All 8 automated test suites execute and report zero serious or critical violations.
