'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, BarChart3, LogOut, ShieldCheck, User } from 'lucide-react'
import { Toaster } from 'sonner'
import { TransactionForm } from '@/components/transaction-form'
import { TransactionList } from '@/components/transaction-list'
import { CustomerSummary } from '@/components/customer-summary'
import { LoginScreen } from '@/components/login-screen'
import { useCurrentUser } from '@/hooks/use-store'
import { logout, initializeFromStorage } from '@/lib/store'

function AppShell() {
  const user = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'transactions' | 'summary'>(
    'transactions',
  )
  const [isInitializing, setIsInitializing] = useState(true)

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
              onClick={logout}
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