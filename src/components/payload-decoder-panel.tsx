"use client";

import { useCallback, useMemo, useState } from "react";
import { parseEmvQrPayload, payloadToFormHints } from "@/lib/emv-qr-parse";
import { btnSecondaryClass, fieldClass, panelClass } from "@/lib/ui-classes";

type PayloadDecoderPanelProps = {
  onApplyHints: (hints: ReturnType<typeof payloadToFormHints>) => void;
};

export function PayloadDecoderPanel({ onApplyHints }: PayloadDecoderPanelProps) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");

  const parsed = useMemo(() => {
    if (!raw.trim()) return null;
    try {
      return parseEmvQrPayload(raw);
    } catch {
      return null;
    }
  }, [raw]);

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

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-4 text-left active:opacity-80"
      >
        <span className="text-sm font-medium text-foreground">Paste payload to decode</span>
        <span className="text-xs text-muted">{open ? "Close" : "Open"}</span>
      </button>
      {open ? (
        <div className={`mt-3 space-y-3 ${panelClass}`}>
          <p className="text-xs leading-relaxed text-muted">
            Paste a QR payload string from your bank or wallet app to inspect tags or fill the form
            (BIC, account, name, amount, GUID, Yaya username when present).
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="00020101021128…6304ABCD"
            className={`${fieldClass} font-mono text-xs`}
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
              <div>
                <dt className="text-muted">GUID (28-00)</dt>
                <dd className="font-mono text-[10px] text-foreground break-all">
                  {parsed.merchantGuid ?? "—"}
                </dd>
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
