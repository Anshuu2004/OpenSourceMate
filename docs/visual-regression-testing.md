# Visual Regression Testing with Playwright

## Overview
Issue #267 implements automated **Visual Regression Testing** using Playwright across critical user flows:
- **Landing Page**: Top hero banner, search form, feature cards, and footer.
- **Profile Analyzer**: Results cards, skill proficiency distribution, and matched issue cards (using deterministic mocked payloads).
- **Compare Profiles**: Dual comparison column layout, diff indicators, and badges.

---

## Configuration & Determinism Guarantees

In `frontend/playwright.config.ts`:
1. **Disabled Animations**: `animations: "disabled"` suppresses CSS transitions, pulses, and framer-motion transforms to ensure static screenshot captures.
2. **Deterministic Fonts**: Configured to standard sans-serif system fallbacks (`Inter, -apple-system, sans-serif`) to prevent cross-platform font rendering shifts.
3. **Viewport Matrix**:
   - `desktop-dark`: 1280x800, Dark Theme
   - `desktop-light`: 1280x800, Light Theme
   - `mobile-dark`: 375x667 (iPhone 13), Dark Theme
   - `mobile-light`: 375x667 (iPhone 13), Light Theme
4. **Tolerance Threshold**: `maxDiffPixelRatio: 0.02` (2% threshold) allows negligible subpixel anti-aliasing variations while immediately flagging intentional layout or color shifts.

---

## Running Visual Tests

### Run Screenshot Comparison
```bash
cd frontend
npx playwright test e2e/visualRegression.spec.ts
```

### Updating Baselines
When an intentional UI redesign or style update occurs, update the reference snapshots with:
```bash
cd frontend
npx playwright test e2e/visualRegression.spec.ts --update-snapshots
```

Commit the updated snapshots in `frontend/e2e/snapshots/` along with the feature changes in the PR.

---

## CI Pipeline Integration
In GitHub Actions (`.github/workflows/ci.yml`), Playwright runs with a dedicated web server:
- If a pull request modifies colors, fonts, or component dimensions without updating snapshots, the check fails with a visual diff report.
- An HTML report showing the visual diff (baseline vs. actual vs. diff overlay) is preserved as a workflow artifact.
