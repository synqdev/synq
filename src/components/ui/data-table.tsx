'use client'

import { useMemo, useState, type ReactNode } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface DataTableColumn<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'center' | 'right'
  widthClassName?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  defaultSort?: {
    key: string
    direction?: SortDirection
  }
  caption?: string
  className?: string
  rowClassName?: (row: T, index: number) => string
  striped?: boolean
}

/**
 * Generic data table with optional sortable headers.
 * Sorting toggles asc -> desc when a header is clicked repeatedly.
 */
export function DataTable<T>({
  data,
  columns,
  defaultSort,
  caption,
  className = '',
  rowClassName,
  striped = true,
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(
    defaultSort ? { key: defaultSort.key, direction: defaultSort.direction ?? 'asc' } : null
  )

  const sortedRows = useMemo(() => {
    if (!sortState) return data

    const column = columns.find((item) => item.key === sortState.key)
    if (!column?.sortable) return data

    const rows = [...data]

    rows.sort((a, b) => {
      const leftValue = column.sortValue ? column.sortValue(a) : null
      const rightValue = column.sortValue ? column.sortValue(b) : null

      if (leftValue == null && rightValue == null) return 0
      if (leftValue == null) return 1
      if (rightValue == null) return -1

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return leftValue - rightValue
      }

      return String(leftValue).localeCompare(String(rightValue), 'ja-JP', {
        numeric: true,
        sensitivity: 'base',
      })
    })

    if (sortState.direction === 'desc') {
      rows.reverse()
    }

    return rows
  }, [columns, data, sortState])

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return

    setSortState((current) => {
      if (!current || current.key !== column.key) {
        return { key: column.key, direction: 'asc' }
      }

      return {
        key: column.key,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      }
    })
  }

  const alignmentClasses: Record<NonNullable<DataTableColumn<T>['align']>, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const sortIndicator = (column: DataTableColumn<T>) => {
    if (!column.sortable) return null

    if (sortState?.key === column.key) {
      return (
        <span className="ml-2 text-[11px] font-semibold tracking-wide text-blue-100">
          {sortState.direction === 'asc' ? 'ASC' : 'DESC'}
        </span>
      )
    }

    return <span className="ml-2 text-[11px] font-semibold tracking-wide text-blue-200">SORT</span>
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-[#cfd5df] bg-white shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          {caption ? <caption className="sr-only">{caption}</caption> : null}

          <thead>
            <tr className="bg-[#2f5ba6] text-white">
              {columns.map((column) => {
                const alignClass = alignmentClasses[column.align ?? 'center']

                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={`border-r border-[#b7c2d6] px-4 py-3 text-sm font-semibold last:border-r-0 ${alignClass} ${column.widthClassName ?? ''}`}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={`flex w-full items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:bg-[#264d8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                          column.align === 'left'
                            ? 'justify-start'
                            : column.align === 'right'
                              ? 'justify-end'
                              : 'justify-center'
                        }`}
                      >
                        <span>{column.header}</span>
                        {sortIndicator(column)}
                      </button>
                    ) : (
                      <span>{column.header}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row, index) => (
              <tr
                key={index}
                className={`${
                  striped
                    ? index % 2 === 0
                      ? 'bg-[#d4dae3]'
                      : 'bg-[#eff1f5]'
                    : 'bg-white'
                } text-[#1d232f] ${rowClassName ? rowClassName(row, index) : ''}`}
              >
                {columns.map((column) => {
                  const alignClass = alignmentClasses[column.align ?? 'center']

                  return (
                    <td
                      key={column.key}
                      className={`border-r border-[#d0d5de] px-4 py-3 text-[16px] font-medium last:border-r-0 ${alignClass}`}
                    >
                      {column.cell(row)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
