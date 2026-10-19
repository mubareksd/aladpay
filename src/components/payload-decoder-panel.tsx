"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { decodeQrPayloadFromImageFile } from "@/lib/decode-qr-image";
import { parseEmvQrPayload, payloadToFormHints } from "@/lib/emv-qr-parse";
import { compareParsedPayloads } from "@/lib/payload-compare";
import { btnSecondaryClass, fieldClass, panelClass } from "@/lib/ui-classes";

type PayloadDecoderPanelProps = {
  onApplyHints: (hints: ReturnType<typeof payloadToFormHints>) => void;
  onApplyMerchantGuid?: (guid: string) => void;
  /** Current generated payload for side-by-side diff. */
  compareBaselinePayload?: string | null;
};

export function PayloadDecoderPanel({
  onApplyHints,
  onApplyMerchantGuid,
  compareBaselinePayload,
}: PayloadDecoderPanelProps) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!raw.trim()) return null;
    try {
      return parseEmvQrPayload(raw);
    } catch {
      return null;
    }
  }, [raw]);

  const baselineParsed = useMemo(() => {
    if (!compareBaselinePayload?.trim()) return null;
    try {
      return parseEmvQrPayload(compareBaselinePayload);
    } catch {
      return null;
    }
  }, [compareBaselinePayload]);

  const diffRows = useMemo(() => {
    if (!parsed || !baselineParsed) return null;
    return compareParsedPayloads(baselineParsed, parsed);
  }, [baselineParsed, parsed]);

  const parseErrorDisplay = useMemo(() => {
    if (!raw.trim()) return null;
    try {
      parseEmvQrPayload(raw);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Could not parse payload.";
    }
  }, [raw]);

  const hints = useMemo(
    () => (parsed ? payloadToFormHints(parsed) : null),
    [parsed],
  );

  const apply = useCallback(() => {
    if (!hints) return;
    onApplyHints(hints);
    setOpen(false);
  }, [hints, onApplyHints]);

  const onImagePick = useCallback(async (file: File) => {
    setImageError(null);
    try {
      const payload = await decodeQrPayloadFromImageFile(file);
      setRaw(payload);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Could not read QR image.");
    }
  }, []);

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-4 text-left active:opacity-80"
      >
        <span className="text-sm font-medium text-foreground">Decode QR or payload</span>
        <span className="text-xs text-muted">{open ? "Close" : "Open"}</span>
      </button>
      {open ? (
        <div className={`mt-3 space-y-3 ${panelClass}`}>
          <p className="text-xs leading-relaxed text-muted">
            Upload or photograph a QR, or paste a payload string. Compare against your current
            preview when both are available.
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
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="00020101021128…6304ABCD"
            className={`${fieldClass} font-mono text-xs`}
            data-testid="decode-payload-input"
          />
          {parseErrorDisplay ? (
            <p role="alert" className="text-sm text-red-800">
              {parseErrorDisplay}
            </p>
          ) : null}
          {parsed ? (
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted">CRC</dt>
                <dd className={parsed.crcValid ? "text-foreground" : "text-red-800"}>
                  {parsed.crcValid ? "Valid" : `Invalid (calc ${parsed.crcCalculated})`}
                </dd>
              </div>
              <div>
                <dt className="text-muted">POI (01)</dt>
                <dd className="text-foreground">{parsed.pointOfInitiation ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">BIC</dt>
                <dd className="font-mono text-foreground">{parsed.bic ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Account (28-02)</dt>
                <dd className="font-mono text-foreground break-all">{parsed.account ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">GUID (28-00)</dt>
                <dd className="font-mono text-[10px] text-foreground break-all">
                  {parsed.merchantGuid ?? "—"}
                </dd>
                {parsed.merchantGuid && onApplyMerchantGuid ? (
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-brand hover:underline"
                    onClick={() => onApplyMerchantGuid(parsed.merchantGuid!)}
                  >
                    Use this GUID in the form
                  </button>
                ) : null}
              </div>
              <div>
                <dt className="text-muted">MCC</dt>
                <dd className="text-foreground">{parsed.mcc ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Amount</dt>
                <dd className="text-foreground">
                  {parsed.amount ? `${parsed.amount} ETB` : "Any amount"}
                </dd>
              </div>
              {parsed.yayaUsername ? (
                <div>
                  <dt className="text-muted">Yaya username</dt>
                  <dd className="text-foreground">{parsed.yayaUsername}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {diffRows ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-foreground">
                Diff: your preview vs pasted payload
              </p>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-muted">
                    <th className="pb-1 pr-2 font-medium">Field</th>
                    <th className="pb-1 pr-2 font-medium">Yours</th>
                    <th className="pb-1 font-medium">Pasted</th>
                  </tr>
                </thead>
                <tbody>
                  {diffRows.map((row) => (
                    <tr
                      key={row.field}
                      className={row.same ? "text-muted" : "bg-amber-50 text-foreground"}
                    >
                      <td className="py-0.5 pr-2 align-top">{row.field}</td>
                      <td className="py-0.5 pr-2 align-top break-all">{row.left}</td>
                      <td className="py-0.5 align-top break-all">{row.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {hints ? (
            <button type="button" onClick={apply} className={btnSecondaryClass}>
              Apply to form
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
