'use client'

import { useState } from 'react'
import { ShieldCheck, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { login } from '@/lib/store'

export function LoginScreen() {
  const [selectedUser, setSelectedUser] = useState<'admin' | 'user' | null>(
    null,
  )
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
        setError('Password salah, coba lagi.')
        setPassword('')
      }
    } catch (error) {
      setError('Terjadi kesalahan saat login')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Logo / App Name */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <ShieldCheck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Catatan Transaksi
          </h1>
          <p className="text-sm text-muted-foreground">
            Pilih akun lalu masukkan password
          </p>
        </div>

        {/* User selection */}
        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-foreground">
            Masuk sebagai
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedUser('admin')
                setError('')
                setPassword('')
              }}
              disabled={isLoading}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                selectedUser === 'admin'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  selectedUser === 'admin'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span
                className={`text-sm font-semibold ${
                  selectedUser === 'admin'
                    ? 'text-primary'
                    : 'text-card-foreground'
                }`}
              >
                Admin
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedUser('user')
                setError('')
                setPassword('')
              }}
              disabled={isLoading}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                selectedUser === 'user'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  selectedUser === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <User className="h-5 w-5" />
              </div>
              <span
                className={`text-sm font-semibold ${
                  selectedUser === 'user'
                    ? 'text-primary'
                    : 'text-card-foreground'
                }`}
              >
                User
              </span>
            </button>
          </div>
        </div>

        {/* Password field */}
        {selectedUser && (
          <div className="mb-5 flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={isLoading}
                className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </div>
        )}

        {/* Login button */}
        <button
          type="button"
          onClick={handleLogin}
          className="h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedUser || !password || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memproses...
            </span>
          ) : (
            'Masuk'
          )}
        </button>
      </div>
    </div>
  )
}