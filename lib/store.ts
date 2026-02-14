import { supabase } from './supabase'

export interface Transaction {
  id: string
  date: string
  customerName: string
  orderName: string
  price: number
  isPaid: boolean
  paidAmount?: number // Track installment payments
}

export interface CustomerSummary {
  customerName: string
  totalOrders: number
  totalAmount: number
  unpaidAmount: number
  unpaidOrders: Transaction[]
}

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  username: string
  role: UserRole
}

let currentUser: AuthUser | null = null
let transactions: Transaction[] = []
let listeners: Array<() => void> = []
let isInitialized = false

// Initialize from localStorage (call this in component useEffect)
export async function initializeFromStorage(): Promise<void> {
  if (typeof window !== 'undefined' && !isInitialized) {
    try {
      const savedUser = localStorage.getItem('catatan-transaksi-user')
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser) as AuthUser
        
        // Validate user object structure
        if (parsedUser && 
            typeof parsedUser.username === 'string' && 
            (parsedUser.role === 'admin' || parsedUser.role === 'user')) {
          
          currentUser = parsedUser
          
          // Auto-load transactions if user exists - wait for it to complete
          try {
            await loadTransactions()
          } catch (err) {
            console.error('Failed to load transactions on init:', err)
          }
        } else {
          // Invalid user data, clear it
          console.warn('Invalid user data in localStorage, clearing...')
          localStorage.removeItem('catatan-transaksi-user')
        }
      }
      
      isInitialized = true
      notifyListeners()
    } catch (err) {
      console.error('Error loading from localStorage:', err)
      // Clear potentially corrupted data
      localStorage.removeItem('catatan-transaksi-user')
      isInitialized = true
      notifyListeners()
    }
  }
}

function notifyListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

// Persist user to localStorage with validation
function persistUser(user: AuthUser | null) {
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        // Validate before saving
        if (typeof user.username === 'string' && 
            (user.role === 'admin' || user.role === 'user')) {
          localStorage.setItem('catatan-transaksi-user', JSON.stringify(user))
        } else {
          console.error('Invalid user object, not persisting')
        }
      } else {
        localStorage.removeItem('catatan-transaksi-user')
      }
    } catch (err) {
      console.error('Error persisting user to localStorage:', err)
    }
  }
}

// Simple hash function for password comparison (client-side compatible)
// For production, use Supabase Auth or proper backend authentication
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Utility function to generate hash for storing in database
// Usage: console.log(await generatePasswordHash('your_password'))
// Copy the result and store it in Supabase users table
export async function generatePasswordHash(password: string): Promise<string> {
  return await hashPassword(password)
}

// Check if user session is valid
export function hasValidSession(): boolean {
  return currentUser !== null
}

// Auth functions with better error handling
export async function login(username: string, password: string): Promise<AuthUser | null> {
  try {
    // Validate input
    if (!username.trim() || !password.trim()) {
      console.error('Username and password are required')
      return null
    }

    // Query user from Supabase
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.error('User not found')
      } else {
        console.error('Login error:', error)
      }
      return null
    }

    if (!data) {
      console.error('User not found')
      return null
    }

    // Hash password and compare
    const hashedPassword = await hashPassword(password)
    
    if (data.password_hash !== hashedPassword) {
      console.error('Invalid password')
      return null
    }

    // Login successful - create session
    const user: AuthUser = { 
      username: data.username, 
      role: data.role as UserRole 
    }
    
    currentUser = user
    persistUser(user)
    
    // Load user's transactions
    await loadTransactions()
    
    notifyListeners()
    return user
  } catch (err) {
    console.error('Login exception:', err)
    return null
  }
}

export function logout(): void {
  // Clear current user
  currentUser = null
  
  // Clear transactions
  transactions = []
  
  // Clear from localStorage
  persistUser(null)
  
  // Reset initialization flag
  isInitialized = false
  
  // Notify all listeners
  notifyListeners()
}

export function getCurrentUser(): AuthUser | null {
  return currentUser
}

export function isAdmin(): boolean {
  return currentUser?.role === 'admin'
}

// Load all transactions from Supabase
export async function loadTransactions(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading transactions:', error)
      return
    }

    if (data) {
      transactions = data.map(row => ({
        id: row.id,
        date: row.date,
        customerName: row.customer_name,
        orderName: row.order_name,
        price: row.price,
        isPaid: row.is_paid,
        paidAmount: row.paid_amount || 0
      }))
      notifyListeners()
    }
  } catch (err) {
    console.error('Load transactions exception:', err)
  }
}

export function getTransactions(): Transaction[] {
  return transactions
}

export async function addTransaction(data: Omit<Transaction, 'id'>): Promise<Transaction | null> {
  try {
    const { data: newRow, error } = await supabase
      .from('transactions')
      .insert({
        date: data.date,
        customer_name: data.customerName,
        order_name: data.orderName,
        price: data.price,
        is_paid: data.isPaid
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding transaction:', error)
      return null
    }

    if (newRow) {
      const newTransaction: Transaction = {
        id: newRow.id,
        date: newRow.date,
        customerName: newRow.customer_name,
        orderName: newRow.order_name,
        price: newRow.price,
        isPaid: newRow.is_paid
      }
      transactions = [newTransaction, ...transactions]
      notifyListeners()
      return newTransaction
    }
    
    return null
  } catch (err) {
    console.error('Add transaction exception:', err)
    return null
  }
}

export async function editTransaction(id: string, data: Partial<Omit<Transaction, 'id'>>): Promise<void> {
  try {
    const updateData: any = {}
    if (data.date !== undefined) updateData.date = data.date
    if (data.customerName !== undefined) updateData.customer_name = data.customerName
    if (data.orderName !== undefined) updateData.order_name = data.orderName
    if (data.price !== undefined) updateData.price = data.price
    if (data.isPaid !== undefined) updateData.is_paid = data.isPaid

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error editing transaction:', error)
      return
    }

    transactions = transactions.map((t) =>
      t.id === id ? { ...t, ...data } : t
    )
    notifyListeners()
  } catch (err) {
    console.error('Edit transaction exception:', err)
  }
}

export async function togglePaidStatus(id: string): Promise<void> {
  const transaction = transactions.find(t => t.id === id)
  if (!transaction) return

  const newStatus = !transaction.isPaid

  try {
    const { error } = await supabase
      .from('transactions')
      .update({ is_paid: newStatus })
      .eq('id', id)

    if (error) {
      console.error('Error toggling paid status:', error)
      return
    }

    transactions = transactions.map((t) =>
      t.id === id ? { ...t, isPaid: newStatus, paidAmount: newStatus ? t.price : 0 } : t
    )
    notifyListeners()
  } catch (err) {
    console.error('Toggle paid status exception:', err)
  }
}

// Make installment payment for a customer's unpaid orders
export async function makePayment(customerName: string, amount: number): Promise<boolean> {
  try {
    // Get all unpaid transactions for this customer
    const unpaidTransactions = transactions.filter(
      t => t.customerName === customerName && !t.isPaid
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // oldest first

    let remainingPayment = amount

    for (const transaction of unpaidTransactions) {
      if (remainingPayment <= 0) break

      const currentPaid = transaction.paidAmount || 0
      const remaining = transaction.price - currentPaid
      
      if (remaining <= 0) continue // already fully paid

      const paymentForThis = Math.min(remaining, remainingPayment)
      const newPaidAmount = currentPaid + paymentForThis
      const isFullyPaid = newPaidAmount >= transaction.price

      // Update in Supabase
      const { error } = await supabase
        .from('transactions')
        .update({ 
          is_paid: isFullyPaid,
          paid_amount: newPaidAmount
        })
        .eq('id', transaction.id)

      if (error) {
        console.error('Error updating payment:', error)
        return false
      }

      // Update local state
      transactions = transactions.map((t) =>
        t.id === transaction.id 
          ? { ...t, isPaid: isFullyPaid, paidAmount: newPaidAmount } 
          : t
      )

      remainingPayment -= paymentForThis
    }

    notifyListeners()
    return true
  } catch (err) {
    console.error('Make payment exception:', err)
    return false
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting transaction:', error)
      return
    }

    transactions = transactions.filter((t) => t.id !== id)
    notifyListeners()
  } catch (err) {
    console.error('Delete transaction exception:', err)
  }
}

// Get customer summaries for a specific month or all-time
// month format: "2026-02" for filtering by transaction date
export function getCustomerSummaries(month?: string): CustomerSummary[] {
  // Filter transactions by month if specified
  const filtered = month
    ? transactions.filter((t) => t.date.startsWith(month))
    : transactions

  const map = new Map<string, CustomerSummary>()

  for (const t of filtered) {
    const currentPaid = t.paidAmount || 0
    const remainingAmount = t.price - currentPaid

    const existing = map.get(t.customerName)
    if (existing) {
      existing.totalOrders += 1
      existing.totalAmount += t.price
      if (remainingAmount > 0) {
        existing.unpaidAmount += remainingAmount
        existing.unpaidOrders.push(t)
      }
    } else {
      map.set(t.customerName, {
        customerName: t.customerName,
        totalOrders: 1,
        totalAmount: t.price,
        unpaidAmount: remainingAmount > 0 ? remainingAmount : 0,
        unpaidOrders: remainingAmount > 0 ? [t] : [],
      })
    }
  }

  // Sort by unpaid amount (highest first), then by name
  return Array.from(map.values()).sort((a, b) => {
    if (b.unpaidAmount !== a.unpaidAmount) {
      return b.unpaidAmount - a.unpaidAmount
    }
    return a.customerName.localeCompare(b.customerName)
  })
}

// New function for all-time summaries (shows all transactions across all months)
export function getAllCustomerSummaries(): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>()

  for (const t of transactions) {
    const currentPaid = t.paidAmount || 0
    const remainingAmount = t.price - currentPaid

    const existing = map.get(t.customerName)
    if (existing) {
      existing.totalOrders += 1
      existing.totalAmount += t.price
      if (remainingAmount > 0) {
        existing.unpaidAmount += remainingAmount
        existing.unpaidOrders.push(t)
      }
    } else {
      map.set(t.customerName, {
        customerName: t.customerName,
        totalOrders: 1,
        totalAmount: t.price,
        unpaidAmount: remainingAmount > 0 ? remainingAmount : 0,
        unpaidOrders: remainingAmount > 0 ? [t] : [],
      })
    }
  }

  // Sort by unpaid amount (highest first), then by name
  return Array.from(map.values()).sort((a, b) => {
    if (b.unpaidAmount !== a.unpaidAmount) {
      return b.unpaidAmount - a.unpaidAmount
    }
    return a.customerName.localeCompare(b.customerName)
  })
}

// Get available years (from first transaction to current year)
export function getAvailableYears(): string[] {
  if (transactions.length === 0) return []
  
  const now = new Date()
  const currentYear = now.getFullYear()
  
  // Find earliest year
  let earliestYear = currentYear
  for (const t of transactions) {
    const year = parseInt(t.date.substring(0, 4), 10)
    if (year < earliestYear) {
      earliestYear = year
    }
  }
  
  // Generate all years from earliest to current (ascending)
  const years: string[] = []
  for (let y = earliestYear; y <= currentYear; y++) {
    years.push(y.toString())
  }
  
  return years
}

// Get available months for a specific year (from first transaction to current month)
export function getAvailableMonthsForYear(year: string): string[] {
  if (transactions.length === 0) return []
  
  const now = new Date()
  const currentYear = now.getFullYear().toString()
  const currentMonth = now.getMonth() + 1 // 1-12
  
  // Find earliest transaction in this year
  let earliestMonth = 12
  for (const t of transactions) {
    if (t.date.startsWith(year)) {
      const month = parseInt(t.date.substring(5, 7), 10)
      if (month < earliestMonth) {
        earliestMonth = month
      }
    }
  }
  
  // If no transactions in this year, return empty
  if (earliestMonth === 12 && !transactions.some(t => t.date.startsWith(year))) {
    return []
  }
  
  // Determine end month
  let endMonth = 12
  if (year === currentYear) {
    endMonth = currentMonth
  }
  
  // Generate all months from earliest to end (ascending)
  const months: string[] = []
  for (let m = earliestMonth; m <= endMonth; m++) {
    months.push(m.toString().padStart(2, '0'))
  }
  
  return months
}

// Month names for dropdown
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function formatMonthLabel(monthNumber: string): string {
  const idx = Number.parseInt(monthNumber, 10) - 1
  return MONTH_NAMES[idx] || monthNumber
}

export function getCurrentYearMonth(): { year: string; month: string } {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return { year, month }
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDateShort(dateString: string): string {
  // Format: DD/MM
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}`
}

export function formatDateFull(dateString: string): string {
  // Format: DD Bulan YYYY (e.g., "12 Februari 2026")
  const [year, month, day] = dateString.split('-')
  const monthName = MONTH_NAMES[parseInt(month, 10) - 1]
  return `${day} ${monthName} ${year}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Export transactions to CSV
export function exportTransactionsToCSV(month?: string): string {
  // Filter transactions if month is specified
  const filtered = month
    ? transactions.filter((t) => t.date.startsWith(month))
    : transactions

  // Sort by date (newest first)
  const sorted = [...filtered].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // CSV Header
  const headers = ['Tanggal', 'Pemesan', 'Pesanan', 'Harga', 'Status', 'Terbayar', 'Sisa']
  
  // CSV Rows
  const rows = sorted.map(t => {
    const paidAmount = t.paidAmount || 0
    const remaining = t.price - paidAmount
    return [
      t.date,
      t.customerName,
      t.orderName,
      t.price.toString(),
      t.isPaid ? 'Lunas' : 'Belum Bayar',
      paidAmount.toString(),
      remaining.toString()
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string) {
  if (typeof window === 'undefined') return

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}