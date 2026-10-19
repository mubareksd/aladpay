import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0b5f56",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AladPay · Bank QR",
    template: "%s · AladPay",
  },
  description:
    "Payment QR codes, verify, and restaurant POS for Ethiopian banks and wallets (ETB).",
  applicationName: "AladPay",
  openGraph: {
    type: "website",
    locale: "en_ET",
    url: siteUrl,
    siteName: "AladPay",
    title: "AladPay · Bank QR",
    description:
      "Payment QR codes, verify, and restaurant POS for Ethiopian banks and wallets (ETB).",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] flex-col">{children}</body>
    </html>
  );
}
