import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="tabular text-[13px] text-ink-muted">404</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">That page does not exist</h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] text-ink-muted">
        The record may have been deleted, or the link is out of date.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
