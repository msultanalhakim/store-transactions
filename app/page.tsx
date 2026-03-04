'use client'

import { useState, useEffect } from 'react'
import {
  ClipboardList, BarChart3, LogOut, ShieldCheck, User,
  AlertTriangle, ChefHat, Plus, Trash2, PlusCircle,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { TransactionForm } from '@/components/transaction-form'
import { TransactionList } from '@/components/transaction-list'
import { CustomerSummary } from '@/components/customer-summary'
import { LoginScreen } from '@/components/login-screen'
import { useCurrentUser } from '@/hooks/use-store'
import { logout, initializeFromStorage, formatRupiah } from '@/lib/store'
import { supabase } from '@/lib/supabase'

// ─── Global Daily Menu State (shared across components) ──────────────────────
export interface DailyMenuItem { id: string; name: string; price: number }
let _dailyMenuItems: DailyMenuItem[] = []
let _menuListeners: Array<() => void> = []

export function subscribeDailyMenu(cb: () => void) {
  _menuListeners.push(cb)
  return () => { _menuListeners = _menuListeners.filter((l) => l !== cb) }
}
function notifyDailyMenu() { _menuListeners.forEach((l) => l()) }
export function getDailyMenu(): DailyMenuItem[] { return _dailyMenuItems }

export async function loadDailyMenu(): Promise<void> {
  const { data, error } = await supabase
    .from('daily_menu')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error('Error loading menu:', error); return }
  _dailyMenuItems = (data ?? []).map((row) => ({ id: row.id, name: row.name, price: row.price }))
  notifyDailyMenu()
}

export async function addDailyMenuItem(name: string, price: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('daily_menu')
    .insert({ name: name.trim(), price })
    .select()
    .single()
  if (error || !data) { console.error('Error adding menu item:', error); return false }
  _dailyMenuItems = [..._dailyMenuItems, { id: data.id, name: data.name, price: data.price }]
  notifyDailyMenu()
  return true
}

export async function updateDailyMenuItem(id: string, name: string, price: number): Promise<boolean> {
  const { error } = await supabase
    .from('daily_menu')
    .update({ name: name.trim(), price })
    .eq('id', id)
  if (error) { console.error('Error updating menu item:', error); return false }
  _dailyMenuItems = _dailyMenuItems.map((m) => m.id === id ? { ...m, name: name.trim(), price } : m)
  notifyDailyMenu()
  return true
}

export async function removeDailyMenuItem(id: string): Promise<boolean> {
  const { error } = await supabase.from('daily_menu').delete().eq('id', id)
  if (error) { console.error('Error removing menu item:', error); return false }
  _dailyMenuItems = _dailyMenuItems.filter((m) => m.id !== id)
  notifyDailyMenu()
  return true
}

export async function resetDailyMenu(): Promise<void> {
  const { error } = await supabase.from('daily_menu').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) { console.error('Error resetting menu:', error); return }
  _dailyMenuItems = []
  notifyDailyMenu()
}

// ─── Auto-reset menu at 03:00 every day ──────────────────────────────────────
function msUntil3AM(): number {
  const now = new Date()
  const next3AM = new Date(now)
  next3AM.setHours(3, 0, 0, 0)
  if (next3AM <= now) next3AM.setDate(next3AM.getDate() + 1)
  return next3AM.getTime() - now.getTime()
}
export function scheduleDailyMenuReset() {
  const timeout = setTimeout(() => {
    resetDailyMenu()
    scheduleDailyMenuReset()
  }, msUntil3AM())
  return () => clearTimeout(timeout)
}

// ─── Logout Dialog ────────────────────────────────────────────────────────────
function LogoutDialog({ open, onOpenChange, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
      onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-7 shadow-2xl border-2 border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Keluar dari Aplikasi?</h3>
            <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Anda akan keluar dari akun ini.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => onOpenChange(false)}
            className="h-14 flex-1 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors">
            Batal
          </button>
          <button type="button" onClick={onConfirm}
            className="h-14 flex-1 rounded-xl bg-red-600 text-base font-bold text-white hover:bg-red-700 transition-colors">
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Menu Page ────────────────────────────────────────────────────────────────
function MenuPage() {
  const [menuItems, setMenuItems] = useState<DailyMenuItem[]>(getDailyMenu())
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')

  useEffect(() => subscribeDailyMenu(() => setMenuItems(getDailyMenu())), [])

  async function handleAdd() {
    const trimmed = name.trim()
    const num = parseFloat(price)
    if (!trimmed) { toast.error('Nama menu tidak boleh kosong'); return }
    if (isNaN(num) || num <= 0) { toast.error('Harga harus lebih dari 0'); return }
    if (getDailyMenu().some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Menu "${trimmed}" sudah ada`); return
    }
    const ok = await addDailyMenuItem(trimmed, num)
    if (ok) {
      setName(''); setPrice('')
      toast.success(`Menu "${trimmed}" berhasil ditambahkan`)
    } else {
      toast.error('Gagal menambahkan menu')
    }
  }

  function handleStartEdit(item: DailyMenuItem) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditPrice(item.price.toString())
  }

  async function handleSaveEdit() {
    if (!editingId) return
    const trimmed = editName.trim()
    const num = parseFloat(editPrice)
    if (!trimmed) { toast.error('Nama menu tidak boleh kosong'); return }
    if (isNaN(num) || num <= 0) { toast.error('Harga harus lebih dari 0'); return }
    if (getDailyMenu().some((m) => m.id !== editingId && m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Menu "${trimmed}" sudah ada`); return
    }
    const ok = await updateDailyMenuItem(editingId, trimmed, num)
    if (ok) {
      setEditingId(null)
      toast.success('Menu berhasil diubah')
    } else {
      toast.error('Gagal mengubah menu')
    }
  }

  async function handleDelete(item: DailyMenuItem) {
    const ok = await removeDailyMenuItem(item.id)
    if (ok) toast.success(`Menu "${item.name}" dihapus`)
    else toast.error('Gagal menghapus menu')
  }

  async function handleResetAll() {
    if (menuItems.length === 0) return
    await resetDailyMenu()
    toast.success('Semua menu berhasil direset')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Info banner */}
      <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <ChefHat className="h-6 w-6 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-extrabold text-orange-700 dark:text-orange-400">Menu Hari Ini</p>
            <p className="text-sm font-semibold text-orange-600/80 dark:text-orange-400/80 mt-1">
              Menu ini berlaku untuk satu sesi. Akan hilang jika aplikasi ditutup atau di-refresh.
              Biasanya diisi setiap pagi sebelum mulai mencatat pesanan.
            </p>
          </div>
        </div>
      </div>

      {/* Add menu form */}
      <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-orange-500" />
          Tambah Menu Baru
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Menu
            </label>
            <input
              type="text"
              placeholder="Contoh: Nasi Goreng, Ayam Bakar, Es Teh..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900"
            />
          </div>
          <div>
            <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Harga (Rupiah)
            </label>
            <input
              type="number"
              placeholder="Contoh: 15000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900"
              inputMode="numeric"
              min="0"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || !price || parseFloat(price) <= 0}
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-orange-500 text-lg font-extrabold text-white hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
            Tambahkan Menu
          </button>
        </div>
      </div>

      {/* Menu list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Daftar Menu ({menuItems.length})
          </h2>
          {menuItems.length > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1.5 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Hapus Semua
            </button>
          )}
        </div>

        {menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <ChefHat className="h-10 w-10 text-orange-300" />
            </div>
            <p className="text-xl font-extrabold text-slate-600 dark:text-slate-400">Belum ada menu</p>
            <p className="text-base text-slate-400 dark:text-slate-500 mt-1 text-center px-6">
              Tambahkan menu di atas sebelum mulai mencatat pesanan
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {menuItems.map((item, index) => (
              <div key={item.id}
                className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                {editingId === item.id ? (
                  /* Edit mode */
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                      Edit Menu #{index + 1}
                    </p>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-12 w-full rounded-xl border-2 border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      autoFocus
                    />
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="h-12 w-full rounded-xl border-2 border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      inputMode="numeric"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingId(null)}
                        className="h-12 flex-1 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                        Batal
                      </button>
                      <button type="button" onClick={handleSaveEdit}
                        className="h-12 flex-1 rounded-xl bg-orange-500 text-base font-extrabold text-white hover:bg-orange-600 transition-colors">
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                      <span className="text-lg font-extrabold text-orange-600 dark:text-orange-400">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                        {item.name}
                      </p>
                      <p className="text-base font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                        {formatRupiah(item.price)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => handleStartEdit(item)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => handleDelete(item)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage tip */}
      {menuItems.length > 0 && (
        <div className="rounded-2xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 px-5 py-4">
          <p className="text-base font-bold text-green-700 dark:text-green-400">
            ✅ {menuItems.length} menu siap digunakan
          </p>
          <p className="text-sm font-semibold text-green-600/80 dark:text-green-400/80 mt-1">
            Pergi ke tab Transaksi lalu tekan tombol + untuk mulai mencatat pesanan.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────
type Tab = 'transactions' | 'summary' | 'menu'

function AppShell() {
  const user = useCurrentUser()
  const [activeTab, setActiveTab] = useState<Tab>('transactions')
  const [isInitializing, setIsInitializing] = useState(true)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    let mounted = true
    async function initialize() {
      try { await initializeFromStorage() }
      catch (err) { console.error('Init error:', err) }
      finally { if (mounted) setTimeout(() => setIsInitializing(false), 100) }
    }
    initialize()
    loadDailyMenu()
    const cancelReset = scheduleDailyMenuReset()
    return () => { mounted = false; cancelReset() }
  }, [])

  if (isInitializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-orange-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">Memuat data...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  // Tabs config — menu only for admin
  const tabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'transactions', label: 'Transaksi', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'summary', label: 'Ringkasan', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'menu', label: 'Menu', icon: <ChefHat className="h-5 w-5" />, adminOnly: true },
  ]
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="min-h-dvh bg-orange-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">

        {/* ── Header ── */}
        <header className="sticky top-0 z-30 border-b-2 border-orange-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
          <div className="px-4 sm:px-6">
            {/* Top bar */}
            <div className="flex items-center justify-between py-3 gap-3">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 shadow-sm">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight hidden sm:block">
                  Catatan Transaksi
                </h1>
              </div>

              {/* Desktop tabs */}
              <nav className="hidden sm:flex gap-1.5 rounded-2xl bg-orange-100 dark:bg-slate-800 p-1.5">
                {visibleTabs.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-orange-500 text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-orange-200 dark:hover:bg-slate-700'
                    }`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </nav>

              {/* User + logout */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                  isAdmin ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {isAdmin
                    ? <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    : <User className="h-5 w-5 text-slate-500" />}
                  <span className={`text-base font-bold capitalize hidden xs:inline ${
                    isAdmin ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'
                  }`}>{user.username}</span>
                </div>
                <button type="button" onClick={() => setLogoutDialogOpen(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                  aria-label="Keluar">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mobile tabs */}
            <div className={`sm:hidden grid gap-2 pb-3 ${visibleTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {visibleTabs.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-orange-500 text-white shadow'
                      : 'bg-orange-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="px-4 pb-36 pt-5 sm:px-6">
          <div className="mx-auto max-w-2xl">
            {activeTab === 'transactions' && <TransactionList />}
            {activeTab === 'summary' && <CustomerSummary />}
            {activeTab === 'menu' && isAdmin && <MenuPage />}
          </div>
        </main>
      </div>

      {/* FAB only shows on transactions tab */}
      {activeTab === 'transactions' && <TransactionForm />}

      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={() => { logout(); setLogoutDialogOpen(false) }}
      />
    </div>
  )
}

export default function Page() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{
        className: '!bg-white dark:!bg-slate-800 !text-slate-900 dark:!text-white !border-2 !border-slate-200 dark:!border-slate-600 !shadow-2xl !text-lg !font-bold !py-4 !px-6 !rounded-2xl',
        duration: 3000,
      }} />
      <AppShell />
    </>
  )
}