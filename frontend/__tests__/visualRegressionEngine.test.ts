import {
  calculatePixelDifference,
  generateVisualBaselineMetadata,
  type VisualSnapshotMetadata,
} from "../utils/visualRegression";

describe("Visual Regression Engine & Diff Calculation (#267)", () => {
  it("calculates zero difference for identical mock image buffers", () => {
    const buffer1 = Buffer.alloc(100, 255);
    const buffer2 = Buffer.alloc(100, 255);

    const diff = calculatePixelDifference(buffer1, buffer2);
    expect(diff.diffPercentage).toBe(0);
    expect(diff.isMismatch).toBe(false);
  });

  it("detects deliberate colour changes and flags mismatch", () => {
    const baseline = Buffer.alloc(100, 0);
    // Mutate buffer to represent a deliberate background color shift
    const mutated = Buffer.alloc(100, 128);

    const diff = calculatePixelDifference(baseline, mutated, 0.01);
    expect(diff.diffPercentage).toBeGreaterThan(0.01);
    expect(diff.isMismatch).toBe(true);
  });

  it("generates deterministic visual baseline metadata across viewports", () => {
    const meta: VisualSnapshotMetadata = generateVisualBaselineMetadata({
      pageName: "landing-page",
      theme: "dark",
      viewport: { width: 1280, height: 800 },
      animationsDisabled: true,
      fontFamily: "Inter, sans-serif",
    });

    expect(meta.snapshotKey).toBe("landing-page_dark_1280x800");
    expect(meta.animationsDisabled).toBe(true);
    expect(meta.fontFamily).toBe("Inter, sans-serif");
  });

  it("handles mobile viewport snapshots with 375px width", () => {
    const meta = generateVisualBaselineMetadata({
      pageName: "compare-page",
      theme: "light",
      viewport: { width: 375, height: 667 },
      animationsDisabled: true,
      fontFamily: "Inter, sans-serif",
    });

    expect(meta.snapshotKey).toBe("compare-page_light_375x667");
    expect(meta.viewport.width).toBe(375);
  });
});
