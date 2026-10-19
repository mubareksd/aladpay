import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted">That URL does not exist on this site.</p>
      <Link
        href="/"
        className="mt-6 w-fit rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Back to QR generator
      </Link>
    </main>
  );
}
