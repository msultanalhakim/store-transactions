'use client'

import { useState, useMemo } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  Users,
  ShoppingBag,
  AlertTriangle,
  Infinity,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useCurrentUser } from '@/hooks/use-store'
import {
  getCustomerSummaries,
  getAllCustomerSummaries,
  getAvailableYears,
  getAvailableMonthsForYear,
  formatMonthLabel,
  formatRupiah,
  formatDateShort,
  getCurrentYearMonth,
  getTransactions,
  exportTransactionsToCSV,
  downloadCSV,
  type CustomerSummary as CustomerSummaryType,
} from '@/lib/store'

const ITEMS_PER_PAGE = 10

/* ── Summary Cards ── */
function SummaryCards({ 
  summaries,
  onCustomersClick 
}: { 
  summaries: CustomerSummaryType[]
  onCustomersClick: () => void
}) {
  const totalCustomers = summaries.length
  const totalOrders = summaries.reduce((sum, s) => sum + s.totalOrders, 0)
  const totalUnpaid = summaries.reduce((sum, s) => sum + s.unpaidAmount, 0)
  const totalRevenue = summaries.reduce((sum, s) => sum + s.totalAmount, 0)

  return (
    <div className="space-y-2">
      {/* Total Keuntungan */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Keuntungan</p>
            <p className="text-2xl font-bold text-primary">{formatRupiah(totalRevenue)}</p>
            {totalUnpaid > 0 && (
              <p className="text-xs text-destructive font-medium mt-1">
                *Belum termasuk piutang {formatRupiah(totalUnpaid)}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onCustomersClick}
          className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted active:bg-muted/70"
        >
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-bold text-card-foreground">{totalCustomers}</span>
          <span className="text-[10px] text-muted-foreground">Pemesan</span>
        </button>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 shadow-sm">
          <ShoppingBag className="h-4 w-4 text-success" />
          <span className="text-lg font-bold text-card-foreground">{totalOrders}</span>
          <span className="text-[10px] text-muted-foreground">Pesanan</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-bold text-destructive leading-6">
            {formatRupiah(totalUnpaid)}
          </span>
          <span className="text-[10px] text-muted-foreground">Piutang</span>
        </div>
      </div>
    </div>
  )
}

/* ── Compact Date Selector ── */
function DateSelector({
  years,
  months,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}: {
  years: string[]
  months: string[]
  selectedYear: string
  selectedMonth: string
  onYearChange: (year: string) => void
  onMonthChange: (month: string) => void
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const monthIndex = months.indexOf(selectedMonth)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX) return

    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchStartX - touchEndX

    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0 && monthIndex < months.length - 1) {
        onMonthChange(months[monthIndex + 1])
      } else if (deltaX < 0 && monthIndex > 0) {
        onMonthChange(months[monthIndex - 1])
      }
    }
    setTouchStartX(null)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2">
      {/* Year chips - compact */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {years.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onYearChange(year)}
            className={`flex-shrink-0 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              year === selectedYear
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted active:scale-95'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Month navigation with counter */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex items-center justify-between gap-2"
      >
        <button
          type="button"
          onClick={() => monthIndex > 0 && onMonthChange(months[monthIndex - 1])}
          disabled={monthIndex === 0}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 transition-all hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 text-center">
          <div className="text-lg font-bold text-foreground">
            {formatMonthLabel(selectedMonth)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {monthIndex + 1} / {months.length}
          </div>
        </div>

        <button
          type="button"
          onClick={() => monthIndex < months.length - 1 && onMonthChange(months[monthIndex + 1])}
          disabled={monthIndex === months.length - 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 transition-all hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ── Customer Table with Pagination ── */
function CustomerTable({
  title,
  customers,
  variant,
  onCustomerClick,
}: {
  title: string
  customers: CustomerSummaryType[]
  variant: 'piutang' | 'lunas'
  onCustomerClick: (c: CustomerSummaryType) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)

  if (customers.length === 0) return null

  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCustomers = customers.slice(startIndex, endIndex)

  return (
    <div>
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[1fr_36px_76px_20px] items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Pemesan</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Total</span>
          <span className="sr-only">Detail</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {paginatedCustomers.map((s) => (
            <button
              key={s.customerName}
              type="button"
              onClick={() => onCustomerClick(s)}
              className="grid w-full grid-cols-[1fr_36px_76px_20px] items-center gap-2 px-4 py-2.5 text-left transition-colors active:bg-muted/40"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Indicator dot */}
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                    variant === 'piutang' ? 'bg-destructive' : 'bg-success'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-card-foreground leading-tight">
                    {s.customerName}
                  </p>
                </div>
              </div>
              <span className="text-center text-[13px] font-bold text-card-foreground tabular-nums">
                {s.unpaidOrders.length}
              </span>
              <span className="text-right text-[13px] font-bold text-destructive tabular-nums">
                {formatRupiah(s.unpaidAmount)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── All Customers Drawer ── */
function AllCustomersDrawer({
  summaries,
  open,
  onOpenChange,
}: {
  summaries: CustomerSummaryType[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  if (!open) return null

  // Sort by total amount (highest spender first)
  const sortedCustomers = [...summaries].sort((a, b) => b.totalAmount - a.totalAmount)

  const totalPages = Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCustomers = sortedCustomers.slice(startIndex, endIndex)

  const totalSpending = summaries.reduce((sum, s) => sum + s.totalAmount, 0)

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={() => {
        onOpenChange(false)
        setCurrentPage(1)
      }}
    >
      <div 
        className="w-full max-w-lg rounded-t-2xl bg-card p-6 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">Semua Pemesan</h2>
          <p className="text-sm text-muted-foreground">
            {summaries.length} pemesan · Total spending {formatRupiah(totalSpending)}
          </p>
        </div>

        <div className="pb-2">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1fr_40px_90px] items-center gap-3 border-b border-border bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Nama</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Spending</span>
            </div>
            <div className="divide-y divide-border">
              {paginatedCustomers.map((customer, index) => {
                const globalIndex = startIndex + index + 1
                return (
                  <div
                    key={customer.customerName}
                    className="grid grid-cols-[1fr_40px_90px] items-center gap-3 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-6">
                        #{globalIndex}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-card-foreground">
                          {customer.customerName}
                        </p>
                        {customer.unpaidAmount > 0 && (
                          <p className="text-[11px] text-destructive font-medium">
                            Piutang {formatRupiah(customer.unpaidAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-center text-[13px] font-bold text-card-foreground tabular-nums">
                      {customer.totalOrders}
                    </span>
                    <span className="text-right text-[13px] font-bold text-primary tabular-nums">
                      {formatRupiah(customer.totalAmount)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-muted-foreground">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false)
              setCurrentPage(1) // Reset page when closing
            }}
            className="h-11 w-full rounded-lg border border-border bg-background text-base font-medium text-foreground transition-colors hover:bg-muted"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Detail Drawer ── */
function CustomerDetailDrawer({
  customer,
  open,
  onOpenChange,
}: {
  customer: CustomerSummaryType | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const user = useCurrentUser()
  const isAdminUser = user?.role === 'admin'
  const [paymentAmount, setPaymentAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!open || !customer) return null

  async function handlePayment() {
    if (!paymentAmount || !customer) return

    const amount = Number.parseFloat(paymentAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Masukkan jumlah pembayaran yang valid')
      return
    }

    if (amount > customer.unpaidAmount) {
      toast.error(`Jumlah melebihi total piutang (${formatRupiah(customer.unpaidAmount)})`)
      return
    }

    setIsProcessing(true)
    
    try {
      const { makePayment } = await import('@/lib/store')
      const success = await makePayment(customer.customerName, amount)
      
      if (success) {
        toast.success(`Pembayaran ${formatRupiah(amount)} berhasil dicatat`)
        setPaymentAmount('')
        
        // Close drawer if fully paid
        const remaining = customer.unpaidAmount - amount
        if (remaining <= 0) {
          onOpenChange(false)
        }
      } else {
        toast.error('Gagal memproses pembayaran')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter out fully paid orders and calculate remaining amount for partially paid orders
  const unpaidOrdersWithRemaining = customer.unpaidOrders.map(order => {
    const paidAmount = order.paidAmount || 0
    const remaining = order.price - paidAmount
    return {
      ...order,
      remainingAmount: remaining
    }
  }).filter(order => order.remainingAmount > 0)

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="w-full max-w-lg rounded-t-2xl bg-card p-6 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">{customer.customerName}</h2>
          <p className="text-sm text-muted-foreground">
            {unpaidOrdersWithRemaining.length > 0
              ? `${unpaidOrdersWithRemaining.length} pesanan belum dibayar`
              : 'Semua pesanan sudah lunas'}
          </p>
        </div>

        <div className="pb-2">
          {unpaidOrdersWithRemaining.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl border border-border mb-4">
                <div className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-border bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Tanggal</span>
                  <span>Pesanan</span>
                  <span className="text-right min-w-[72px]">Sisa Hutang</span>
                </div>
                <div className="divide-y divide-border bg-destructive/5">
                  {unpaidOrdersWithRemaining.map((order) => (
                    <div
                      key={order.id}
                      className="grid grid-cols-[56px_1fr_auto] items-center gap-3 px-4 py-2"
                    >
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDateShort(order.date)}
                      </span>
                      <p className="truncate text-[13px] font-medium text-card-foreground">
                        {order.orderName}
                      </p>
                      <span className="text-[13px] font-bold text-destructive text-right min-w-[72px] tabular-nums">
                        {formatRupiah(order.remainingAmount)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-2.5">
                  <span className="text-sm font-semibold text-foreground">Total Piutang</span>
                  <span className="text-base font-bold text-destructive tabular-nums">
                    {formatRupiah(customer.unpaidAmount)}
                  </span>
                </div>
              </div>

              {/* Payment section (admin only) */}
              {isAdminUser && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
                  <p className="text-sm font-semibold text-foreground mb-3">Catat Pembayaran</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Jumlah bayar"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      disabled={isProcessing}
                      className="flex-1 h-11 rounded-lg border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={handlePayment}
                      disabled={!paymentAmount || isProcessing}
                      className="h-11 px-6 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing ? 'Proses...' : 'Bayar'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Pembayaran akan mengurangi piutang tertua terlebih dahulu
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-8">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <ShoppingBag className="h-7 w-7 text-success" />
              </div>
              <p className="text-lg font-medium text-success">Semua Lunas</p>
              <p className="text-sm text-muted-foreground">Tidak ada tagihan tersisa</p>
            </div>
          )}
        </div>

        <div className="pt-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="h-11 w-full rounded-lg border border-border bg-background text-base font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Export ── */
export function CustomerSummary() {
  const { year: currentYear, month: currentMonth } = getCurrentYearMonth()
  const [filterMode, setFilterMode] = useState<'monthly' | 'all'>('all') // Default to 'all' (Keseluruhan)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryType | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [allCustomersOpen, setAllCustomersOpen] = useState(false)

  const availableYears = useStore(getAvailableYears)
  const availableMonths = getAvailableMonthsForYear(selectedYear)

  // Auto-adjust month if not available in selected year
  if (
    filterMode === 'monthly' &&
    availableMonths.length > 0 &&
    !availableMonths.includes(selectedMonth)
  ) {
    setSelectedMonth(availableMonths[0])
  }

  // Get all transactions to trigger re-render when they change
  const allTransactions = useStore(getTransactions)
  
  // Get summaries based on filter mode - using useMemo for reactivity
  const summaries = useMemo(() => {
    if (filterMode === 'all') {
      return getAllCustomerSummaries()
    } else {
      return getCustomerSummaries(`${selectedYear}-${selectedMonth}`)
    }
  }, [allTransactions, filterMode, selectedYear, selectedMonth])

  function handleCustomerClick(customer: CustomerSummaryType) {
    setSelectedCustomer(customer)
    setDrawerOpen(true)
  }

  function handleExportCSV() {
    try {
      const monthFilter = filterMode === 'monthly' ? `${selectedYear}-${selectedMonth}` : undefined
      const csvContent = exportTransactionsToCSV(monthFilter)
      
      const filename = filterMode === 'monthly'
        ? `transaksi-${formatMonthLabel(selectedMonth)}-${selectedYear}.csv`
        : 'transaksi-keseluruhan.csv'
      
      downloadCSV(csvContent, filename)
      toast.success('Data berhasil diexport')
    } catch (error) {
      toast.error('Gagal export data')
      console.error(error)
    }
  }

  // Split into piutang (unpaid) and lunas (all paid)
  const withPiutang = summaries.filter((s) => s.unpaidAmount > 0)
  const allLunas = summaries.filter((s) => s.unpaidAmount === 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Mode Toggle */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Periode
        </label>
        <div className="flex gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              <Infinity className="h-4 w-4" />
              Keseluruhan
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('monthly')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                filterMode === 'monthly'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Bulanan
            </button>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-success-foreground shadow-sm transition-all hover:bg-success/90 active:scale-95"
            title="Export ke CSV"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Monthly filters */}
      {filterMode === 'monthly' && (
        <>
          {/* Date selector */}
          {availableYears.length > 0 && availableMonths.length > 0 && (
            <DateSelector
              years={availableYears}
              months={availableMonths}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
            />
          )}
        </>
      )}

      {/* Stats cards */}
      <SummaryCards summaries={summaries} onCustomersClick={() => setAllCustomersOpen(true)} />

      {/* No data state */}
      {summaries.length === 0 && (
        <div className="flex flex-col items-center py-10">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {filterMode === 'all'
              ? 'Belum ada transaksi'
              : 'Tidak ada transaksi di bulan ini'}
          </p>
        </div>
      )}

      {/* Piutang table (only customers with unpaid) - with pagination */}
      {withPiutang.length > 0 && (
        <CustomerTable
          title={`Punya Piutang (${withPiutang.length})`}
          customers={withPiutang}
          variant="piutang"
          onCustomerClick={handleCustomerClick}
        />
      )}

      {/* Info if all paid */}
      {withPiutang.length === 0 && summaries.length > 0 && (
        <div className="flex flex-col items-center py-8 rounded-xl border border-border bg-success/5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <ShoppingBag className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm font-semibold text-success">Semua Pesanan Lunas!</p>
          <p className="text-xs text-muted-foreground">Tidak ada piutang tersisa</p>
        </div>
      )}

      <CustomerDetailDrawer
        customer={selectedCustomer}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <AllCustomersDrawer
        summaries={summaries}
        open={allCustomersOpen}
        onOpenChange={setAllCustomersOpen}
      />
    </div>
  )
}