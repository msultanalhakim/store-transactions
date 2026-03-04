import { supabase, type OrderItem } from './supabase'

// ─── Types ─────────────────────────────────────────────────────────────────

export type { OrderItem }

export interface Transaction {
  id: string
  date: string
  customerName: string
  orderItems: OrderItem[]  // array of { name, price, qty }
  price: number            // sum of all items (denormalized)
  isPaid: boolean
  paidAmount: number
}

export interface CustomerSummary {
  customerName: string
  totalOrders: number      // number of transaction rows
  totalAmount: number      // sum of all price
  paidAmount: number       // sum of all paid_amount
  unpaidAmount: number     // totalAmount - paidAmount
  unpaidOrders: Transaction[]
}

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  username: string
  role: UserRole
}

// ─── In-memory state ────────────────────────────────────────────────────────

let currentUser: AuthUser | null = null
let transactions: Transaction[] = []
let listeners: Array<() => void> = []
let isInitialized = false

// ─── Pub/Sub ────────────────────────────────────────────────────────────────

function notifyListeners() {
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

// ─── Session (localStorage for auth token only) ─────────────────────────────

function persistUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem('ct-session', JSON.stringify(user))
    } else {
      localStorage.removeItem('ct-session')
    }
  } catch {}
}

function loadUserFromStorage(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ct-session')
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (
      typeof parsed.username === 'string' &&
      (parsed.role === 'admin' || parsed.role === 'user')
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

export async function initializeFromStorage(): Promise<void> {
  if (isInitialized) return
  isInitialized = true

  const savedUser = loadUserFromStorage()
  if (savedUser) {
    currentUser = savedUser
    await loadTransactions()
  }
  notifyListeners()
}

// ─── Password hashing ────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function generatePasswordHash(password: string): Promise<string> {
  return hashPassword(password)
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<AuthUser | null> {
  if (!username.trim() || !password.trim()) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.trim().toLowerCase())
    .single()

  if (error || !data) return null

  const hashedPassword = await hashPassword(password)
  if (data.password_hash !== hashedPassword) return null

  const user: AuthUser = { username: data.username, role: data.role as UserRole }
  currentUser = user
  persistUser(user)
  await loadTransactions()
  notifyListeners()
  return user
}

export function logout(): void {
  currentUser = null
  transactions = []
  isInitialized = false
  persistUser(null)
  notifyListeners()
}

export function getCurrentUser(): AuthUser | null {
  return currentUser
}

export function isAdmin(): boolean {
  return currentUser?.role === 'admin'
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

function mapRow(row: any): Transaction {
  const items: OrderItem[] = Array.isArray(row.order_items) ? row.order_items : []
  // Recalculate price from items for integrity
  const calculatedPrice = items.reduce((s, i) => s + i.price * i.qty, 0)
  const price = calculatedPrice > 0 ? calculatedPrice : (row.price ?? 0)
  const paidAmount = Number(row.paid_amount ?? 0)
  const isPaid = row.is_paid === true

  return {
    id: row.id,
    date: row.date,
    customerName: row.customer_name,
    orderItems: items,
    price,
    isPaid,
    paidAmount,
  }
}

// ─── Load ────────────────────────────────────────────────────────────────────

export async function loadTransactions(): Promise<void> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading transactions:', error)
    return
  }

  transactions = (data ?? []).map(mapRow)
  notifyListeners()
}

export function getTransactions(): Transaction[] {
  return transactions
}

// ─── Add ─────────────────────────────────────────────────────────────────────

export interface AddTransactionInput {
  date: string
  customerName: string
  orderItems: OrderItem[]
  isPaid: boolean
}

export async function addTransaction(input: AddTransactionInput): Promise<Transaction | null> {
  // Validate: at least one item with qty > 0
  const validItems = input.orderItems.filter((i) => i.qty > 0 && i.price > 0)
  if (validItems.length === 0) return null

  const totalPrice = validItems.reduce((s, i) => s + i.price * i.qty, 0)
  if (totalPrice <= 0) return null

  const { data: newRow, error } = await supabase
    .from('transactions')
    .insert({
      date: input.date,
      customer_name: input.customerName.trim(),
      order_items: validItems,
      price: totalPrice,
      is_paid: input.isPaid,
      paid_amount: input.isPaid ? totalPrice : 0,
    })
    .select()
    .single()

  if (error || !newRow) {
    console.error('Error adding transaction:', error)
    return null
  }

  const tx = mapRow(newRow)
  transactions = [tx, ...transactions]
  notifyListeners()
  return tx
}

// ─── Edit ────────────────────────────────────────────────────────────────────

export interface EditTransactionInput {
  date?: string
  customerName?: string
  orderItems?: OrderItem[]
  isPaid?: boolean
  paidAmount?: number
}

export async function editTransaction(id: string, data: EditTransactionInput): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (data.date !== undefined) updateData.date = data.date
  if (data.customerName !== undefined) updateData.customer_name = data.customerName.trim()
  if (data.orderItems !== undefined) {
    const validItems = data.orderItems.filter((i) => i.qty > 0 && i.price > 0)
    updateData.order_items = validItems
    updateData.price = validItems.reduce((s, i) => s + i.price * i.qty, 0)
  }
  if (data.isPaid !== undefined) updateData.is_paid = data.isPaid
  if (data.paidAmount !== undefined) updateData.paid_amount = data.paidAmount

  const { error } = await supabase.from('transactions').update(updateData).eq('id', id)
  if (error) {
    console.error('Error editing transaction:', error)
    return false
  }

  transactions = transactions.map((t) => {
    if (t.id !== id) return t
    const updated = { ...t }
    if (data.date !== undefined) updated.date = data.date
    if (data.customerName !== undefined) updated.customerName = data.customerName.trim()
    if (data.orderItems !== undefined) {
      const validItems = data.orderItems.filter((i) => i.qty > 0 && i.price > 0)
      updated.orderItems = validItems
      updated.price = validItems.reduce((s, i) => s + i.price * i.qty, 0)
    }
    if (data.isPaid !== undefined) updated.isPaid = data.isPaid
    if (data.paidAmount !== undefined) updated.paidAmount = data.paidAmount
    return updated
  })
  notifyListeners()
  return true
}

// ─── Toggle Paid ─────────────────────────────────────────────────────────────

export async function togglePaidStatus(id: string): Promise<boolean> {
  const transaction = transactions.find((t) => t.id === id)
  if (!transaction) return false

  const newIsPaid = !transaction.isPaid
  // If marking as paid: set paid_amount = price
  // If marking as unpaid: set paid_amount = 0
  const newPaidAmount = newIsPaid ? transaction.price : 0

  const { error } = await supabase
    .from('transactions')
    .update({ is_paid: newIsPaid, paid_amount: newPaidAmount })
    .eq('id', id)

  if (error) {
    console.error('Error toggling paid status:', error)
    return false
  }

  transactions = transactions.map((t) =>
    t.id === id ? { ...t, isPaid: newIsPaid, paidAmount: newPaidAmount } : t
  )
  notifyListeners()
  return true
}

// ─── Make Payment ────────────────────────────────────────────────────────────
// Applies payment to oldest unpaid/partially-paid transactions first.
// Only commits to DB if entire operation succeeds (validates locally first).

export async function makePayment(customerName: string, amount: number): Promise<boolean> {
  if (amount <= 0) return false

  // Get unpaid transactions for this customer, oldest first
  const unpaid = transactions
    .filter((t) => t.customerName === customerName && t.paidAmount < t.price)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (unpaid.length === 0) return false

  const totalRemaining = unpaid.reduce((s, t) => s + (t.price - t.paidAmount), 0)
  if (amount > totalRemaining) {
    // Clamp to total remaining to avoid overpayment
    amount = totalRemaining
  }

  // Build update plan
  const updates: Array<{ id: string; isPaid: boolean; paidAmount: number }> = []
  let remaining = amount

  for (const t of unpaid) {
    if (remaining <= 0) break
    const owed = t.price - t.paidAmount
    const pay = Math.min(owed, remaining)
    const newPaid = t.paidAmount + pay
    const newIsPaid = newPaid >= t.price
    updates.push({ id: t.id, isPaid: newIsPaid, paidAmount: newPaid })
    remaining -= pay
  }

  // Apply updates to Supabase
  for (const upd of updates) {
    const { error } = await supabase
      .from('transactions')
      .update({ is_paid: upd.isPaid, paid_amount: upd.paidAmount })
      .eq('id', upd.id)

    if (error) {
      console.error('Error making payment for transaction:', upd.id, error)
      // Reload from DB to ensure consistency
      await loadTransactions()
      return false
    }
  }

  // Update local state
  const updMap = new Map(updates.map((u) => [u.id, u]))
  transactions = transactions.map((t) => {
    const upd = updMap.get(t.id)
    if (!upd) return t
    return { ...t, isPaid: upd.isPaid, paidAmount: upd.paidAmount }
  })
  notifyListeners()
  return true
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteTransaction(id: string): Promise<boolean> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) {
    console.error('Error deleting transaction:', error)
    return false
  }

  transactions = transactions.filter((t) => t.id !== id)
  notifyListeners()
  return true
}

// ─── Summaries ───────────────────────────────────────────────────────────────

function buildSummaries(txs: Transaction[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>()

  for (const t of txs) {
    const owed = t.price - t.paidAmount

    const existing = map.get(t.customerName)
    if (existing) {
      existing.totalOrders += 1
      existing.totalAmount += t.price
      existing.paidAmount += t.paidAmount
      existing.unpaidAmount += Math.max(0, owed)
      if (owed > 0) existing.unpaidOrders.push(t)
    } else {
      map.set(t.customerName, {
        customerName: t.customerName,
        totalOrders: 1,
        totalAmount: t.price,
        paidAmount: t.paidAmount,
        unpaidAmount: Math.max(0, owed),
        unpaidOrders: owed > 0 ? [t] : [],
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.unpaidAmount !== a.unpaidAmount) return b.unpaidAmount - a.unpaidAmount
    return a.customerName.localeCompare(b.customerName)
  })
}

export function getCustomerSummaries(month?: string): CustomerSummary[] {
  const filtered = month
    ? transactions.filter((t) => t.date.startsWith(month))
    : transactions
  return buildSummaries(filtered)
}

export function getAllCustomerSummaries(): CustomerSummary[] {
  return buildSummaries(transactions)
}

// ─── Date helpers ────────────────────────────────────────────────────────────

export function getAvailableYears(): string[] {
  if (transactions.length === 0) return []
  const now = new Date()
  const currentYear = now.getFullYear()
  let earliestYear = currentYear
  for (const t of transactions) {
    const y = parseInt(t.date.substring(0, 4), 10)
    if (y < earliestYear) earliestYear = y
  }
  const years: string[] = []
  for (let y = earliestYear; y <= currentYear; y++) {
    years.push(y.toString())
  }
  return years
}

export function getAvailableMonthsForYear(year: string): string[] {
  const now = new Date()
  const currentYear = now.getFullYear().toString()
  const currentMonth = now.getMonth() + 1

  const monthsInYear = new Set<number>()
  for (const t of transactions) {
    if (t.date.startsWith(year)) {
      monthsInYear.add(parseInt(t.date.substring(5, 7), 10))
    }
  }

  // Always include current month in current year
  if (year === currentYear) {
    monthsInYear.add(currentMonth)
  }

  if (monthsInYear.size === 0) return []

  const minMonth = Math.min(...Array.from(monthsInYear))
  const maxMonth = year === currentYear ? currentMonth : 12

  const months: string[] = []
  for (let m = minMonth; m <= maxMonth; m++) {
    months.push(m.toString().padStart(2, '0'))
  }
  return months
}

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

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDateShort(dateString: string): string {
  const [, month, day] = dateString.split('-')
  return `${day}/${month}`
}

export function formatDateFull(dateString: string): string {
  const [year, month, day] = dateString.split('-')
  const monthName = MONTH_NAMES[parseInt(month, 10) - 1]
  return `${parseInt(day, 10)} ${monthName} ${year}`
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

export function exportTransactionsToCSV(month?: string): string {
  const filtered = month
    ? transactions.filter((t) => t.date.startsWith(month))
    : transactions

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const headers = ['Tanggal', 'Pemesan', 'Menu', 'Qty', 'Harga Satuan', 'Subtotal', 'Total Pesanan', 'Status', 'Terbayar', 'Sisa']

  const rows: string[][] = []
  for (const t of sorted) {
    t.orderItems.forEach((item, idx) => {
      const owed = t.price - t.paidAmount
      rows.push([
        idx === 0 ? t.date : '',
        idx === 0 ? t.customerName : '',
        item.name,
        item.qty.toString(),
        item.price.toString(),
        (item.price * item.qty).toString(),
        idx === 0 ? t.price.toString() : '',
        idx === 0 ? (t.isPaid ? 'Lunas' : t.paidAmount > 0 ? 'Cicilan' : 'Belum Bayar') : '',
        idx === 0 ? t.paidAmount.toString() : '',
        idx === 0 ? Math.max(0, owed).toString() : '',
      ])
    })
  }

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')
}

export function downloadCSV(csvContent: string, filename: string) {
  if (typeof window === 'undefined') return
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}