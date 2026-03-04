'use client'

import { useState, useEffect } from 'react'
import { Plus, Minus, ChefHat, CalendarDays, UserRound, ShoppingCart } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Drawer, DrawerClose, DrawerContent, DrawerFooter,
  DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer'
import { addTransaction, formatRupiah, isAdmin, type OrderItem } from '@/lib/store'
import { getDailyMenu, subscribeDailyMenu, type DailyMenuItem } from '@/app/page'
import { toast } from 'sonner'

// ─── Order Item Row ───────────────────────────────────────────────────────────
function OrderItemRow({ menuItem, qty, onChange }: {
  menuItem: DailyMenuItem; qty: number; onChange: (qty: number) => void
}) {
  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${
      qty > 0
        ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{menuItem.name}</p>
          <p className="text-base font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            {formatRupiah(menuItem.price)} / porsi
          </p>
        </div>
        {qty > 0 && (
          <span className="shrink-0 text-lg font-extrabold text-orange-600 dark:text-orange-400 tabular-nums">
            {formatRupiah(menuItem.price * qty)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          Jumlah porsi:
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, qty - 1))}
            disabled={qty === 0}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
          >
            <Minus className="h-5 w-5" strokeWidth={3} />
          </button>
          <span className="w-8 text-center text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => onChange(qty + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export function TransactionForm() {
  const [formOpen, setFormOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<DailyMenuItem[]>(getDailyMenu())
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [customerName, setCustomerName] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => subscribeDailyMenu(() => setMenuItems(getDailyMenu())), [])

  useEffect(() => {
    setQuantities((prev) => {
      const next: Record<string, number> = {}
      for (const m of menuItems) next[m.id] = prev[m.id] ?? 0
      return next
    })
  }, [menuItems])

  const orderItems: OrderItem[] = menuItems
    .filter((m) => (quantities[m.id] ?? 0) > 0)
    .map((m) => ({ name: m.name, price: m.price, qty: quantities[m.id] }))

  const totalPrice = orderItems.reduce((s, i) => s + i.price * i.qty, 0)
  const hasOrder = orderItems.length > 0

  function resetForm() {
    setCustomerName('')
    setIsPaid(false)
    setDate(new Date().toISOString().split('T')[0])
    setQuantities(menuItems.reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {}))
  }

  async function handleSubmit() {
    if (!date) { toast.error('Pilih tanggal terlebih dahulu'); return }
    if (!customerName.trim()) { toast.error('Nama pemesan harus diisi'); return }
    if (!hasOrder) { toast.error('Pilih minimal satu menu'); return }

    setIsSubmitting(true)
    try {
      const result = await addTransaction({
        date,
        customerName: customerName.trim(),
        orderItems,
        isPaid,
      })
      if (result) {
        toast.success('Pesanan berhasil disimpan!')
        resetForm()
        setFormOpen(false)
      } else {
        toast.error('Gagal menyimpan pesanan')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAdmin()) return null

  return (
    <>
      {/* ── FAB ── */}
      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="fixed bottom-7 right-5 z-40 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 text-white shadow-2xl hover:bg-orange-600 active:scale-95 transition-all"
        aria-label="Catat Pesanan Baru"
      >
        <Plus className="h-9 w-9" strokeWidth={3} />
      </button>

      {/* ── Order Form Drawer ── */}
      <Drawer open={formOpen} onOpenChange={(v) => { if (!v) resetForm(); setFormOpen(v) }}>
        <DrawerContent className="max-h-[96vh]">
          <DrawerHeader className="text-left pb-0">
            <DrawerTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
              Catat Pesanan Baru
            </DrawerTitle>
            <DrawerDescription className="text-base text-slate-500 dark:text-slate-400">
              Isi detail pesanan customer
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-5 px-4 pb-2 pt-4 max-h-[65vh] overflow-y-auto">

            {/* Tanggal */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-200">
                <CalendarDays className="h-5 w-5 text-orange-500" />
                Tanggal
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-lg font-semibold text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Nama Pemesan */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-200">
                <UserRound className="h-5 w-5 text-orange-500" />
                Nama Pemesan
              </label>
              <input
                type="text"
                placeholder="Contoh: Bu Siti, Pak Budi..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={isSubmitting}
                className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Pilih Menu */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-200">
                <ChefHat className="h-5 w-5 text-orange-500" />
                Pilih Menu
              </label>

              {menuItems.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-orange-300 dark:border-orange-700 py-10 bg-orange-50 dark:bg-orange-900/10">
                  <ChefHat className="h-12 w-12 text-orange-300" />
                  <div className="text-center px-4">
                    <p className="text-lg font-extrabold text-orange-600 dark:text-orange-400">
                      Belum ada menu hari ini
                    </p>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
                      Tutup form ini, lalu buka tab <strong>Menu</strong> untuk menambahkan menu terlebih dahulu.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {menuItems.map((item) => (
                    <OrderItemRow
                      key={item.id}
                      menuItem={item}
                      qty={quantities[item.id] ?? 0}
                      onChange={(qty) => setQuantities((prev) => ({ ...prev, [item.id]: qty }))}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            {hasOrder && (
              <div className="rounded-2xl border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-bold text-slate-700 dark:text-slate-300">Total Pesanan</span>
                  <span className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 tabular-nums">
                    {formatRupiah(totalPrice)}
                  </span>
                </div>
                <div className="space-y-2 border-t border-orange-200 dark:border-orange-800 pt-3">
                  {orderItems.map((item) => (
                    <div key={item.name} className="flex justify-between text-base">
                      <span className="text-slate-600 dark:text-slate-400">
                        {item.name} × {item.qty}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatRupiah(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Bayar */}
            <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4">
              <div>
                <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">Sudah Bayar?</p>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {isPaid ? '✅ Lunas sekarang' : '🕐 Bayar nanti (hutang)'}
                </p>
              </div>
              <Switch
                id="paid"
                checked={isPaid}
                onCheckedChange={setIsPaid}
                disabled={isSubmitting}
                className="scale-125"
              />
            </div>
          </div>

          <DrawerFooter className="pt-4 gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!date || !customerName.trim() || !hasOrder || isSubmitting}
              className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 text-xl font-extrabold text-white shadow-lg hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Menyimpan...' : (
                <>
                  <ShoppingCart className="h-6 w-6" />
                  Simpan — {formatRupiah(totalPrice)}
                </>
              )}
            </button>
            <DrawerClose asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="h-14 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}