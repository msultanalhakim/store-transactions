'use client'

import { useState } from 'react'
import { ShieldCheck, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { login } from '@/lib/store'

export function LoginScreen() {
  const [selectedUser, setSelectedUser] = useState<'admin' | 'user' | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogin() {
    if (!selectedUser || !password) return
    setError('')
    setIsLoading(true)
    try {
      const user = await login(selectedUser, password)
      if (user) {
        toast.success(`Selamat datang, ${user.username}!`)
      } else {
        setError('Password salah. Coba lagi.')
        setPassword('')
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-orange-50 dark:bg-slate-950 px-5">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500 shadow-lg">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white text-center leading-tight">
            Catatan Transaksi
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
            Pilih akun lalu masukkan password
          </p>
        </div>

        {/* Pilih akun */}
        <div className="mb-6">
          <p className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-200">
            Masuk sebagai:
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Admin */}
            <button type="button"
              onClick={() => { setSelectedUser('admin'); setError(''); setPassword('') }}
              disabled={isLoading}
              className={`flex flex-col items-center gap-3 rounded-2xl border-3 p-5 transition-all disabled:opacity-50 ${
                selectedUser === 'admin'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-300 dark:ring-orange-700'
                  : 'border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-300'
              }`}
              style={{ borderWidth: selectedUser === 'admin' ? '3px' : '2px' }}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                selectedUser === 'admin' ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                <ShieldCheck className={`h-7 w-7 ${selectedUser === 'admin' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              </div>
              <span className={`text-lg font-bold ${selectedUser === 'admin' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Admin
              </span>
              {selectedUser === 'admin' && (
                <div className="h-2 w-2 rounded-full bg-orange-500" />
              )}
            </button>

            {/* User */}
            <button type="button"
              onClick={() => { setSelectedUser('user'); setError(''); setPassword('') }}
              disabled={isLoading}
              className={`flex flex-col items-center gap-3 rounded-2xl p-5 transition-all disabled:opacity-50 ${
                selectedUser === 'user'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-300 dark:ring-orange-700'
                  : 'border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-300'
              }`}
              style={{ borderWidth: selectedUser === 'user' ? '3px' : '2px', borderStyle: 'solid' }}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                selectedUser === 'user' ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                <User className={`h-7 w-7 ${selectedUser === 'user' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              </div>
              <span className={`text-lg font-bold ${selectedUser === 'user' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                User
              </span>
              {selectedUser === 'user' && (
                <div className="h-2 w-2 rounded-full bg-orange-500" />
              )}
            </button>
          </div>
        </div>

        {/* Password */}
        {selectedUser && (
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-lg font-bold text-slate-800 dark:text-slate-200">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={isLoading}
                className="h-14 w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-12 pr-14 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 disabled:opacity-50"
                autoFocus
                autoComplete="current-password"
              />
              <button type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
              </button>
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                <span className="text-base font-semibold text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Tombol Masuk */}
        <button type="button" onClick={handleLogin}
          className="h-16 w-full rounded-2xl bg-orange-500 text-xl font-extrabold text-white shadow-lg transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!selectedUser || !password || isLoading}>
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Memproses...</span>
            </span>
          ) : 'Masuk'}
        </button>
      </div>
    </div>
  )
}