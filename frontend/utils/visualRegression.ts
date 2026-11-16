export interface ViewportSize {
  width: number;
  height: number;
}

export interface VisualBaselineConfig {
  pageName: string;
  theme: "dark" | "light";
  viewport: ViewportSize;
  animationsDisabled: boolean;
  fontFamily: string;
}

export interface VisualSnapshotMetadata {
  snapshotKey: string;
  pageName: string;
  theme: "dark" | "light";
  viewport: ViewportSize;
  animationsDisabled: boolean;
  fontFamily: string;
  createdAt: string;
}

export interface DiffResult {
  totalPixels: number;
  diffPixels: number;
  diffPercentage: number;
  isMismatch: boolean;
}

/**
 * Generates deterministic metadata for visual regression snapshot files.
 */
export function generateVisualBaselineMetadata(
  config: VisualBaselineConfig
): VisualSnapshotMetadata {
  const snapshotKey = `${config.pageName}_${config.theme}_${config.viewport.width}x${config.viewport.height}`;

  return {
    snapshotKey,
    pageName: config.pageName,
    theme: config.theme,
    viewport: config.viewport,
    animationsDisabled: config.animationsDisabled,
    fontFamily: config.fontFamily,
    createdAt: "2026-11-16T00:00:00.000Z",
  };
}

/**
 * Calculates byte/pixel difference ratio between baseline and test buffers.
 */
export function calculatePixelDifference(
  baseline: Uint8Array,
  actual: Uint8Array,
  threshold = 0.02
): DiffResult {
  if (baseline.length !== actual.length) {
    return {
      totalPixels: baseline.length,
      diffPixels: Math.abs(baseline.length - actual.length),
      diffPercentage: 1.0,
      isMismatch: true,
    };
  }

  let diffBytes = 0;
  for (let i = 0; i < baseline.length; i++) {
    if (baseline[i] !== actual[i]) {
      diffBytes++;
    }
  }

  const diffPercentage = diffBytes / baseline.length;

  return {
    totalPixels: baseline.length,
    diffPixels: diffBytes,
    diffPercentage,
    isMismatch: diffPercentage > threshold,
  };
}
