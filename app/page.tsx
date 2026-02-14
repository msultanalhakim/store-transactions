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

/* ── Logout Confirmation Dialog ── */
function LogoutDialog({
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Keluar dari Aplikasi?</h3>
            <p className="text-sm text-muted-foreground">
              Anda akan keluar dari akun ini
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
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  const user = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'transactions' | 'summary'>(
    'transactions',
  )
  const [isInitializing, setIsInitializing] = useState(true)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  // Initialize store from localStorage on mount (client-side only)
  useEffect(() => {
    let mounted = true

    async function initialize() {
      try {
        await initializeFromStorage()
      } catch (error) {
        console.error('Initialization error:', error)
      } finally {
        if (mounted) {
          // Add small delay to ensure state is properly set
          setTimeout(() => {
            setIsInitializing(false)
          }, 100)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [])

  function handleLogoutClick() {
    setLogoutDialogOpen(true)
  }

  function handleLogoutConfirm() {
    logout()
    setLogoutDialogOpen(false)
  }

  // Show loading while initializing
  if (isInitializing) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card px-4 pb-3 pt-4 shadow-sm">
        {/* Top bar */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Catatan Transaksi
          </h1>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              {user.role === 'admin' ? (
                <ShieldCheck className="h-4 w-4 text-primary" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-bold capitalize text-foreground">
                {user.username}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:bg-muted"
              aria-label="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <nav
          className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted p-1.5"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'transactions'}
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
              activeTab === 'transactions'
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Transaksi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
              activeTab === 'summary'
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Ringkasan
          </button>
        </nav>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {activeTab === 'transactions' ? (
          <TransactionList />
        ) : (
          <CustomerSummary />
        )}
      </main>

      <TransactionForm />

      {/* Logout Confirmation Dialog */}
      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  )
}

export default function Page() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            'bg-card text-card-foreground border-border shadow-lg text-base',
          duration: 2500,
        }}
      />
      <AppShell />
    </>
  )
}