"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="text-xl font-semibold text-foreground">Something failed</h1>
      <p className="mt-2 text-sm text-muted">
        {error.message || "The page could not load. Try again."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 w-fit rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Retry
      </button>
    </main>
  );
}
