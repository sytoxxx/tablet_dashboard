import {
  assessPhotoMetrics,
  computePhotoMetrics,
  grayFromRgba,
  ANALYSIS_LONG_EDGE,
  type PhotoAssessment,
} from "@/lib/plan-analysis/photo-quality";

export type PhotoCheck =
  | { status: "ok" }
  | { status: "rejected"; problems: Extract<PhotoAssessment, { ok: false }>["problems"] }
  /** The browser could not decode the file (e.g. HEIC) — the AI's own verdict still applies. */
  | { status: "unchecked" };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

/** Measures a chosen photo in the browser before anything is uploaded. */
export async function checkPhotoFile(file: File): Promise<PhotoCheck> {
  try {
    const img = await loadImage(file);
    const original = { width: img.naturalWidth, height: img.naturalHeight };
    const scale = Math.min(1, ANALYSIS_LONG_EDGE / Math.max(original.width, original.height));
    const w = Math.max(1, Math.round(original.width * scale));
    const h = Math.max(1, Math.round(original.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { status: "unchecked" };
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const metrics = computePhotoMetrics(grayFromRgba(data, w, h), original);
    const result = assessPhotoMetrics(metrics);
    return result.ok ? { status: "ok" } : { status: "rejected", problems: result.problems };
  } catch {
    return { status: "unchecked" };
  }
}
