/**
 * Quality gate for plan photos, evaluated BEFORE any AI call. Pure pixel math
 * on an already-decoded grayscale image, so it is testable without a browser.
 * It only rejects what is evidently unusable (tiny, blurred, dark, washed out,
 * flat) — anything ambiguous passes and is judged by the AI's own readability
 * verdict. Thresholds are heuristics calibrated on rendered table images (see
 * photo-quality.test.ts); real phone photos have not been measured.
 */

export type GrayImage = {
  width: number;
  height: number;
  /** One byte per pixel, row-major, 0 = black, 255 = white. */
  data: Uint8ClampedArray;
};

export type PhotoMetrics = {
  /** Original (pre-downscale) pixel size. */
  originalWidth: number;
  originalHeight: number;
  /** Mean brightness 0–255. */
  brightness: number;
  /** Standard deviation of brightness. */
  contrast: number;
  /** Share of pixels that are (nearly) pure white — reflections / blown-out areas. */
  glareShare: number;
  /**
   * Laplacian variance of the analysis image divided by contrast² — low = blurred.
   * Normalised so a merely dark or washed-out (but sharp) photo is not mistaken for blur.
   */
  sharpness: number;
};

export type PhotoProblem =
  | "too_small"
  | "blurry"
  | "too_dark"
  | "too_bright"
  | "glare"
  | "low_contrast";

export const MIN_LONG_EDGE = 1000;
export const MIN_SHORT_EDGE = 600;
/** Long edge the sharpness is measured at, so the number does not depend on camera resolution. */
export const ANALYSIS_LONG_EDGE = 1024;

const TH = {
  /** Normalised Laplacian variance below this = text edges are smeared. */
  sharpnessMin: 0.3,
  brightnessMin: 80,
  brightnessMax: 245,
  contrastMin: 28,
  glareMax: 0.28,
} as const;

export const PHOTO_PROBLEM_TEXT: Record<PhotoProblem, string> = {
  too_small: "Das Bild hat zu wenige Pixel — kleine Schrift wäre nicht lesbar.",
  blurry: "Das Foto ist unscharf.",
  too_dark: "Das Foto ist zu dunkel.",
  too_bright: "Das Foto ist überbelichtet.",
  glare: "Auf dem Plan ist eine starke Reflexion.",
  low_contrast: "Der Plan hebt sich zu wenig vom Hintergrund ab.",
};

export const PHOTO_TIPS = [
  "Den ganzen Plan fotografieren — nichts abschneiden.",
  "Kamera gerade über den Plan halten, nicht schräg.",
  "Näher herangehen, bis die Schrift das Bild füllt.",
  "Reflexionen vermeiden (Licht nicht direkt auf glänzendes Papier).",
  "Für gutes, gleichmäßiges Licht sorgen.",
  "Auf die Schrift scharf stellen (kurz auf den Plan tippen).",
];

/** Downscale (box average) so the longest edge is at most `maxLongEdge`. Never upsamples. */
export function downscaleGray(img: GrayImage, maxLongEdge: number): GrayImage {
  const long = Math.max(img.width, img.height);
  if (long <= maxLongEdge) return img;
  const scale = maxLongEdge / long;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y / h) * img.height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) / h) * img.height));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x / w) * img.width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) / w) * img.width));
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          sum += img.data[yy * img.width + xx]!;
          n++;
        }
      }
      out[y * w + x] = sum / n;
    }
  }
  return { width: w, height: h, data: out };
}

export function computePhotoMetrics(
  gray: GrayImage,
  original: { width: number; height: number },
): PhotoMetrics {
  const img = downscaleGray(gray, ANALYSIS_LONG_EDGE);
  const { width: w, height: h, data } = img;
  const n = w * h;

  let sum = 0;
  let white = 0;
  for (let i = 0; i < n; i++) {
    const v = data[i]!;
    sum += v;
    if (v >= 250) white++;
  }
  const mean = sum / n;
  let varSum = 0;
  for (let i = 0; i < n; i++) {
    const d = data[i]! - mean;
    varSum += d * d;
  }

  // Variance of the 4-neighbour Laplacian over the interior.
  let lapSum = 0;
  let lapSq = 0;
  let lapN = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * data[i]! - data[i - 1]! - data[i + 1]! - data[i - w]! - data[i + w]!;
      lapSum += l;
      lapSq += l * l;
      lapN++;
    }
  }
  const lapMean = lapN ? lapSum / lapN : 0;
  const lapVar = lapN ? lapSq / lapN - lapMean * lapMean : 0;
  const contrast = Math.sqrt(varSum / n);
  // A flat image has no edges AND no contrast; report it as unsharp rather than dividing by ~0.
  const sharpness = contrast < 1 ? 0 : lapVar / (contrast * contrast);

  return {
    originalWidth: original.width,
    originalHeight: original.height,
    brightness: mean,
    contrast,
    glareShare: white / n,
    sharpness,
  };
}

export type PhotoAssessment = { ok: true } | { ok: false; problems: PhotoProblem[] };

export function assessPhotoMetrics(m: PhotoMetrics): PhotoAssessment {
  const problems: PhotoProblem[] = [];
  const long = Math.max(m.originalWidth, m.originalHeight);
  const short = Math.min(m.originalWidth, m.originalHeight);
  if (long < MIN_LONG_EDGE || short < MIN_SHORT_EDGE) problems.push("too_small");
  if (m.brightness < TH.brightnessMin) problems.push("too_dark");
  if (m.brightness > TH.brightnessMax) problems.push("too_bright");
  if (m.glareShare > TH.glareMax) problems.push("glare");
  const blurry = m.sharpness < TH.sharpnessMin;
  // Blur and darkness both lower the contrast; report only the root cause.
  if (
    m.contrast < TH.contrastMin &&
    !blurry &&
    !problems.includes("too_dark") &&
    !problems.includes("too_bright")
  ) {
    problems.push("low_contrast");
  }
  if (blurry) problems.push("blurry");
  return problems.length ? { ok: false, problems } : { ok: true };
}

/** One call for the browser: metrics from RGBA pixels (e.g. canvas ImageData) at the original size or downscaled. */
export function grayFromRgba(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const data = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    data[i] = 0.299 * rgba[p]! + 0.587 * rgba[p + 1]! + 0.114 * rgba[p + 2]!;
  }
  return { width, height, data };
}
