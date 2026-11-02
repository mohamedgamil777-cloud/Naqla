import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** URL of a given page (keeps the current filters in the query string) */
  href: (page: number) => string;
};

/** Previous / next links for a list paginated in the database. Renders nothing for a single page. */
export function Pagination({ page, totalPages, href }: PaginationProps) {
  if (totalPages <= 1) return null;
  const linkClass = "rounded-xl px-4 py-2 border border-line-2 font-bold";

  return (
    <nav className="flex items-center justify-center gap-3" aria-label="الصفحات">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          السابق
        </Link>
      ) : null}
      <span className="text-sm text-muted">
        صفحة {page} من {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={linkClass}>
          التالي
        </Link>
      ) : null}
    </nav>
  );
}

/** Build a list URL from its filters (empty values are left out). */
export function listHref(path: string, params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
