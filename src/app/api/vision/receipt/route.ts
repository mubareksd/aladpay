import { NextResponse } from "next/server";
import {
  fetchVisionJob,
  submitVisionExtract,
  visionConfigured,
  waitForVisionJob,
} from "@/lib/vision/client";
import { mergeOcrLines, parseReceiptOcrText } from "@/lib/vision/receipt-parser";
import type { ReceiptOcrApiResponse } from "@/lib/vision/types";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function jobToHints(job: Awaited<ReturnType<typeof fetchVisionJob>>): ReceiptOcrApiResponse {
  if (job.status === "failed") {
    return { status: "failed", error: job.error || "OCR failed." };
  }
  if (job.status !== "completed") {
    return { status: "processing", jobId: job.job_id };
  }
  const lines = mergeOcrLines(job.result);
  const hints = parseReceiptOcrText(lines);
  return { status: "completed", hints };
}

export async function GET(request: Request) {
  if (!visionConfigured()) {
    return NextResponse.json({ error: "Receipt OCR is disabled." }, { status: 503 });
  }
  const jobId = new URL(request.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 422 });
  }
  try {
    const job = await fetchVisionJob(jobId);
    return NextResponse.json(jobToHints(job));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not read OCR status.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!visionConfigured()) {
    return NextResponse.json({ error: "Receipt OCR is disabled." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 12 MB)." }, { status: 413 });
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mime) && !mime.startsWith("image/")) {
    return NextResponse.json({ error: "Upload a receipt image (JPEG, PNG, WebP)." }, { status: 422 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const jobId = await submitVisionExtract(bytes, file.name || "receipt.jpg", mime);
    const job = await waitForVisionJob(jobId, { timeoutMs: 22_000, intervalMs: 700 });
    const payload = jobToHints(job);
    return NextResponse.json(payload, { status: payload.status === "completed" ? 200 : 202 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Receipt OCR failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
