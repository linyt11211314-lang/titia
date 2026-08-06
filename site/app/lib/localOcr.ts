type OcrEnvironment = {
  detect?: (image: Blob) => Promise<Array<{ rawValue: string }>>;
  fallback?: (image: Blob) => Promise<string>;
};

async function browserDetector(image: Blob): Promise<Array<{ rawValue: string }>> {
  const Detector = (window as unknown as { TextDetector?: new () => { detect: (bitmap: ImageBitmap) => Promise<Array<{ rawValue: string }>> } }).TextDetector;
  if (!Detector) throw new Error("TextDetector unavailable");
  const bitmap = await createImageBitmap(image);
  try { return await new Detector().detect(bitmap); }
  finally { bitmap.close(); }
}

async function tesseractFallback(image: Blob): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("chi_sim+eng");
  try {
    const result = await worker.recognize(image);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

export async function recognizeImageLocally(image: Blob, environment: OcrEnvironment = {}): Promise<string> {
  const detect = environment.detect ?? ((window as unknown as { TextDetector?: unknown }).TextDetector ? browserDetector : undefined);
  if (detect) {
    const blocks = await detect(image);
    const text = blocks.map((block) => block.rawValue.trim()).filter(Boolean).join("\n");
    if (text) return text;
  }
  return (environment.fallback ?? tesseractFallback)(image);
}
