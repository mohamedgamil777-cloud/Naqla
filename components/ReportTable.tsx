import { Icon } from "@/components/Icons";

type Cell = string | number;
const NUMERIC = /^-?\d+(\.\d+)?$/;

/** A report shown on the page as a table (same rows as its Excel/CSV download). */
export function ReportTable({
  headers,
  rows,
  footer,
  empty = "مفيش بيانات.",
}: {
  headers: string[];
  rows: Cell[][];
  /** extra bold rows under the table (totals) */
  footer?: Cell[][];
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-muted p-4">{empty}</p>;
  return (
    <div className="overflow-auto max-h-[70vh] border border-line rounded-2xl">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-panel-2 z-10">
          <tr>
            <th className="p-2.5 text-start font-bold text-muted">#</th>
            {headers.map((h, i) => (
              <th key={i} className="p-2.5 text-start font-bold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line align-top hover:bg-panel-2/60">
              <td className="p-2.5 text-muted">{i + 1}</td>
              {headers.map((_, j) => (
                <ReportCell key={j} v={r[j]} />
              ))}
            </tr>
          ))}
        </tbody>
        {footer && footer.length > 0 && (
          <tfoot>
            {footer.map((r, i) => (
              <tr key={i} className="border-t-2 border-line-2 font-extrabold bg-panel-2">
                <td className="p-2.5" />
                {headers.map((_, j) => (
                  <ReportCell key={j} v={r[j]} />
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  );
}

function ReportCell({ v }: { v: Cell | undefined }) {
  const s = v === undefined || v === null ? "" : String(v);
  const num = typeof v === "number" || NUMERIC.test(s);
  return (
    <td className={`p-2.5 ${num ? "whitespace-nowrap" : "min-w-[6rem]"}`} dir={num ? "ltr" : undefined}>
      {s === "" ? <span className="text-muted">—</span> : s}
    </td>
  );
}

/** The "download Excel" button shown above an on-screen report. */
export function DownloadButton({ href, label = "تنزيل Excel" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold bg-primary text-white hover:bg-primary-ink whitespace-nowrap"
    >
      <Icon name="download" className="w-4 h-4" />
      {label}
    </a>
  );
}
