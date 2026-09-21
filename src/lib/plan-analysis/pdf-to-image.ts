/**
 * Client-only: render PDF pages to PNG Files so they can flow through the
 * exact same upload/analyze pipeline as a photo. Real rendering
 * (pdfjs-dist) — never a placeholder image.
 */

const MAX_LONG_EDGE = 2200;
const MAX_PAGES = 12;

async function renderPage(
  pdfjsLib: typeof import("pdfjs-dist"),
  doc: import("pdfjs-dist").PDFDocumentProxy,
  pageNumber: number,
  baseName: string,
): Promise<File> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, MAX_LONG_EDGE / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale: Math.max(scale, 1) });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas nicht verfügbar.");

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  void pdfjsLib;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error(`PDF-Seite ${pageNumber} konnte nicht gerendert werden.`);

  return new File([blob], `${baseName}-seite-${pageNumber}.png`, { type: "image/png" });
}

/** Renders only the PDF's first page — used where a single image is all that's needed. */
export async function pdfFirstPageToImageFile(file: File): Promise<File> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  try {
    return await renderPage(pdfjsLib, doc, 1, file.name.replace(/\.pdf$/i, ""));
  } finally {
    await doc.cleanup();
  }
}

/**
 * Renders every page of a PDF (up to MAX_PAGES) to separate PNG Files, in
 * order — a real monthly roster is often several pages and a month-change
 * scan must see all of them, not just the first.
 */
export async function pdfAllPagesToImageFiles(file: File): Promise<File[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  try {
    const pageCount = Math.min(doc.numPages, MAX_PAGES);
    const baseName = file.name.replace(/\.pdf$/i, "");
    const pages: File[] = [];
    for (let n = 1; n <= pageCount; n++) {
      pages.push(await renderPage(pdfjsLib, doc, n, baseName));
    }
    return pages;
  } finally {
    await doc.cleanup();
  }
}
