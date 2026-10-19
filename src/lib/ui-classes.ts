/** Shared layout and control classes for responsive UI. */
export const fieldClass =
  "w-full min-h-11 rounded border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand sm:min-h-0 sm:py-2.5 sm:text-sm";

export const btnPrimaryClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover active:bg-brand-hover sm:min-h-10";

export const btnSecondaryClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-brand-soft active:bg-brand-soft sm:min-h-10";

export const btnGhostClass =
  "inline-flex min-h-10 items-center justify-center rounded px-3 py-2 text-sm text-muted hover:text-foreground active:bg-brand-soft/50";

export const pageContainerClass =
  "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-9 lg:px-8 lg:py-10";

export const panelClass = "border border-border bg-surface p-4 sm:p-5 md:p-6";

export const mainGridClass =
  "mt-6 grid grid-cols-1 gap-6 md:mt-8 md:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] md:items-start md:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,380px)] lg:gap-8 xl:grid-cols-[minmax(0,1.15fr)_400px]";

export const asideClass = "space-y-4 md:sticky md:top-4 md:self-start lg:top-6";
