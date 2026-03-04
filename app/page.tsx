'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, BarChart3, LogOut, ShieldCheck, User, AlertTriangle } from 'lucide-react'
import { Toaster } from 'sonner'
import { TransactionForm } from '@/components/transaction-form'
import { TransactionList } from '@/components/transaction-list'
import { CustomerSummary } from '@/components/customer-summary'
import { LoginScreen } from '@/components/login-screen'
import { useCurrentUser } from '@/hooks/use-store'
import { logout, initializeFromStorage } from '@/lib/store'

function LogoutDialog({ open, onOpenChange, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
      onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-7 shadow-2xl border-2 border-orange-100 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">Keluar dari Aplikasi?</h3>
            <p className="text-base text-slate-600 dark:text-slate-400 mt-1">Anda akan keluar dari akun ini.</p>
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

function AppShell() {
  const user = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'transactions' | 'summary'>('transactions')
  const [isInitializing, setIsInitializing] = useState(true)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function initialize() {
      try { await initializeFromStorage() }
      catch (err) { console.error('Init error:', err) }
      finally { if (mounted) setTimeout(() => setIsInitializing(false), 100) }
    }
    initialize()
    return () => { mounted = false }
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

  return (
    <div className="min-h-dvh bg-orange-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="sticky top-0 z-30 border-b-2 border-orange-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
          <div className="px-4 sm:px-6">
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
              <nav className="hidden sm:flex gap-2 rounded-2xl bg-orange-100 dark:bg-slate-800 p-1.5">
                <button type="button" onClick={() => setActiveTab('transactions')}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-bold transition-all ${
                    activeTab === 'transactions'
                      ? 'bg-orange-500 text-white shadow'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-orange-200 dark:hover:bg-slate-700'
                  }`}>
                  <ClipboardList className="h-5 w-5" />Transaksi
                </button>
                <button type="button" onClick={() => setActiveTab('summary')}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-bold transition-all ${
                    activeTab === 'summary'
                      ? 'bg-orange-500 text-white shadow'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-orange-200 dark:hover:bg-slate-700'
                  }`}>
                  <BarChart3 className="h-5 w-5" />Ringkasan
                </button>
              </nav>

              {/* User + logout */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                  user.role === 'admin'
                    ? 'bg-orange-100 dark:bg-orange-900/30'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {user.role === 'admin'
                    ? <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    : <User className="h-5 w-5 text-slate-500" />}
                  <span className={`text-base font-bold capitalize ${
                    user.role === 'admin'
                      ? 'text-orange-700 dark:text-orange-300'
                      : 'text-slate-700 dark:text-slate-300'
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
            <div className="sm:hidden grid grid-cols-2 gap-2 pb-3">
              <button type="button" onClick={() => setActiveTab('transactions')}
                className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all ${
                  activeTab === 'transactions'
                    ? 'bg-orange-500 text-white shadow'
                    : 'bg-orange-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                <ClipboardList className="h-5 w-5" />Transaksi
              </button>
              <button type="button" onClick={() => setActiveTab('summary')}
                className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all ${
                  activeTab === 'summary'
                    ? 'bg-orange-500 text-white shadow'
                    : 'bg-orange-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                <BarChart3 className="h-5 w-5" />Ringkasan
              </button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="px-4 pb-36 pt-5 sm:px-6">
          <div className="mx-auto max-w-2xl">
            {activeTab === 'transactions' ? <TransactionList /> : <CustomerSummary />}
          </div>
        </main>
      </div>

      <TransactionForm />
      <LogoutDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}
        onConfirm={() => { logout(); setLogoutDialogOpen(false) }} />
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