import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date))
}

export function generateOrderCode(): string {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    return `JK-${year}-${random}`
}

export async function generateNextOrderCode(prisma: { order: { count: () => Promise<number> } }): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.order.count()
    const nextNumber = (count + 1).toString().padStart(6, '0')
    return `JK-${year}-${nextNumber}`
}

export function getPaymentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        UNPAID: 'Belum Bayar',
        DP: 'DP',
        PAID: 'Lunas',
    }
    return labels[status] || status
}

export function getWorkStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        NEW: 'Baru',
        IN_PROGRESS: 'Dikerjakan',
        REVISION: 'Revisi',
        DONE: 'Selesai',
        DELIVERED: 'Dikirim',
        CANCELED: 'Dibatalkan',
    }
    return labels[status] || status
}

export function getPaymentStatusColor(status: string): string {
    const colors: Record<string, string> = {
        UNPAID: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        DP: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getWorkStatusColor(status: string): string {
    const colors: Record<string, string> = {
        NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        REVISION: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        DONE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        DELIVERED: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
        CANCELED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
}
