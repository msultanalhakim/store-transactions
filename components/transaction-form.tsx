'use client'

import { useState, useEffect } from 'react'
import { Plus, Minus, ChefHat, CalendarDays, UserRound, ShoppingCart, PenLine, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Drawer, DrawerClose, DrawerContent, DrawerFooter,
  DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer'
import { addTransaction, formatRupiah, isAdmin, type OrderItem } from '@/lib/store'
import { getDailyMenu, subscribeDailyMenu, type DailyMenuItem } from '@/app/page'
import { toast } from 'sonner'

// ─── Order Item Row (mode otomatis) ──────────────────────────────────────────
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
          <button type="button" onClick={() => onChange(Math.max(0, qty - 1))} disabled={qty === 0}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-red-400 hover:text-red-600 disabled:opacity-30 transition-colors">
            <Minus className="h-5 w-5" strokeWidth={3} />
          </button>
          <span className="w-8 text-center text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{qty}</span>
          <button type="button" onClick={() => onChange(qty + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors">
            <Plus className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Manual Item Card ─────────────────────────────────────────────────────────
function ManualItemCard({ item, onRemove }: { item: OrderItem; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">{item.name}</p>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          {item.qty} × {formatRupiah(item.price)}{' '}
          <span className="text-orange-600 dark:text-orange-400 font-extrabold">= {formatRupiah(item.price * item.qty)}</span>
        </p>
      </div>
      <button type="button" onClick={onRemove}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
type InputMode = 'auto' | 'manual'

export function TransactionForm() {
  const [formOpen, setFormOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<DailyMenuItem[]>(getDailyMenu())
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [customerName, setCustomerName] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('auto')

  // Mode manual state
  const [manualItems, setManualItems] = useState<OrderItem[]>([])
  const [manualName, setManualName] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualQty, setManualQty] = useState(1)

  useEffect(() => subscribeDailyMenu(() => setMenuItems(getDailyMenu())), [])

  useEffect(() => {
    setQuantities((prev) => {
      const next: Record<string, number> = {}
      for (const m of menuItems) next[m.id] = prev[m.id] ?? 0
      return next
    })
  }, [menuItems])

  const autoOrderItems: OrderItem[] = menuItems
    .filter((m) => (quantities[m.id] ?? 0) > 0)
    .map((m) => ({ name: m.name, price: m.price, qty: quantities[m.id] }))

  const orderItems = inputMode === 'auto' ? autoOrderItems : manualItems
  const totalPrice = orderItems.reduce((s, i) => s + i.price * i.qty, 0)
  const hasOrder = orderItems.length > 0

  function handleAddManualItem() {
    const trimmed = manualName.trim()
    const price = parseFloat(manualPrice)
    if (!trimmed) { toast.error('Nama item tidak boleh kosong'); return }
    if (isNaN(price) || price <= 0) { toast.error('Harga harus lebih dari 0'); return }
    if (manualQty <= 0) { toast.error('Jumlah harus lebih dari 0'); return }
    setManualItems((prev) => [...prev, { name: trimmed, price, qty: manualQty }])
    setManualName('')
    setManualPrice('')
    setManualQty(1)
  }

  function resetForm() {
    setCustomerName('')
    setIsPaid(false)
    setDate(new Date().toISOString().split('T')[0])
    setQuantities(menuItems.reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {}))
    setManualItems([])
    setManualName('')
    setManualPrice('')
    setManualQty(1)
    setInputMode('auto')
  }

  async function handleSubmit() {
    if (!date) { toast.error('Pilih tanggal terlebih dahulu'); return }
    if (!customerName.trim()) { toast.error('Nama pemesan harus diisi'); return }
    if (!hasOrder) { toast.error('Pilih minimal satu item'); return }

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
      <button type="button" onClick={(e) => { e.currentTarget.blur(); setFormOpen(true) }}
        className="fixed bottom-7 right-5 z-40 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 text-white shadow-2xl hover:bg-orange-600 active:scale-95 transition-all"
        aria-label="Catat Pesanan Baru">
        <Plus className="h-9 w-9" strokeWidth={3} />
      </button>

      {/* ── Drawer ── */}
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
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-lg font-semibold text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none disabled:opacity-50" />
            </div>

            {/* Nama Pemesan */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-200">
                <UserRound className="h-5 w-5 text-orange-500" />
                Nama Pemesan
              </label>
              <input type="text" placeholder="Contoh: Bu Siti, Pak Budi..."
                value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                disabled={isSubmitting}
                className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none disabled:opacity-50" />
            </div>

            {/* ── Mode Toggle ── */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-200">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                Input Pesanan
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Otomatis */}
                <button type="button" onClick={() => setInputMode('auto')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-3 transition-all ${
                    inputMode === 'auto'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-200 dark:ring-orange-800'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-300'
                  }`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    inputMode === 'auto' ? 'bg-orange-500' : 'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    <ChefHat className={`h-6 w-6 ${inputMode === 'auto' ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-base font-extrabold ${inputMode === 'auto' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    Otomatis
                  </span>
                  <span className={`text-xs font-semibold text-center leading-tight ${inputMode === 'auto' ? 'text-orange-500/80' : 'text-slate-400'}`}>
                    Dari menu hari ini
                  </span>
                </button>

                {/* Manual */}
                <button type="button" onClick={() => setInputMode('manual')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-3 transition-all ${
                    inputMode === 'manual'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'
                  }`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    inputMode === 'manual' ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    <PenLine className={`h-6 w-6 ${inputMode === 'manual' ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-base font-extrabold ${inputMode === 'manual' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    Manual
                  </span>
                  <span className={`text-xs font-semibold text-center leading-tight ${inputMode === 'manual' ? 'text-blue-500/80' : 'text-slate-400'}`}>
                    Input item sendiri
                  </span>
                </button>
              </div>

              {/* ── Konten Mode Otomatis ── */}
              {inputMode === 'auto' && (
                menuItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-orange-300 dark:border-orange-700 py-10 bg-orange-50 dark:bg-orange-900/10">
                    <ChefHat className="h-12 w-12 text-orange-300" />
                    <div className="text-center px-4">
                      <p className="text-lg font-extrabold text-orange-600 dark:text-orange-400">Belum ada menu hari ini</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Buka tab <strong>Menu</strong> untuk menambahkan, atau gunakan mode <strong>Manual</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {menuItems.map((item) => (
                      <OrderItemRow key={item.id} menuItem={item}
                        qty={quantities[item.id] ?? 0}
                        onChange={(qty) => setQuantities((prev) => ({ ...prev, [item.id]: qty }))} />
                    ))}
                  </div>
                )
              )}

              {/* ── Konten Mode Manual ── */}
              {inputMode === 'manual' && (
                <div className="flex flex-col gap-4">
                  {/* Input fields */}
                  <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-4 flex flex-col gap-3">
                    <input type="text" placeholder="Nama item  (contoh: Spaghetti)"
                      value={manualName} onChange={(e) => setManualName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()}
                      disabled={isSubmitting}
                      className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none disabled:opacity-50" />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Harga (Rp)</p>
                        <input type="number" placeholder="15000"
                          value={manualPrice} onChange={(e) => setManualPrice(e.target.value)}
                          disabled={isSubmitting} inputMode="numeric" min="0"
                          className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none disabled:opacity-50" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Jumlah</p>
                        <div className="flex items-center justify-between h-14 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3">
                          <button type="button" onClick={() => setManualQty((q) => Math.max(1, q - 1))}
                            disabled={manualQty <= 1 || isSubmitting}
                            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-red-400 hover:text-red-600 disabled:opacity-30 transition-colors">
                            <Minus className="h-4 w-4" strokeWidth={3} />
                          </button>
                          <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{manualQty}</span>
                          <button type="button" onClick={() => setManualQty((q) => q + 1)} disabled={isSubmitting}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                            <Plus className="h-4 w-4" strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button type="button" onClick={handleAddManualItem}
                      disabled={!manualName.trim() || !manualPrice || parseFloat(manualPrice) <= 0 || isSubmitting}
                      className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-extrabold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      <Plus className="h-5 w-5" strokeWidth={3} />
                      Tambah Item
                    </button>
                  </div>

                  {/* Daftar item yang sudah ditambah */}
                  {manualItems.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Item ditambahkan ({manualItems.length}):
                      </p>
                      {manualItems.map((item, i) => (
                        <ManualItemCard key={i} item={item}
                          onRemove={() => setManualItems((prev) => prev.filter((_, idx) => idx !== i))} />
                      ))}
                    </div>
                  )}

                  {manualItems.length === 0 && (
                    <p className="text-center text-sm font-semibold text-slate-400 dark:text-slate-500 py-2">
                      Belum ada item. Isi form di atas lalu tekan Tambah Item.
                    </p>
                  )}
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
                  {orderItems.map((item, i) => (
                    <div key={`${item.name}-${i}`} className="flex justify-between text-base">
                      <span className="text-slate-600 dark:text-slate-400">{item.name} × {item.qty}</span>
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
              <Switch id="paid" checked={isPaid} onCheckedChange={setIsPaid}
                disabled={isSubmitting} className="scale-125" />
            </div>
          </div>

          <DrawerFooter className="pt-4 gap-3">
            <button type="button" onClick={handleSubmit}
              disabled={!date || !customerName.trim() || !hasOrder || isSubmitting}
              className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 text-xl font-extrabold text-white shadow-lg hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {isSubmitting ? 'Menyimpan...' : (
                <><ShoppingCart className="h-6 w-6" />Simpan — {formatRupiah(totalPrice)}</>
              )}
            </button>
            <DrawerClose asChild>
              <button type="button" disabled={isSubmitting}
                className="h-14 w-full rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Batal
              </button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}