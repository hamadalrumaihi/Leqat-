'use client';

import { useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Reusable data table built on TanStack Table (headless). RTL-aware,
// styled to match the app: global search, sortable headers, column
// visibility, and pagination. Add it to any list surface.
export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  searchPlaceholder,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  pageSize?: number;
  searchPlaceholder?: string;
}) {
  const t = useTranslations('table');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showCols, setShowCols] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder ?? t('search')}
          className="input h-9 max-w-xs"
        />
        <div className="relative">
          <button
            onClick={() => setShowCols((v) => !v)}
            className="btn-outline h-9 gap-2 px-3 text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" /> {t('columns')}
          </button>
          {showCols && (
            <div className="absolute z-20 mt-1 w-48 rounded-md border bg-card p-2 shadow-md">
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-1 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                  />
                  {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                </label>
              ))}
            </div>
          )}
        </div>
        <span className="ms-auto text-xs text-muted-foreground">
          {t('rows', { count: table.getFilteredRowModel().rows.length })}
        </span>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-start">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2.5 text-start font-semibold">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {t('page', {
              page: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount(),
            })}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="btn-outline h-8 px-3 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4 rtl:hidden" />
              <ChevronLeft className="hidden h-4 w-4 rtl:block" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="btn-outline h-8 px-3 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 rtl:hidden" />
              <ChevronRight className="hidden h-4 w-4 rtl:block" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
