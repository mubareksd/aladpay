"use client";

import { BankLogo } from "@/components/bank-logo";
import { BANKS } from "@/lib/ethiopian-bank-qr";
import type { SavedAccount } from "@/lib/saved-accounts";
import { btnGhostClass, btnPrimaryClass, btnSecondaryClass, fieldClass, panelClass } from "@/lib/ui-classes";

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
    <div className={`space-y-4 ${panelClass}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
        <h2 className="text-sm font-medium text-foreground md:text-base">Saved accounts</h2>
        <p className="text-[11px] text-muted sm:text-xs">Stored only in this browser</p>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          Fill in the form below, then save an account to reuse it here.
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {accounts.map((account) => {
            const bank = BANKS.find((b) => b.bic === account.bankBic);
            const active = account.id === activeId;
            return (
              <li key={account.id} className={active ? "bg-brand-soft/60" : ""}>
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {bank ? (
                      <BankLogo bic={bank.bic} name={bank.name} size="md" className="sm:hidden" />
                    ) : null}
                    {bank ? (
                      <BankLogo bic={bank.bic} name={bank.name} size="sm" className="hidden sm:block" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSelect(account)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block text-sm font-medium text-foreground sm:truncate">
                        {account.label}
                      </span>
                      <span className="mt-0.5 block break-all font-mono text-[11px] text-muted sm:text-xs">
                        {account.account}
                      </span>
                      {bank ? (
                        <span className="mt-0.5 block text-[11px] text-muted sm:hidden">
                          {bank.name}
                        </span>
                      ) : null}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <button
                      type="button"
                      onClick={() => onQuickQr(account, false)}
                      className={`${btnSecondaryClass} col-span-2 !min-h-10 text-xs sm:col-span-1 sm:w-auto sm:px-3`}
                    >
                      QR, any amount
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickQr(account, true)}
                      className={`${btnPrimaryClass} col-span-2 !min-h-10 text-xs sm:col-span-1 sm:w-auto sm:px-3`}
                    >
                      QR with amount
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(account.id)}
                      className={`${btnGhostClass} col-span-2 border border-border text-xs text-muted sm:col-span-1 sm:w-auto sm:border-0 sm:px-2`}
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

      <div className="grid gap-3 border-t border-border pt-4 md:grid-cols-[1fr_auto] md:items-end lg:grid-cols-[1fr_auto_auto]">
        <div className="md:col-span-2 lg:col-span-1">
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
        <button type="button" onClick={onSave} className={`${btnSecondaryClass} md:w-auto md:min-w-[9rem]`}>
          Save account
        </button>
        {activeId ? (
          <button type="button" onClick={onClearSelection} className={`${btnGhostClass} md:w-auto`}>
            Clear selection
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:items-end lg:grid-cols-[1fr_1fr]">
        <div>
          <label htmlFor="quick-amount" className="mb-1 block text-xs font-medium text-muted">
            Shortcut amount (ETB)
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
        <p className="text-[11px] leading-relaxed text-muted md:pb-2.5 lg:text-xs">
          &quot;QR with amount&quot; uses this value plus the remark field in the main form.
        </p>
      </div>
    </div>
  );
}
