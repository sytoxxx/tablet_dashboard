import { describe, expect, it } from "vitest";
import {
  assessPhotoMetrics,
  computePhotoMetrics,
  downscaleGray,
  grayFromRgba,
  type GrayImage,
  type PhotoProblem,
} from "@/lib/plan-analysis/photo-quality";

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/** Table-photo stand-in: paper, grid lines, glyph-like strokes. Deterministic. */
function roster(w: number, h: number, scale: number): GrayImage {
  const data = new Uint8ClampedArray(w * h).fill(225);
  const r = rng(7);
  const cw = Math.round(60 * scale);
  const ch = Math.round(34 * scale);
  const st = Math.max(1, Math.round(2 * scale));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (x % cw < st || y % ch < st) data[y * w + x] = 60;
  }
  for (let cy = 0; cy < Math.floor(h / ch); cy++) {
    for (let cx = 0; cx < Math.floor(w / cw); cx++) {
      const n = 2 + Math.floor(r() * 4);
      for (let g = 0; g < n; g++) {
        const gx = cx * cw + Math.round((6 + g * 9) * scale);
        const gy = cy * ch + Math.round(8 * scale);
        const gh = Math.round((10 + r() * 6) * scale);
        const gw = Math.round(3 * scale);
        for (let yy = 0; yy < gh; yy++) {
          for (let xx = 0; xx < gw; xx++) {
            const p = (gy + yy) * w + gx + xx;
            if (p < data.length) data[p] = 40;
          }
        }
      }
    }
  }
  return { width: w, height: h, data };
}

function boxBlur(img: GrayImage, rad: number): GrayImage {
  const { width: w, height: h } = img;
  const tmp = new Float32Array(w * h);
  const out = new Uint8ClampedArray(w * h);
  const cx = (x: number) => Math.min(w - 1, Math.max(0, x));
  const cy = (y: number) => Math.min(h - 1, Math.max(0, y));
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -rad; x <= rad; x++) s += img.data[y * w + cx(x)]!;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / (2 * rad + 1);
      s += img.data[y * w + cx(x + rad + 1)]! - img.data[y * w + cx(x - rad)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -rad; y <= rad; y++) s += tmp[cy(y) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / (2 * rad + 1);
      s += tmp[cy(y + rad + 1) * w + x]! - tmp[cy(y - rad) * w + x]!;
    }
  }
  return { width: w, height: h, data: out };
}

const scaleBrightness = (img: GrayImage, f: number): GrayImage => ({
  ...img,
  data: new Uint8ClampedArray(img.data.map((v) => v * f)),
});

function assess(img: GrayImage, original = { width: img.width, height: img.height }) {
  const result = assessPhotoMetrics(computePhotoMetrics(img, original));
  return result.ok ? [] : result.problems;
}

describe("photo quality gate", () => {
  const big = roster(3000, 2000, 2.2);

  it("accepts a sharp, well-lit full-resolution table photo", () => {
    expect(assess(big)).toEqual([]);
  });

  it("accepts a sharp photo at a typical messenger-compressed size", () => {
    expect(assess(roster(1400, 1000, 1.05))).toEqual([]);
  });

  it("rejects a clearly blurred photo as blurry only", () => {
    expect(assess(boxBlur(big, 14))).toEqual(["blurry"]);
    expect(assess(boxBlur(big, 24))).toEqual(["blurry"]);
  });

  it("does not throw away a mildly soft photo (left to the AI's own readability verdict)", () => {
    expect(assess(boxBlur(big, 2))).toEqual([]);
  });

  it("rejects a very dark photo, without calling it blurry", () => {
    expect(assess(scaleBrightness(big, 0.3))).toEqual(["too_dark"]);
  });

  it("rejects a photo with a large reflection", () => {
    const data = new Uint8ClampedArray(big.data);
    for (let y = 0; y < big.height; y++) {
      for (let x = 0; x < big.width; x++) {
        if (Math.hypot(x - 1500, y - 800) < 900) data[y * big.width + x] = 255;
      }
    }
    expect(assess({ ...big, data })).toContain("glare");
  });

  it("rejects a washed-out, flat photo", () => {
    const data = new Uint8ClampedArray(big.data.map((v) => 150 + (v - 40) * 0.12));
    expect(assess({ ...big, data })).toContain("low_contrast");
    expect(assess({ ...big, data: new Uint8ClampedArray(big.data.length).fill(190) }).length).toBeGreaterThan(0);
  });

  it("rejects a photo that is too small, however sharp", () => {
    expect(assess(roster(800, 560, 0.7))).toEqual(["too_small"]);
    // original size counts, not the downscaled analysis copy
    expect(assess(big, { width: 900, height: 600 })).toContain("too_small");
  });

  it("combines independent problems", () => {
    const problems: PhotoProblem[] = assess(scaleBrightness(boxBlur(roster(800, 560, 0.7), 6), 0.3));
    expect(problems).toContain("too_small");
    expect(problems).toContain("too_dark");
  });

  it("measures sharpness independent of camera resolution", () => {
    const full = computePhotoMetrics(big, { width: 3000, height: 2000 });
    const half = computePhotoMetrics(downscaleGray(big, 1500), { width: 1500, height: 1000 });
    expect(full.sharpness).toBeGreaterThan(1);
    expect(half.sharpness).toBeGreaterThan(1);
  });

  it("converts RGBA to luminance", () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 255, 255, 255, 255]);
    const g = grayFromRgba(rgba, 3, 1);
    expect([...g.data]).toEqual([76, 150, 255]);
  });
});
