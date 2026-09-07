import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper-100 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-ink-900">Not found</h1>
        <p className="mt-2 text-sm text-ink-700">
          That page or prospect does not exist, or it belongs to another workspace.
        </p>
        <Link
          href="/prospects"
          className="mt-4 inline-flex h-9 items-center rounded-md border border-paper-300 bg-white px-3.5 text-sm"
        >
          Back to prospects
        </Link>
      </div>
    </main>
  );
}
