'use client'

import { useState } from 'react'
import { Plus, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
} from '@/components/ui/drawer'
import { addTransaction, isAdmin } from '@/lib/store'
import { toast } from 'sonner'

export function TransactionForm() {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderName, setOrderName] = useState('')
  const [price, setPrice] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!date || !customerName.trim() || !orderName.trim() || !price) {
      toast.error('Semua field harus diisi')
      return
    }

    const priceNumber = Number.parseFloat(price)
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
      toast.error('Harga harus berupa angka positif')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await addTransaction({
        date,
        customerName: customerName.trim(),
        orderName: orderName.trim(),
        price: priceNumber,
        isPaid,
      })

      if (result) {
        toast.success('Transaksi berhasil ditambahkan')
        setCustomerName('')
        setOrderName('')
        setPrice('')
        setIsPaid(false)
        setDate('')
        setOpen(false)
      } else {
        toast.error('Gagal menambahkan transaksi')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAdmin()) return null

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className="fixed bottom-6 right-6 z-40 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-7 w-7" />
          <span className="sr-only">Tambah Transaksi</span>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-xl">Tambah Transaksi</DrawerTitle>
          <DrawerDescription>Isi data pesanan baru di bawah ini</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-5 px-4 pb-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="date" className="text-base font-medium">
              Tanggal
            </Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                className="h-12 text-base pl-4 pr-12"
                required
              />
              <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer" className="text-base font-medium">
              Nama Pemesan
            </Label>
            <Input
              id="customer"
              placeholder="Contoh: Bu Siti"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isSubmitting}
              className="h-12 text-base"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="order" className="text-base font-medium">
              Pesanan
            </Label>
            <Input
              id="order"
              placeholder="Contoh: Nasi Goreng"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              disabled={isSubmitting}
              className="h-12 text-base"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="price" className="text-base font-medium">
              Harga (Rp)
            </Label>
            <Input
              id="price"
              type="number"
              placeholder="Contoh: 25000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSubmitting}
              className="h-12 text-base"
              inputMode="numeric"
              min="0"
              step="1000"
              required
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
            <Label htmlFor="paid" className="text-base font-medium">
              Sudah Bayar?
            </Label>
            <Switch
              id="paid"
              checked={isPaid}
              onCheckedChange={setIsPaid}
              disabled={isSubmitting}
              className="scale-125"
            />
          </div>
        </div>
        <DrawerFooter className="pt-4">
          <Button
            onClick={handleSubmit}
            size="lg"
            className="h-14 text-lg font-semibold"
            disabled={
              !date || !customerName.trim() || !orderName.trim() || !price || isSubmitting
            }
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
          </Button>
          <DrawerClose asChild>
            <Button
              variant="outline"
              size="lg"
              className="h-12 text-base bg-transparent"
              disabled={isSubmitting}
            >
              Batal
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}