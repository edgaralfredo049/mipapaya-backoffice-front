import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { Pagination } from "./Pagination";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  itemsPerPage?: number;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No hay registros",
  itemsPerPage = 10,
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const currentData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-200 rounded-lg shadow-sm">
        <Inbox className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={`px-6 py-3 font-semibold ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentData.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-gray-50 transition-colors">
                {columns.map((col, j) => (
                  <td key={j} className={`px-6 py-4 whitespace-nowrap ${col.className || ""}`}>
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : (row[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={data.length}
        pageSize={itemsPerPage}
      />
    </div>
  );
}
