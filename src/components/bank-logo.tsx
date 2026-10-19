"use client";

import { getBankLogoPath } from "@/lib/bank-logos";
import { useState } from "react";

type BankLogoProps = {
  bic: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

function initialsFromName(name: string, bic: string): string {
  const parts = name
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(bank|s\.c\.?|of|the|int\.?)$/i.test(w));
  const letters = parts
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return letters || bic.slice(0, 2);
}

export function BankLogo({ bic, name, size = "md", className = "" }: BankLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = getBankLogoPath(bic);
  const box = sizeClasses[size];

  if (!src || failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded border border-border bg-brand-soft text-[10px] font-semibold text-brand ${box} ${className}`}
        aria-hidden
      >
        {initialsFromName(name, bic)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`shrink-0 rounded border border-border bg-white object-contain p-0.5 ${box} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
