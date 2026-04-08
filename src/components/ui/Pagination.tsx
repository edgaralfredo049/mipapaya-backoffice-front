import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  alwaysShow?: boolean;
}

export const Pagination = ({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  alwaysShow = false,
}: PaginationProps) => {
  if (totalPages <= 1 && !alwaysShow) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce<(number | "…")[]>((acc, p, i, arr) => {
      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  const btnBase =
    "px-2.5 py-1 text-xs border rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const btnNeutral = `${btnBase} border-gray-200 hover:bg-gray-50`;
  const btnActive  = `${btnBase} bg-papaya-orange text-white border-papaya-orange`;

  const countLabel = (() => {
    if (totalItems === undefined || pageSize === undefined) return null;
    if (totalItems === 0) return "0 registros";
    const from = (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, totalItems);
    return `${from}–${to} de ${totalItems}`;
  })();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">{countLabel}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className={btnNeutral}
          aria-label="Primera página"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={btnNeutral}
          aria-label="Página anterior"
        >
          ‹
        </button>

        {pageNumbers.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={page === p ? btnActive : btnNeutral}
              aria-current={page === p ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={btnNeutral}
          aria-label="Página siguiente"
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className={btnNeutral}
          aria-label="Última página"
        >
          »
        </button>
      </div>
    </div>
  );
};
