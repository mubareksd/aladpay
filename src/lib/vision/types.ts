export type VisionJobStatus = "queued" | "processing" | "completed" | "failed";

export type VisionOcrLine = {
  text: string;
  confidence: number;
};

export type VisionExtractionResult = {
  raw_text_lines: string[];
  lines: VisionOcrLine[];
};

export type VisionJobPoll =
  | { job_id: string; status: Exclude<VisionJobStatus, "completed" | "failed"> }
  | { job_id: string; status: "completed"; result: VisionExtractionResult }
  | { job_id: string; status: "failed"; error: string };

export type ReceiptOcrHints = {
  receiptUrl?: string;
  reference?: string;
  amountEtb?: string;
  phone?: string;
  aladBank?: string;
};

export type ReceiptOcrApiResponse =
  | { status: "completed"; hints: ReceiptOcrHints }
  | { status: "processing"; jobId: string }
  | { status: "failed"; error: string };
