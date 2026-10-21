import type { VisionJobPoll } from "@/lib/vision/types";

const DEFAULT_BASE = "https://vision.lubaak.com";

export function visionConfigured(): boolean {
  return process.env.VISION_OCR_ENABLED?.trim().toLowerCase() !== "false";
}

function visionBaseUrl(): string {
  return (process.env.VISION_API_URL?.trim() || DEFAULT_BASE).replace(/\/$/, "");
}

function visionHeaders(): HeadersInit {
  const key = process.env.VISION_API_KEY?.trim();
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

export async function submitVisionExtract(
  bytes: ArrayBuffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType || "application/octet-stream" }), filename);

  const res = await fetch(`${visionBaseUrl()}/api/v1/extract`, {
    method: "POST",
    headers: visionHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 200) || `Vision OCR failed (${res.status})`);
  }

  const data = (await res.json()) as { job_id?: string };
  if (!data.job_id) throw new Error("Vision OCR did not return a job id.");
  return data.job_id;
}

export async function fetchVisionJob(jobId: string): Promise<VisionJobPoll> {
  const res = await fetch(`${visionBaseUrl()}/api/v1/status/${encodeURIComponent(jobId)}`, {
    headers: visionHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Vision status failed (${res.status})`);
  }
  return (await res.json()) as VisionJobPoll;
}

export async function waitForVisionJob(
  jobId: string,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<VisionJobPoll> {
  const intervalMs = options?.intervalMs ?? 750;
  const timeoutMs = options?.timeoutMs ?? 55_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const snap = await fetchVisionJob(jobId);
    if (snap.status === "completed" || snap.status === "failed") return snap;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return { job_id: jobId, status: "processing" };
}
