import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
  isLoading?: boolean;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available.',
  isLoading = false,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#263650] bg-[#111C32] shadow-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#17243B] border-b border-[#263650]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'text-left px-4 py-3.5 text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap',
                  col.className ?? '',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#263650]/50">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="hover:bg-[#17243B]/40">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div className="h-4 bg-[#17243B] rounded-lg animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-slate-400 py-12"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-[#17243B]/60 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      'px-4 py-3.5 text-slate-200 text-sm align-middle',
                      col.className ?? '',
                    ].join(' ')}
                  >
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
