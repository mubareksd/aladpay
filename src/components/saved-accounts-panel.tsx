"use client";

import { BankLogo } from "@/components/bank-logo";
import { BANKS } from "@/lib/ethiopian-bank-qr";
import type { SavedAccount } from "@/lib/saved-accounts";

const fieldClass =
  "w-full rounded border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand";

type SavedAccountsPanelProps = {
  accounts: SavedAccount[];
  activeId: string | null;
  saveLabel: string;
  onSaveLabelChange: (value: string) => void;
  onSelect: (account: SavedAccount) => void;
  onClearSelection: () => void;
  onSave: () => void;
  onRemove: (id: string) => void;
  onQuickQr: (account: SavedAccount, withAmount: boolean) => void;
  quickAmount: string;
  onQuickAmountChange: (value: string) => void;
};

export function SavedAccountsPanel({
  accounts,
  activeId,
  saveLabel,
  onSaveLabelChange,
  onSelect,
  onClearSelection,
  onSave,
  onRemove,
  onQuickQr,
  quickAmount,
  onQuickAmountChange,
}: SavedAccountsPanelProps) {
  return (
    <div className="space-y-3 border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Saved accounts</h2>
        <p className="text-[11px] text-muted">Stored only in this browser</p>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted">
          Fill in the form below, then save an account to reuse it here.
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {accounts.map((account) => {
            const bank = BANKS.find((b) => b.bic === account.bankBic);
            const active = account.id === activeId;
            return (
              <li key={account.id} className={active ? "bg-brand-soft/60" : ""}>
                <div className="flex flex-wrap items-center gap-3 p-3">
                  {bank ? (
                    <BankLogo bic={bank.bic} name={bank.name} size="sm" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSelect(account)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium text-foreground">
                      {account.label}
                    </span>
                    <span className="block font-mono text-[11px] text-muted">
                      {account.account}
                      {bank ? ` · ${bank.name}` : ""}
                    </span>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onQuickQr(account, false)}
                      className="rounded border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-brand-soft"
                    >
                      QR, any amount
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickQr(account, true)}
                      className="rounded bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover"
                    >
                      QR with amount
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(account.id)}
                      className="rounded border border-border px-2.5 py-1 text-xs text-muted hover:bg-red-50 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="save-label" className="mb-1 block text-xs font-medium text-muted">
            Label when saving
          </label>
          <input
            id="save-label"
            value={saveLabel}
            onChange={(e) => onSaveLabelChange(e.target.value)}
            placeholder="e.g. Shop till, personal account"
            className={fieldClass}
          />
        </div>
        <button
          type="button"
          onClick={onSave}
          className="rounded border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-brand-soft"
        >
          Save account
        </button>
        {activeId ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded px-4 py-2.5 text-sm text-muted hover:text-foreground"
          >
            Clear selection
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="quick-amount" className="mb-1 block text-xs font-medium text-muted">
            Amount for &quot;QR with amount&quot; shortcuts (ETB)
          </label>
          <input
            id="quick-amount"
            inputMode="decimal"
            value={quickAmount}
            onChange={(e) => onQuickAmountChange(e.target.value)}
            placeholder="e.g. 500"
            className={fieldClass}
          />
        </div>
        <p className="text-[11px] leading-relaxed text-muted sm:pb-2">
          Shortcuts use the saved profile and ignore the main form until you select an account
          into the form.
        </p>
      </div>
    </div>
  );
}
