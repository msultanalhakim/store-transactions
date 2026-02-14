'use client'

import { useState, useMemo } from 'react'
import {
  CalendarDays,
  Trash2,
  Pencil,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useCurrentUser } from '@/hooks/use-store'
import {
  getTransactions,
  editTransaction,
  deleteTransaction,
  togglePaidStatus,
  getAvailableYears,
  getAvailableMonthsForYear,
  formatRupiah,
  formatDateShort,
  formatDateFull,
  formatMonthLabel,
  getCurrentYearMonth,
  type Transaction,
} from '@/lib/store'

type SortOrder = 'newest' | 'oldest'

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

/* ── Toggle Payment Confirmation Dialog ── */
function TogglePaymentDialog({
  open,
  transaction,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  transaction: Transaction | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  if (!open || !transaction) return null

  const newStatus = !transaction.isPaid

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            newStatus ? 'bg-success/10' : 'bg-destructive/10'
          }`}>
            <AlertCircle className={`h-5 w-5 ${
              newStatus ? 'text-success' : 'text-destructive'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Ubah Status Pembayaran?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {transaction.orderName} - {transaction.customerName}
            </p>
            <p className="text-sm font-semibold mt-2">
              Status akan diubah menjadi:{' '}
              <span className={newStatus ? 'text-success' : 'text-destructive'}>
                {newStatus ? 'Lunas' : 'Belum Bayar'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 rounded-lg border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-11 flex-1 rounded-lg text-sm font-semibold transition-colors ${
              newStatus
                ? 'bg-success text-success-foreground hover:bg-success/90'
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            }`}
          >
            Ya, Ubah
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Detail Drawer ── */
function TransactionDetailDrawer({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!open || !transaction) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="w-full max-w-lg rounded-t-2xl bg-card p-6 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Detail Transaksi</h2>
            <p className="text-sm text-muted-foreground">{formatDateFull(transaction.date)}</p>
          </div>
          <div
            className={`rounded-lg px-3 py-1 text-sm font-bold ${
              transaction.isPaid
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {transaction.isPaid ? 'Lunas' : 'Belum Bayar'}
          </div>
        </div>

        <div className="space-y-4 pb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Pemesan</p>
            <p className="text-base font-semibold text-foreground">{transaction.customerName}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Pesanan</p>
            <p className="text-base font-semibold text-foreground break-words">
              {transaction.orderName}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Harga</p>
            <p className="text-xl font-bold text-primary">{formatRupiah(transaction.price)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-11 w-full rounded-lg border border-border bg-background text-base font-medium text-foreground transition-colors hover:bg-muted"
        >
          Tutup
        </button>
      </div>
    </div>
  )
}

/* ── Edit Drawer ── */
function EditTransactionDrawer({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [date, setDate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderName, setOrderName] = useState('')
  const [price, setPrice] = useState('')
  const [isPaid, setIsPaid] = useState(false)

  if (transaction && open && date === '' && customerName === '') {
    setDate(transaction.date)
    setCustomerName(transaction.customerName)
    setOrderName(transaction.orderName)
    setPrice(transaction.price.toString())
    setIsPaid(transaction.isPaid)
  }

  async function handleSave() {
    if (!transaction || !customerName.trim() || !orderName.trim() || !price) return

    try {
      await editTransaction(transaction.id, {
        date,
        customerName: customerName.trim(),
        orderName: orderName.trim(),
        price: Number(price),
        isPaid,
      })
      toast.success('Transaksi berhasil diubah')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error('Gagal mengubah transaksi')
      console.error(error)
    }
  }

  function resetForm() {
    setDate('')
    setCustomerName('')
    setOrderName('')
    setPrice('')
    setIsPaid(false)
  }

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={() => {
        onOpenChange(false)
        resetForm()
      }}
    >
      <div 
        className="w-full max-w-lg rounded-t-2xl bg-card p-6 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">Edit Transaksi</h2>
          <p className="text-sm text-muted-foreground">Ubah data transaksi di bawah ini</p>
        </div>

        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-date" className="text-sm font-medium">
              Tanggal
            </label>
            <div className="relative">
              <input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background pl-4 pr-12 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-customer" className="text-sm font-medium">
              Nama Pemesan
            </label>
            <input
              id="edit-customer"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-order" className="text-sm font-medium">
              Pesanan
            </label>
            <input
              id="edit-order"
              type="text"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-price" className="text-sm font-medium">
              Harga (Rp)
            </label>
            <input
              id="edit-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
            <label htmlFor="edit-paid" className="text-sm font-medium">
              Sudah Bayar?
            </label>
            <input
              id="edit-paid"
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false)
              resetForm()
            }}
            className="h-11 flex-1 rounded-lg border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete Dialog ── */
function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Hapus Transaksi?</h3>
            <p className="text-sm text-muted-foreground">
              Transaksi yang dihapus tidak dapat dikembalikan
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 rounded-lg border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 flex-1 rounded-lg bg-destructive text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Transaction Row ── */
function TransactionRow({
  t,
  admin,
  onEdit,
  onDelete,
  onShowDetail,
  onTogglePaid,
}: {
  t: Transaction
  admin: boolean
  onEdit: () => void
  onDelete: () => void
  onShowDetail: () => void
  onTogglePaid: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  function handleTogglePaidClick(e: React.MouseEvent) {
    e.stopPropagation()
    onTogglePaid()
  }

  return (
    <div>
      <div
        onClick={() => (admin ? setExpanded(!expanded) : onShowDetail())}
        className={`grid w-full items-center cursor-pointer transition-colors active:bg-muted/40 px-4 py-2.5 ${
          admin
            ? 'grid-cols-[60px_1fr_72px_50px_20px] gap-3'
            : 'grid-cols-[60px_1fr_72px_50px] gap-3'
        }`}
      >
        {/* Date */}
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
          {formatDateShort(t.date)}
        </span>

        {/* Order details */}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-card-foreground">
            {t.customerName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{t.orderName}</p>
        </div>

        {/* Price */}
        <span className="text-right text-[13px] font-bold text-card-foreground tabular-nums whitespace-nowrap">
          {formatRupiah(t.price)}
        </span>

        {/* Status - now a div instead of button to avoid nesting */}
        <div className="flex justify-center">
          <div
            onClick={handleTogglePaidClick}
            className={`px-1.5 py-0 text-[10px] font-bold leading-5 rounded cursor-pointer select-none transition-colors ${
              t.isPaid
                ? 'bg-success text-success-foreground hover:bg-success/90'
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            }`}
          >
            {t.isPaid ? 'Lunas' : 'Belum'}
          </div>
        </div>

        {/* Expand chevron (admin only) */}
        {admin && (
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {/* Admin actions */}
      {admin && expanded && (
        <div className="flex items-center justify-end gap-3 border-t border-dashed border-border bg-muted/20 px-4 py-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 active:bg-primary/20"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/20"
          >
            <Trash2 className="h-3 w-3" />
            Hapus
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Main List ── */
export function TransactionList() {
  const transactions = useStore(getTransactions)
  const availableYears = useStore(getAvailableYears)
  const user = useCurrentUser()
  const admin = user?.role === 'admin'

  const { year: currentYear, month: currentMonth } = getCurrentYearMonth()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailTx, setDetailTx] = useState<Transaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [toggleTx, setToggleTx] = useState<Transaction | null>(null)
  const [toggleOpen, setToggleOpen] = useState(false)

  const availableMonths = getAvailableMonthsForYear(selectedYear)

  // Auto-adjust month if not available in selected year
  if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
    setSelectedMonth(availableMonths[0])
  }

  const filtered = useMemo(() => {
    const filterKey = `${selectedYear}-${selectedMonth}`
    let result = transactions.filter((t) => t.date.startsWith(filterKey))

    result.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortOrder === 'newest' ? -diff : diff
    })
    return result
  }, [transactions, selectedYear, selectedMonth, sortOrder])

  const totalFiltered = filtered.reduce((s, t) => s + t.price, 0)
  const unpaidCount = filtered.filter((t) => !t.isPaid).length

  function handleEdit(t: Transaction) {
    setEditingTx(t)
    setEditOpen(true)
  }

  function handleShowDetail(t: Transaction) {
    setDetailTx(t)
    setDetailOpen(true)
  }

  function handleTogglePaid(t: Transaction) {
    setToggleTx(t)
    setToggleOpen(true)
  }

  async function handleToggleConfirm() {
    if (toggleTx) {
      try {
        await togglePaidStatus(toggleTx.id)
        const newStatus = !toggleTx.isPaid
        toast.success(`Status diubah menjadi ${newStatus ? 'Lunas' : 'Belum Bayar'}`)
        setToggleOpen(false)
        setToggleTx(null)
      } catch (error) {
        toast.error('Gagal mengubah status')
        console.error(error)
      }
    }
  }

  async function handleDeleteConfirm() {
    if (deleteId) {
      try {
        await deleteTransaction(deleteId)
        toast.success('Transaksi berhasil dihapus')
        setDeleteId(null)
      } catch (error) {
        toast.error('Gagal menghapus transaksi')
        console.error(error)
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
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

      {/* Controls: sort + summary strip */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {filtered.length} transaksi
            {unpaidCount > 0 ? ` · ${unpaidCount} belum bayar` : ''}
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formatRupiah(totalFiltered)}
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
          }
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-muted-foreground">
            Tidak ada transaksi
          </p>
          <p className="text-xs text-muted-foreground/70">
            {admin ? 'Tekan + untuk menambah' : 'Belum ada data untuk periode ini'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Header */}
          <div
            className={`grid items-center border-b border-border bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${
              admin
                ? 'grid-cols-[60px_1fr_72px_50px_20px] gap-3'
                : 'grid-cols-[60px_1fr_72px_50px] gap-3'
            }`}
          >
            <span>Tanggal</span>
            <span>Pesanan</span>
            <span className="text-right">Harga</span>
            <span className="text-center">Status</span>
            {admin && <span className="sr-only">Aksi</span>}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((t) => (
              <TransactionRow
                key={t.id}
                t={t}
                admin={admin}
                onEdit={() => handleEdit(t)}
                onDelete={() => setDeleteId(t.id)}
                onShowDetail={() => handleShowDetail(t)}
                onTogglePaid={() => handleTogglePaid(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail drawer (for non-admin users) */}
      <TransactionDetailDrawer
        transaction={detailTx}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Edit drawer (admin only) */}
      {admin && (
        <EditTransactionDrawer
          transaction={editingTx}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      {/* Delete dialog */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Toggle payment confirmation dialog */}
      <TogglePaymentDialog
        open={toggleOpen}
        transaction={toggleTx}
        onOpenChange={setToggleOpen}
        onConfirm={handleToggleConfirm}
      />
    </div>
  )
}