'use client'

import { useState, useMemo } from 'react'
import {
  CalendarDays, Trash2, Pencil, ChevronDown,
  ChevronLeft, ChevronRight, AlertCircle, Receipt,
  ArrowUp, ArrowDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore, useCurrentUser } from '@/hooks/use-store'
import {
  getTransactions, editTransaction, deleteTransaction, togglePaidStatus,
  getAvailableYears, getAvailableMonthsForYear,
  formatRupiah, formatDateShort, formatDateFull, formatMonthLabel,
  getCurrentYearMonth, type Transaction, type OrderItem,
} from '@/lib/store'

type SortOrder = 'newest' | 'oldest'

// ─── Date Selector ────────────────────────────────────────────────────────────
function DateSelector({ years, months, selectedYear, selectedMonth, onYearChange, onMonthChange }: {
  years: string[]; months: string[]; selectedYear: string; selectedMonth: string
  onYearChange: (y: string) => void; onMonthChange: (m: string) => void
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const monthIndex = months.indexOf(selectedMonth)

  return (
    <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
      {/* Year chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {years.map((year) => (
          <button key={year} type="button" onClick={() => onYearChange(year)}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-base font-bold transition-all ${year === selectedYear ? 'bg-orange-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-slate-700'}`}>
            {year}
          </button>
        ))}
      </div>

      {/* Month nav */}
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
        className="flex items-center justify-between gap-3"
      >
        <button type="button" onClick={() => monthIndex > 0 && onMonthChange(months[monthIndex - 1])}
          disabled={monthIndex === 0}
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-30 transition-colors">
          <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatMonthLabel(selectedMonth)}</div>
          <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Bulan {monthIndex + 1} dari {months.length}</div>
        </div>
        <button type="button" onClick={() => monthIndex < months.length - 1 && onMonthChange(months[monthIndex + 1])}
          disabled={monthIndex === months.length - 1}
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-30 transition-colors">
          <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

// ─── Confirmation Dialog Base ─────────────────────────────────────────────────
function ConfirmDialog({ open, icon, iconBg, title, description, confirmLabel, confirmClass, onCancel, onConfirm }: {
  open: boolean; icon: React.ReactNode; iconBg: string; title: string; description: React.ReactNode
  confirmLabel: string; confirmClass: string; onCancel: () => void; onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-7 shadow-2xl border-2 border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h3>
            <div className="text-base text-slate-600 dark:text-slate-400 mt-1">{description}</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="h-14 flex-1 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors">
            Batal
          </button>
          <button type="button" onClick={onConfirm} className={`h-14 flex-1 rounded-xl text-base font-extrabold text-white transition-colors ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Items List ─────────────────────────────────────────────────────────
function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <div className="divide-y-2 divide-slate-100 dark:divide-slate-700 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800">
          <span className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {item.name} <span className="text-slate-400">×{item.qty}</span>
          </span>
          <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">{formatRupiah(item.price * item.qty)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function TransactionDetailDrawer({ transaction, open, onOpenChange }: {
  transaction: Transaction | null; open: boolean; onOpenChange: (v: boolean) => void
}) {
  if (!open || !transaction) return null
  const owed = Math.max(0, transaction.price - transaction.paidAmount)
  const statusLabel = transaction.isPaid ? 'Lunas' : transaction.paidAmount > 0 ? 'Cicilan' : 'Belum Bayar'
  const statusClass = transaction.isPaid
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : transaction.paidAmount > 0
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-lg rounded-t-3xl bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Detail Pesanan</h2>
            <p className="text-base font-semibold text-slate-500 dark:text-slate-400 mt-1">{formatDateFull(transaction.date)}</p>
          </div>
          <span className={`rounded-xl px-4 py-2 text-base font-extrabold ${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="space-y-5 pb-4">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 px-5 py-4">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Nama Pemesan</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{transaction.customerName}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Rincian Pesanan</p>
            <OrderItemsList items={transaction.orderItems} />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 px-5 py-4">
            <span className="text-base font-bold text-slate-700 dark:text-slate-300">Total</span>
            <span className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">{formatRupiah(transaction.price)}</span>
          </div>

          {transaction.paidAmount > 0 && !transaction.isPaid && (
            <div className="flex items-center justify-between rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 px-5 py-4">
              <span className="text-base font-bold text-amber-700 dark:text-amber-400">Sudah Dibayar</span>
              <span className="text-xl font-extrabold text-amber-700 dark:text-amber-400">{formatRupiah(transaction.paidAmount)}</span>
            </div>
          )}

          {!transaction.isPaid && (
            <div className="flex items-center justify-between rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 px-5 py-4">
              <span className="text-base font-bold text-red-700 dark:text-red-400">Sisa Hutang</span>
              <span className="text-2xl font-extrabold text-red-600 dark:text-red-400">{formatRupiah(owed)}</span>
            </div>
          )}
        </div>

        <button type="button" onClick={() => onOpenChange(false)}
          className="h-14 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors">
          Tutup
        </button>
      </div>
    </div>
  )
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────
function EditTransactionDrawer({ transaction, open, onOpenChange }: {
  transaction: Transaction | null; open: boolean; onOpenChange: (v: boolean) => void
}) {
  const [date, setDate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (transaction && open && date === '' && customerName === '') {
    setDate(transaction.date); setCustomerName(transaction.customerName); setIsPaid(transaction.isPaid)
  }
  function resetForm() { setDate(''); setCustomerName(''); setIsPaid(false) }

  async function handleSave() {
    if (!transaction || !customerName.trim() || !date) return
    setIsSubmitting(true)
    try {
      const ok = await editTransaction(transaction.id, {
        date, customerName: customerName.trim(), isPaid, paidAmount: isPaid ? transaction.price : 0,
      })
      if (ok) { toast.success('Transaksi berhasil diubah'); onOpenChange(false); resetForm() }
      else toast.error('Gagal mengubah transaksi')
    } catch { toast.error('Terjadi kesalahan') }
    finally { setIsSubmitting(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => { onOpenChange(false); resetForm() }}>
      <div className="w-full max-w-lg rounded-t-3xl bg-white dark:bg-slate-900 p-6 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Ubah Transaksi</h2>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Edit tanggal, nama, atau status bayar</p>
        </div>

        {transaction && (
          <div className="mb-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Rincian pesanan</p>
            <OrderItemsList items={transaction.orderItems} />
            <div className="flex justify-between mt-3 pt-3 border-t-2 border-slate-200 dark:border-slate-700">
              <span className="text-base font-bold text-slate-700 dark:text-slate-300">Total</span>
              <span className="text-lg font-extrabold text-orange-600 dark:text-orange-400">{formatRupiah(transaction.price)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5 pb-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-200">
              <CalendarDays className="h-5 w-5 text-orange-500" />Tanggal
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-lg font-semibold text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-base font-extrabold text-slate-800 dark:text-slate-200">Nama Pemesan</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-lg text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none" />
          </div>
          <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-5 py-4">
            <div>
              <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">Sudah Bayar?</p>
              {!isPaid && transaction && transaction.paidAmount > 0 && (
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Cicilan {formatRupiah(transaction.paidAmount)} akan direset</p>
              )}
            </div>
            <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)}
              className="h-6 w-6 rounded-lg cursor-pointer accent-orange-500" />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => { onOpenChange(false); resetForm() }} disabled={isSubmitting}
            className="h-14 flex-1 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors">
            Batal
          </button>
          <button type="button" onClick={handleSave} disabled={isSubmitting || !customerName.trim() || !date}
            className="h-14 flex-1 rounded-2xl bg-orange-500 text-base font-extrabold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TransactionRow({ t, admin, onEdit, onDelete, onShowDetail, onTogglePaid }: {
  t: Transaction; admin: boolean
  onEdit: () => void; onDelete: () => void; onShowDetail: () => void; onTogglePaid: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const payStatus = t.isPaid ? 'paid' : t.paidAmount > 0 ? 'partial' : 'unpaid'

  const statusConfig = {
    paid: { label: 'Lunas', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    partial: { label: 'Cicilan', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    unpaid: { label: 'Belum Bayar', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }[payStatus]

  return (
    <div className="border-b-2 border-slate-100 dark:border-slate-800 last:border-b-0">
      {/* Main row */}
      <div
        onClick={() => admin ? setExpanded(!expanded) : onShowDetail()}
        className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-orange-50/50 dark:hover:bg-slate-800/50 transition-colors active:bg-orange-100/50 dark:active:bg-slate-700/50"
      >
        {/* Date badge */}
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
          <span className="text-base font-extrabold text-orange-700 dark:text-orange-400 leading-none tabular-nums">
            {formatDateShort(t.date).split('/')[0]}
          </span>
          <span className="text-xs font-bold text-orange-500 dark:text-orange-500 leading-none mt-0.5">
            /{formatDateShort(t.date).split('/')[1]}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight truncate">{t.customerName}</p>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {t.orderItems.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(' · ')}
          </p>
        </div>

        {/* Price + Status */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{formatRupiah(t.price)}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePaid() }}
            className={`rounded-lg px-2.5 py-1 text-sm font-extrabold transition-colors ${statusConfig.cls}`}>
            {statusConfig.label}
          </button>
        </div>

        {admin && <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />}
      </div>

      {/* Admin actions */}
      {admin && expanded && (
        <div className="flex items-center justify-end gap-2 border-t-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
          <button type="button" onClick={onShowDetail}
            className="flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-base font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors">
            <Receipt className="h-4 w-4" />Detail
          </button>
          <button type="button" onClick={onEdit}
            className="flex items-center gap-2 rounded-xl border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 px-4 py-2.5 text-base font-bold text-orange-700 dark:text-orange-400 hover:bg-orange-100 transition-colors">
            <Pencil className="h-4 w-4" />Edit
          </button>
          <button type="button" onClick={onDelete}
            className="flex items-center gap-2 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-base font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
            <Trash2 className="h-4 w-4" />Hapus
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [detailTx, setDetailTx] = useState<Transaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [toggleTx, setToggleTx] = useState<Transaction | null>(null)
  const [toggleOpen, setToggleOpen] = useState(false)

  const availableMonths = getAvailableMonthsForYear(selectedYear)
  if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
    setSelectedMonth(availableMonths[0])
  }

  const filtered = useMemo(() => {
    const key = `${selectedYear}-${selectedMonth}`
    return [...transactions.filter((t) => t.date.startsWith(key))].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortOrder === 'newest' ? -diff : diff
    })
  }, [transactions, selectedYear, selectedMonth, sortOrder])

  const totalBilled = filtered.reduce((s, t) => s + t.price, 0)
  const totalUnpaid = filtered.reduce((s, t) => s + Math.max(0, t.price - t.paidAmount), 0)
  const unpaidCount = filtered.filter((t) => !t.isPaid).length

  async function handleToggleConfirm() {
    if (!toggleTx) return
    const ok = await togglePaidStatus(toggleTx.id)
    if (ok) toast.success(`Status diubah: ${!toggleTx.isPaid ? 'Lunas' : 'Belum Bayar'}`)
    else toast.error('Gagal mengubah status')
    setToggleOpen(false); setToggleTx(null)
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return
    const ok = await deleteTransaction(deleteId)
    if (ok) toast.success('Transaksi berhasil dihapus')
    else toast.error('Gagal menghapus transaksi')
    setDeleteId(null); setDeleteTx(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Date selector */}
      {availableYears.length > 0 && availableMonths.length > 0 && (
        <DateSelector years={availableYears} months={availableMonths}
          selectedYear={selectedYear} selectedMonth={selectedMonth}
          onYearChange={setSelectedYear} onMonthChange={setSelectedMonth} />
      )}

      {/* Summary strip */}
      <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{filtered.length} Transaksi</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 tabular-nums">{formatRupiah(totalBilled)}</p>
            {totalUnpaid > 0 && (
              <p className="text-base font-bold text-red-600 dark:text-red-400 mt-1">
                Belum dibayar: {formatRupiah(totalUnpaid)}
              </p>
            )}
          </div>
          <button type="button"
            onClick={() => setSortOrder((p) => p === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-orange-50 hover:border-orange-300 transition-colors">
            {sortOrder === 'newest' ? <ArrowDown className="h-5 w-5 text-orange-500" /> : <ArrowUp className="h-5 w-5 text-orange-500" />}
            {sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
            <CalendarDays className="h-10 w-10 text-orange-400" />
          </div>
          <p className="text-xl font-extrabold text-slate-700 dark:text-slate-300">Belum ada transaksi</p>
          <p className="text-base text-slate-400 dark:text-slate-500 mt-1">
            {admin ? 'Tekan tombol + untuk menambah' : 'Belum ada data untuk bulan ini'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          {filtered.map((t) => (
            <TransactionRow key={t.id} t={t} admin={admin}
              onEdit={() => { setEditingTx(t); setEditOpen(true) }}
              onDelete={() => { setDeleteId(t.id); setDeleteTx(t) }}
              onShowDetail={() => { setDetailTx(t); setDetailOpen(true) }}
              onTogglePaid={() => { setToggleTx(t); setToggleOpen(true) }} />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TransactionDetailDrawer transaction={detailTx} open={detailOpen} onOpenChange={setDetailOpen} />
      {admin && <EditTransactionDrawer transaction={editingTx} open={editOpen} onOpenChange={setEditOpen} />}

      <ConfirmDialog
        open={!!deleteId}
        icon={<Trash2 className="h-7 w-7 text-red-600 dark:text-red-400" />}
        iconBg="bg-red-100 dark:bg-red-900/30"
        title="Hapus Transaksi?"
        description={deleteTx ? <><strong>{deleteTx.customerName}</strong> — {formatRupiah(deleteTx.price)}<br />Data yang dihapus tidak bisa dikembalikan.</> : 'Data tidak bisa dikembalikan.'}
        confirmLabel="Ya, Hapus"
        confirmClass="bg-red-600 hover:bg-red-700"
        onCancel={() => { setDeleteId(null); setDeleteTx(null) }}
        onConfirm={handleDeleteConfirm} />

      <ConfirmDialog
        open={toggleOpen}
        icon={<AlertCircle className={`h-7 w-7 ${!toggleTx?.isPaid ? 'text-green-600' : 'text-red-600'}`} />}
        iconBg={!toggleTx?.isPaid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}
        title="Ubah Status Bayar?"
        description={toggleTx && <>
          <strong>{toggleTx.customerName}</strong><br />
          Status menjadi: <strong className={!toggleTx.isPaid ? 'text-green-600' : 'text-red-600'}>
            {!toggleTx.isPaid ? 'Lunas' : 'Belum Bayar'}
          </strong>
          {toggleTx.isPaid && toggleTx.paidAmount > 0 && (
            <><br /><span className="text-amber-600">Cicilan {formatRupiah(toggleTx.paidAmount)} akan direset ke 0</span></>
          )}
        </>}
        confirmLabel={!toggleTx?.isPaid ? 'Ya, Tandai Lunas' : 'Ya, Tandai Belum Bayar'}
        confirmClass={!toggleTx?.isPaid ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
        onCancel={() => { setToggleOpen(false); setToggleTx(null) }}
        onConfirm={handleToggleConfirm} />
    </div>
  )
}