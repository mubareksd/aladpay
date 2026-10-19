"use client";

import { useCallback, useRef, useState } from "react";
import { decodeQrPayloadFromImageFile } from "@/lib/decode-qr-image";
import { parseEmvQrPayload, payloadToFormHints } from "@/lib/emv-qr-parse";
import { btnSecondaryClass, panelClass } from "@/lib/ui-classes";

type PayloadDecoderPanelProps = {
  onApplyHints: (hints: ReturnType<typeof payloadToFormHints>) => void;
  onApplyMerchantGuid?: (guid: string) => void;
};

export function PayloadDecoderPanel({
  onApplyHints,
  onApplyMerchantGuid,
}: PayloadDecoderPanelProps) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [scanSummary, setScanSummary] = useState<{
    bic: string | null;
    account: string | null;
    amount: string | null;
    merchantName: string | null;
    merchantGuid: string | null;
    yayaUsername: string | null;
    hints: ReturnType<typeof payloadToFormHints>;
  } | null>(null);

  const apply = useCallback(() => {
    if (!scanSummary?.hints) return;
    onApplyHints(scanSummary.hints);
    setOpen(false);
  }, [onApplyHints, scanSummary]);

  const onImagePick = useCallback(async (file: File) => {
    setImageError(null);
    setScanSummary(null);
    try {
      const payload = await decodeQrPayloadFromImageFile(file);
      let parsedPayload;
      try {
        parsedPayload = parseEmvQrPayload(payload);
      } catch {
        setImageError("This QR could not be read. Try a clearer photo or another code.");
        return;
      }
      const hints = payloadToFormHints(parsedPayload);
      setScanSummary({
        bic: parsedPayload.bic,
        account: parsedPayload.account,
        amount: parsedPayload.amount,
        merchantName: parsedPayload.merchantName,
        merchantGuid: parsedPayload.merchantGuid,
        yayaUsername: parsedPayload.yayaUsername,
        hints,
      });
    } catch {
      setImageError("Could not read the image. Try again with good lighting.");
    }
  }, []);

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-4 text-left active:opacity-80"
      >
        <span className="text-sm font-medium text-foreground">Import from QR photo</span>
        <span className="text-xs text-muted">{open ? "Close" : "Open"}</span>
      </button>
      {open ? (
        <div className={`mt-3 space-y-3 ${panelClass}`}>
          <p className="text-xs leading-relaxed text-muted">
            Upload or photograph an existing payment QR to copy its payee details into the form.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`${btnSecondaryClass} text-xs`}
            >
              Upload or scan QR image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              data-testid="decode-payload-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onImagePick(file);
              }}
            />
          </div>
          {imageError ? (
            <p role="alert" className="text-sm text-red-800">
              {imageError}
            </p>
          ) : null}
          {scanSummary ? (
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted">Bank code</dt>
                <dd className="text-foreground">{scanSummary.bic ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Account</dt>
                <dd className="text-foreground break-all">{scanSummary.account ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Amount</dt>
                <dd className="text-foreground">
                  {scanSummary.amount ? `${scanSummary.amount} ETB` : "Any amount"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="text-foreground">{scanSummary.merchantName ?? "—"}</dd>
              </div>
              {scanSummary.yayaUsername ? (
                <div>
                  <dt className="text-muted">Yaya username</dt>
                  <dd className="text-foreground">{scanSummary.yayaUsername}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {scanSummary?.merchantGuid && onApplyMerchantGuid ? (
            <button
              type="button"
              className={`${btnSecondaryClass} text-xs`}
              onClick={() => onApplyMerchantGuid(scanSummary.merchantGuid!)}
            >
              Apply payment identifier from scan
            </button>
          ) : null}
          {scanSummary?.hints ? (
            <button type="button" onClick={apply} className={btnSecondaryClass}>
              Apply to form
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
