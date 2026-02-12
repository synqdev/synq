import type { Meta, StoryObj } from '@storybook/react'
import { DataTable, type DataTableColumn, type DataTableProps } from './data-table'

type DailySalesRow = {
  day: number
  dateLabel: string
  weekday: string
  totalSales: number
  newSales: number
  returningSales: number
  digestionSales: number
  newCustomers: number
  existingCustomers: number
  nextBookingRate: number | null
  repeatRate: number | null
  weekend?: boolean
}

const yen = (value: number) => `JPY ${value.toLocaleString('ja-JP')}`
const pct = (value: number | null) => (value == null ? '- %' : `${value.toFixed(1)} %`)

const rows: DailySalesRow[] = [
  {
    day: 1,
    dateLabel: 'Feb 1',
    weekday: 'Sun',
    totalSales: 102960,
    newSales: 102960,
    returningSales: 0,
    digestionSales: 148500,
    newCustomers: 2,
    existingCustomers: 15,
    nextBookingRate: 50,
    repeatRate: 50,
    weekend: true,
  },
  {
    day: 2,
    dateLabel: 'Feb 2',
    weekday: 'Mon',
    totalSales: 302940,
    newSales: 104940,
    returningSales: 0,
    digestionSales: 57200,
    newCustomers: 3,
    existingCustomers: 8,
    nextBookingRate: 33.3,
    repeatRate: 33.3,
  },
  {
    day: 3,
    dateLabel: 'Feb 3',
    weekday: 'Tue',
    totalSales: 163680,
    newSales: 1980,
    returningSales: 0,
    digestionSales: 116600,
    newCustomers: 1,
    existingCustomers: 16,
    nextBookingRate: 0,
    repeatRate: 0,
  },
  {
    day: 4,
    dateLabel: 'Feb 4',
    weekday: 'Wed',
    totalSales: 110980,
    newSales: 1980,
    returningSales: 0,
    digestionSales: 69750,
    newCustomers: 1,
    existingCustomers: 7,
    nextBookingRate: 0,
    repeatRate: 0,
  },
  {
    day: 5,
    dateLabel: 'Feb 5',
    weekday: 'Thu',
    totalSales: 121000,
    newSales: 0,
    returningSales: 0,
    digestionSales: 156200,
    newCustomers: 0,
    existingCustomers: 16,
    nextBookingRate: null,
    repeatRate: null,
  },
  {
    day: 6,
    dateLabel: 'Feb 6',
    weekday: 'Fri',
    totalSales: 0,
    newSales: 0,
    returningSales: 0,
    digestionSales: 20350,
    newCustomers: 2,
    existingCustomers: 14,
    nextBookingRate: 0,
    repeatRate: 0,
  },
  {
    day: 7,
    dateLabel: 'Feb 7',
    weekday: 'Sat',
    totalSales: 0,
    newSales: 0,
    returningSales: 0,
    digestionSales: 0,
    newCustomers: 0,
    existingCustomers: 0,
    nextBookingRate: null,
    repeatRate: null,
    weekend: true,
  },
]

const columns: DataTableColumn<DailySalesRow>[] = [
  {
    key: 'dateLabel',
    header: 'Date',
    sortable: true,
    sortValue: (row) => row.day,
    align: 'left',
    widthClassName: 'min-w-[170px]',
    cell: (row) => (
      <span className={row.weekend ? 'font-semibold text-[#2b87d3]' : 'font-semibold text-[#1d232f]'}>
        {row.dateLabel} ({row.weekday})
      </span>
    ),
  },
  {
    key: 'totalSales',
    header: 'Total Sales',
    sortable: true,
    sortValue: (row) => row.totalSales,
    widthClassName: 'min-w-[150px]',
    cell: (row) => yen(row.totalSales),
  },
  {
    key: 'newSales',
    header: 'New Sales',
    sortable: true,
    sortValue: (row) => row.newSales,
    widthClassName: 'min-w-[150px]',
    cell: (row) => yen(row.newSales),
  },
  {
    key: 'returningSales',
    header: 'Returning Sales',
    sortable: true,
    sortValue: (row) => row.returningSales,
    widthClassName: 'min-w-[150px]',
    cell: (row) => yen(row.returningSales),
  },
  {
    key: 'digestionSales',
    header: 'Consumption Sales',
    sortable: true,
    sortValue: (row) => row.digestionSales,
    widthClassName: 'min-w-[170px]',
    cell: (row) => yen(row.digestionSales),
  },
  {
    key: 'newCustomers',
    header: 'New Count',
    sortable: true,
    sortValue: (row) => row.newCustomers,
    widthClassName: 'min-w-[120px]',
    cell: (row) => row.newCustomers,
  },
  {
    key: 'existingCustomers',
    header: 'Existing Count',
    sortable: true,
    sortValue: (row) => row.existingCustomers,
    widthClassName: 'min-w-[130px]',
    cell: (row) => row.existingCustomers,
  },
  {
    key: 'nextBookingRate',
    header: 'Next Booking %',
    sortable: true,
    sortValue: (row) => row.nextBookingRate ?? -1,
    widthClassName: 'min-w-[140px]',
    cell: (row) => pct(row.nextBookingRate),
  },
  {
    key: 'repeatRate',
    header: 'Repeat %',
    sortable: true,
    sortValue: (row) => row.repeatRate ?? -1,
    widthClassName: 'min-w-[120px]',
    cell: (row) => pct(row.repeatRate),
  },
]

const DailySalesTable = (props: DataTableProps<DailySalesRow>) => <DataTable {...props} />

const meta = {
  title: 'UI/DataTable',
  component: DailySalesTable,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DailySalesTable>

export default meta
type Story = StoryObj<typeof meta>

export const SalesDailyReport: Story = {
  args: {
    data: rows,
    columns,
    caption: 'Store sales daily report',
    defaultSort: { key: 'dateLabel', direction: 'asc' },
  },
  render: (args) => (
    <div className="p-8 bg-[#eef1f7] min-h-screen">
      <div className="mb-6 text-center text-[28px] font-semibold tracking-wide text-[#2d3342]">
        Store Daily Sales Report
      </div>
      <DataTable {...args} />
      <p className="mt-4 text-sm text-[#4c5a70]">
        Click any blue header to sort ascending/descending.
      </p>
    </div>
  ),
}
