import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/marketing-home";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Payment QR & restaurant POS for Ethiopia",
  description:
    "Create Ethiopian bank and wallet payment QRs, verify transfers, and run tables, kitchen, and guest ordering with AladPay.",
  openGraph: {
    title: "AladPay · Payment QR & POS for Ethiopia",
    description:
      "Bank QRs, payment verify, checkout, and restaurant POS with team access — built for ETB.",
  },
};

export default function HomePage() {
  return (
    <MarketingShell>
      <MarketingHome />
    </MarketingShell>
  );
}
