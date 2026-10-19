import Link from "next/link";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId =
    (typeof params.sessionId === "string" ? params.sessionId : undefined) ??
    (typeof params.order_id === "string" ? params.order_id : undefined);
  const amount = typeof params.amount === "string" ? params.amount : undefined;
  const currency = typeof params.currency === "string" ? params.currency : "ETB";

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold text-foreground">Payment received</h1>
      <p className="mt-2 text-sm text-muted">
        Alad checkout reported a successful payment
        {sessionId ? ` for session ${sessionId}` : ""}.
        {amount ? ` Amount: ${amount} ${currency}.` : null}
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
        Back to AladPay
      </Link>
    </main>
  );
}
