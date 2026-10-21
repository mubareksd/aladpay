import type { ReceiptOcrApiResponse, ReceiptOcrHints } from "@/lib/vision/types";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scanReceiptImage(file: File): Promise<ReceiptOcrHints> {
  const form = new FormData();
  form.append("file", file);

  let res = await fetch("/api/vision/receipt", { method: "POST", body: form });
  let data = (await res.json()) as ReceiptOcrApiResponse & { error?: string };

  if (!res.ok && data.error) {
    throw new Error(data.error);
  }

  for (let attempt = 0; attempt < 40 && data.status === "processing"; attempt += 1) {
    await sleep(800);
    res = await fetch(`/api/vision/receipt?jobId=${encodeURIComponent(data.jobId)}`, {
      cache: "no-store",
    });
    data = (await res.json()) as ReceiptOcrApiResponse & { error?: string };
    if (!res.ok && data.error) throw new Error(data.error);
  }

  if (data.status === "failed") {
    throw new Error(data.error || "Could not read receipt.");
  }
  if (data.status !== "completed") {
    throw new Error("Receipt scan timed out. Try again with a clearer photo.");
  }
  return data.hints;
}
