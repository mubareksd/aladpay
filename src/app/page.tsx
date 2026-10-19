import { BankQrGenerator } from "@/components/bank-qr-generator";

export default function Home() {
  return (
    <main className="min-h-full flex-1 bg-zinc-50 dark:bg-zinc-950">
      <BankQrGenerator />
    </main>
  );
}
