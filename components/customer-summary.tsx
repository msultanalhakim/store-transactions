'use client'

import { useState, useMemo } from 'react'
import {
  ChevronRight, ChevronLeft, Users, ShoppingBag, AlertTriangle,
  Infinity, Download, Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useCurrentUser } from '@/hooks/use-store'
import {
  getCustomerSummaries, getAllCustomerSummaries, getAvailableYears,
  getAvailableMonthsForYear, formatMonthLabel, formatRupiah, formatDateFull,
  formatDateShort, getCurrentYearMonth, getTransactions,
  exportTransactionsToCSV, downloadCSV,
  makePayment,
  type CustomerSummary as CustomerSummaryType,
  type Transaction,
} from '@/lib/store'

const ITEMS_PER_PAGE = 10

// ─── Summary Cards ────────────────────────────────────────────────────────────
function SummaryCards({ summaries, onCustomersClick }: {
  summaries: CustomerSummaryType[]; onCustomersClick: () => void
}) {
  const totalCustomers = summaries.length
  const totalOrders = summaries.reduce((s, c) => s + c.totalOrders, 0)
  const totalUnpaid = summaries.reduce((s, c) => s + c.unpaidAmount, 0)
  const totalRevenue = summaries.reduce((s, c) => s + c.paidAmount, 0)
  const totalBilled = summaries.reduce((s, c) => s + c.totalAmount, 0)

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Tagihan</p>
            <p className="text-2xl font-bold text-primary">{formatRupiah(totalBilled)}</p>
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs text-success font-medium">Terbayar: {formatRupiah(totalRevenue)}</p>
              {totalUnpaid > 0 && (
                <p className="text-xs text-destructive font-medium">Piutang: {formatRupiah(totalUnpaid)}</p>
              )}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onCustomersClick}
          className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 shadow-sm hover:bg-muted transition-colors">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-bold">{totalCustomers}</span>
          <span className="text-[10px] text-muted-foreground">Pemesan</span>
        </button>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 shadow-sm">
          <ShoppingBag className="h-4 w-4 text-success" />
          <span className="text-lg font-bold">{totalOrders}</span>
          <span className="text-[10px] text-muted-foreground">Pesanan</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-bold text-destructive leading-6">{formatRupiah(totalUnpaid)}</span>
          <span className="text-[10px] text-muted-foreground">Piutang</span>
        </div>
      </div>
    </div>
  )
}

// ─── Date Selector ────────────────────────────────────────────────────────────
function DateSelector({ years, months, selectedYear, selectedMonth, onYearChange, onMonthChange }: {
  years: string[]; months: string[]; selectedYear: string; selectedMonth: string
  onYearChange: (y: string) => void; onMonthChange: (m: string) => void
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const monthIndex = months.indexOf(selectedMonth)

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {years.map((year) => (
          <button key={year} type="button" onClick={() => onYearChange(year)}
            className={`flex-shrink-0 rounded-lg px-3 py-1 text-xs font-bold transition-all ${year === selectedYear ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}>
            {year}
          </button>
        ))}
      </div>
      <div
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (!touchStartX) return
          const delta = touchStartX - e.changedTouches[0].clientX
          if (Math.abs(delta) > 50) {
            if (delta > 0 && monthIndex < months.length - 1) onMonthChange(months[monthIndex + 1])
            else if (delta < 0 && monthIndex > 0) onMonthChange(months[monthIndex - 1])
          }
          setTouchStartX(null)
        }}
        className="flex items-center justify-between gap-2"
      >
        <button type="button" onClick={() => monthIndex > 0 && onMonthChange(months[monthIndex - 1])} disabled={monthIndex === 0}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 hover:bg-muted disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-lg font-bold">{formatMonthLabel(selectedMonth)}</div>
          <div className="text-[10px] text-muted-foreground">{monthIndex + 1} / {months.length}</div>
        </div>
        <button type="button" onClick={() => monthIndex < months.length - 1 && onMonthChange(months[monthIndex + 1])} disabled={monthIndex === months.length - 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 hover:bg-muted disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Customer Table ───────────────────────────────────────────────────────────
function CustomerTable({ title, customers, variant, onCustomerClick }: {
  title: string; customers: CustomerSummaryType[]
  variant: 'piutang' | 'lunas'; onCustomerClick: (c: CustomerSummaryType) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)
  if (customers.length === 0) return null
  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE)
  const paginated = customers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div>
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[1fr_36px_80px_20px] items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Pemesan</span><span className="text-center">Qty</span>
          <span className="text-right">{variant === 'piutang' ? 'Piutang' : 'Total'}</span>
          <span className="sr-only">Detail</span>
        </div>
        <div className="divide-y divide-border">
          {paginated.map((s) => (
            <button key={s.customerName} type="button" onClick={() => onCustomerClick(s)}
              className="grid w-full grid-cols-[1fr_36px_80px_20px] items-center gap-2 px-4 py-2.5 text-left transition-colors active:bg-muted/40 hover:bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${variant === 'piutang' ? 'bg-destructive' : 'bg-success'}`} />
                <p className="truncate text-[13px] font-semibold">{s.customerName}</p>
              </div>
              <span className="text-center text-[13px] font-bold tabular-nums">{s.totalOrders}</span>
              <span className={`text-right text-[13px] font-bold tabular-nums ${variant === 'piutang' ? 'text-destructive' : 'text-foreground'}`}>
                {formatRupiah(variant === 'piutang' ? s.unpaidAmount : s.totalAmount)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">Halaman {currentPage} dari {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── All Customers Drawer ─────────────────────────────────────────────────────
function AllCustomersDrawer({ summaries, open, onOpenChange }: {
  summaries: CustomerSummaryType[]; open: boolean; onOpenChange: (v: boolean) => void
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const PER_PAGE = 15
  if (!open) return null

  const sorted = [...summaries].sort((a, b) => b.totalAmount - a.totalAmount)
  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const paginated = sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const totalSpending = summaries.reduce((s, c) => s + c.totalAmount, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => { onOpenChange(false); setCurrentPage(1) }}>
      <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Semua Pemesan</h2>
          <p className="text-sm text-muted-foreground">{summaries.length} pemesan · Total {formatRupiah(totalSpending)}</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border mb-4">
          <div className="grid grid-cols-[1fr_40px_90px] items-center gap-3 border-b border-border bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Nama</span><span className="text-center">Qty</span><span className="text-right">Spending</span>
          </div>
          <div className="divide-y divide-border">
            {paginated.map((c, i) => (
              <div key={c.customerName} className="grid grid-cols-[1fr_40px_90px] items-center gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{(currentPage - 1) * PER_PAGE + i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{c.customerName}</p>
                    {c.unpaidAmount > 0 && <p className="text-[11px] text-destructive font-medium">Piutang {formatRupiah(c.unpaidAmount)}</p>}
                  </div>
                </div>
                <span className="text-center text-[13px] font-bold tabular-nums">{c.totalOrders}</span>
                <span className="text-right text-[13px] font-bold text-primary tabular-nums">{formatRupiah(c.totalAmount)}</span>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
              <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">Halaman {currentPage} dari {totalPages}</span>
              <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <button type="button" onClick={() => { onOpenChange(false); setCurrentPage(1) }}
          className="h-11 w-full rounded-lg border border-border bg-background text-base font-medium hover:bg-muted">Tutup</button>
      </div>
    </div>
  )
}

// ─── Customer Detail Drawer ───────────────────────────────────────────────────
function CustomerDetailDrawer({ customer, open, onOpenChange }: {
  customer: CustomerSummaryType | null; open: boolean; onOpenChange: (v: boolean) => void
}) {
  const user = useCurrentUser()
  const isAdminUser = user?.role === 'admin'
  const [paymentAmount, setPaymentAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

  if (!open || !customer) return null

  // Orders still owed
  const unpaidOrders = customer.unpaidOrders.filter((t) => t.price - t.paidAmount > 0)

  async function handlePayment() {
    if (!paymentAmount || !customer) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Masukkan jumlah yang valid'); return }
    if (amount > customer.unpaidAmount) { toast.error(`Melebihi total piutang ${formatRupiah(customer.unpaidAmount)}`); return }

    setIsProcessing(true)
    try {
      const success = await makePayment(customer.customerName, amount)
      if (success) {
        toast.success(`Pembayaran ${formatRupiah(amount)} berhasil dicatat`)
        setPaymentAmount('')
        // Close if fully paid
        if (amount >= customer.unpaidAmount) onOpenChange(false)
      } else {
        toast.error('Gagal memproses pembayaran')
      }
    } catch { toast.error('Terjadi kesalahan') }
    finally { setIsProcessing(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <h2 className="text-xl font-bold">{customer.customerName}</h2>
          <p className="text-sm text-muted-foreground">
            {unpaidOrders.length > 0 ? `${unpaidOrders.length} pesanan belum lunas` : 'Semua pesanan sudah lunas'}
          </p>
        </div>

        {unpaidOrders.length > 0 ? (
          <>
            {/* Unpaid orders with expandable detail */}
            <div className="overflow-hidden rounded-xl border border-border mb-4">
              <div className="grid grid-cols-[52px_1fr_auto_16px] items-center gap-2 border-b border-border bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Tgl</span><span>Pesanan</span><span className="text-right min-w-[72px]">Sisa</span><span />
              </div>
              <div className="divide-y divide-border bg-destructive/5">
                {unpaidOrders.map((order) => {
                  const owed = order.price - order.paidAmount
                  const isExpanded = expandedTxId === order.id
                  return (
                    <div key={order.id}>
                      <div
                        className="grid grid-cols-[52px_1fr_auto_16px] items-center gap-2 px-4 py-2 cursor-pointer hover:bg-destructive/10 transition-colors"
                        onClick={() => setExpandedTxId(isExpanded ? null : order.id)}
                      >
                        <span className="text-xs text-muted-foreground tabular-nums">{formatDateShort(order.date)}</span>
                        <p className="text-[13px] font-medium truncate">
                          {order.orderItems.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}
                        </p>
                        <span className="text-[13px] font-bold text-destructive text-right min-w-[72px] tabular-nums">{formatRupiah(owed)}</span>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-card border-t border-dashed border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">{formatDateFull(order.date)}</p>
                          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                            {order.orderItems.map((item, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                                <span>{item.name} <span className="text-muted-foreground">×{item.qty}</span></span>
                                <span className="font-semibold tabular-nums">{formatRupiah(item.price * item.qty)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between mt-2 text-sm font-semibold">
                            <span>Total</span><span className="text-primary">{formatRupiah(order.price)}</span>
                          </div>
                          {order.paidAmount > 0 && (
                            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                              <span>Sudah bayar</span><span className="text-success font-medium">{formatRupiah(order.paidAmount)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-2.5">
                <span className="text-sm font-semibold">Total Piutang</span>
                <span className="text-base font-bold text-destructive tabular-nums">{formatRupiah(customer.unpaidAmount)}</span>
              </div>
            </div>

            {/* Payment section (admin only) */}
            {isAdminUser && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
                <p className="text-sm font-semibold mb-3">Catat Pembayaran</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Jumlah bayar" value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)} disabled={isProcessing}
                    className="flex-1 h-11 rounded-lg border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    inputMode="numeric" />
                  <button type="button" onClick={handlePayment} disabled={!paymentAmount || isProcessing}
                    className="h-11 px-6 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {isProcessing ? 'Proses...' : 'Bayar'}
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setPaymentAmount(customer.unpaidAmount.toString())}
                    className="text-xs text-primary font-medium hover:underline">
                    Bayar semua ({formatRupiah(customer.unpaidAmount)})
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pembayaran akan mengurangi piutang tertua terlebih dahulu</p>
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

        <button type="button" onClick={() => onOpenChange(false)} disabled={isProcessing}
          className="h-11 w-full rounded-lg border border-border bg-background text-base font-medium hover:bg-muted disabled:opacity-50">
          Tutup
        </button>
      </div>
    </div>
  )
}

// We need ChevronDown import
import { ChevronDown } from 'lucide-react'

// ─── Main ─────────────────────────────────────────────────────────────────────
export function CustomerSummary() {
  const { year: currentYear, month: currentMonth } = getCurrentYearMonth()
  const [filterMode, setFilterMode] = useState<'monthly' | 'all'>('all')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryType | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [allCustomersOpen, setAllCustomersOpen] = useState(false)

  const availableYears = useStore(getAvailableYears)
  const availableMonths = getAvailableMonthsForYear(selectedYear)
  const allTransactions = useStore(getTransactions)

  if (filterMode === 'monthly' && availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
    setSelectedMonth(availableMonths[0])
  }

  const summaries = useMemo(() => {
    if (filterMode === 'all') return getAllCustomerSummaries()
    return getCustomerSummaries(`${selectedYear}-${selectedMonth}`)
  }, [allTransactions, filterMode, selectedYear, selectedMonth])

  // When customer data changes (e.g., after payment), refresh selected customer
  const selectedCustomerRefreshed = useMemo(() => {
    if (!selectedCustomer) return null
    return summaries.find((s) => s.customerName === selectedCustomer.customerName) ?? null
  }, [summaries, selectedCustomer])

  function handleCustomerClick(customer: CustomerSummaryType) {
    setSelectedCustomer(customer)
    setDrawerOpen(true)
  }

  function handleExportCSV() {
    try {
      const monthFilter = filterMode === 'monthly' ? `${selectedYear}-${selectedMonth}` : undefined
      const csv = exportTransactionsToCSV(monthFilter)
      const filename = filterMode === 'monthly'
        ? `transaksi-${formatMonthLabel(selectedMonth)}-${selectedYear}.csv`
        : 'transaksi-keseluruhan.csv'
      downloadCSV(csv, filename)
      toast.success('Data berhasil diexport')
    } catch { toast.error('Gagal export data') }
  }

  const withPiutang = summaries.filter((s) => s.unpaidAmount > 0)
  const allLunas = summaries.filter((s) => s.unpaidAmount === 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Period toggle */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Periode</label>
        <div className="flex gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1.5">
            <button type="button" onClick={() => setFilterMode('all')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${filterMode === 'all' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
              <Infinity className="h-4 w-4" />Keseluruhan
            </button>
            <button type="button" onClick={() => setFilterMode('monthly')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${filterMode === 'monthly' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
              <ShoppingBag className="h-4 w-4" />Bulanan
            </button>
          </div>
          <button type="button" onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-success-foreground shadow-sm hover:bg-success/90 active:scale-95">
            <Download className="h-4 w-4" />CSV
          </button>
        </div>
      </div>

      {filterMode === 'monthly' && availableYears.length > 0 && availableMonths.length > 0 && (
        <DateSelector years={availableYears} months={availableMonths}
          selectedYear={selectedYear} selectedMonth={selectedMonth}
          onYearChange={setSelectedYear} onMonthChange={setSelectedMonth} />
      )}

      <SummaryCards summaries={summaries} onCustomersClick={() => setAllCustomersOpen(true)} />

      {summaries.length === 0 && (
        <div className="flex flex-col items-center py-10">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {filterMode === 'all' ? 'Belum ada transaksi' : 'Tidak ada transaksi di bulan ini'}
          </p>
        </div>
      )}

      {withPiutang.length > 0 && (
        <CustomerTable title={`Punya Piutang (${withPiutang.length})`} customers={withPiutang} variant="piutang" onCustomerClick={handleCustomerClick} />
      )}

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
        customer={selectedCustomerRefreshed}
        open={drawerOpen}
        onOpenChange={(v) => { setDrawerOpen(v); if (!v) setSelectedCustomer(null) }} />

      <AllCustomersDrawer summaries={summaries} open={allCustomersOpen} onOpenChange={setAllCustomersOpen} />
    </div>
  )
}