"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Eye, CheckCircle, DollarSign, Filter } from "lucide-react"
import { formatCurrency, formatDate, getPaymentStatusLabel, getPaymentStatusColor, getWorkStatusLabel, getWorkStatusColor } from "@/lib/utils"
import { getOrders, markOrderPaid, markOrderDone } from "@/actions/orders"
import { Spinner } from "@/components/ui/spinner"

interface Order {
    id: string
    orderCode: string
    customerNumber: string
    jobType: string
    price: number
    paidAmount: number
    paymentStatus: string
    workStatus: string
    createdAt: Date
    jockey: { id: string; name: string }
}

interface Penjoki {
    id: string
    name: string
    email: string
}

interface OrdersClientProps {
    initialOrders: Order[]
    initialTotal: number
    penjokis: Penjoki[]
}

export function OrdersClient({ initialOrders, initialTotal, penjokis }: OrdersClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [orders, setOrders] = useState(initialOrders)
    const [total, setTotal] = useState(initialTotal)

    // Filters
    const [search, setSearch] = useState("")
    const [jockeyId, setJockeyId] = useState("")
    const [paymentStatus, setPaymentStatus] = useState("")
    const [workStatus, setWorkStatus] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [showFilters, setShowFilters] = useState(false)

    const handleSearch = async () => {
        startTransition(async () => {
            const result = await getOrders({
                search,
                jockeyId: jockeyId || undefined,
                paymentStatus: paymentStatus || undefined,
                workStatus: workStatus || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            })
            setOrders(result.orders as Order[])
            setTotal(result.total)
        })
    }

    const handleMarkPaid = async (id: string) => {
        startTransition(async () => {
            await markOrderPaid(id)
            handleSearch()
        })
    }

    const handleMarkDone = async (id: string) => {
        startTransition(async () => {
            await markOrderDone(id)
            handleSearch()
        })
    }

    const clearFilters = () => {
        setSearch("")
        setJockeyId("")
        setPaymentStatus("")
        setWorkStatus("")
        setStartDate("")
        setEndDate("")
        startTransition(async () => {
            const result = await getOrders({})
            setOrders(result.orders as Order[])
            setTotal(result.total)
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Orders</h1>
                    <p className="text-muted-foreground">{total} order ditemukan</p>
                </div>
                <Button asChild>
                    <Link href="/orders/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Order Baru
                    </Link>
                </Button>
            </div>

            {/* Search & Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                        {/* Search Bar */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari order code, customer, job type..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                />
                            </div>
                            <Button onClick={handleSearch} disabled={isPending}>
                                {isPending ? <Spinner size="sm" /> : "Cari"}
                            </Button>
                            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Extended Filters */}
                        {showFilters && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                                <div className="space-y-1">
                                    <Label className="text-xs">Penjoki</Label>
                                    <Select value={jockeyId} onValueChange={setJockeyId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">Semua</SelectItem>
                                            {penjokis.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Status Bayar</Label>
                                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">Semua</SelectItem>
                                            <SelectItem value="UNPAID">Belum Bayar</SelectItem>
                                            <SelectItem value="DP">DP</SelectItem>
                                            <SelectItem value="PAID">Lunas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Status Kerja</Label>
                                    <Select value={workStatus} onValueChange={setWorkStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">Semua</SelectItem>
                                            <SelectItem value="NEW">Baru</SelectItem>
                                            <SelectItem value="IN_PROGRESS">Dikerjakan</SelectItem>
                                            <SelectItem value="REVISION">Revisi</SelectItem>
                                            <SelectItem value="DONE">Selesai</SelectItem>
                                            <SelectItem value="DELIVERED">Dikirim</SelectItem>
                                            <SelectItem value="CANCELED">Dibatalkan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Dari Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Sampai Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-5 flex gap-2 pt-2">
                                    <Button onClick={handleSearch} disabled={isPending} size="sm">
                                        Terapkan Filter
                                    </Button>
                                    <Button onClick={clearFilters} variant="outline" size="sm">
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table - Desktop */}
            <div className="hidden md:block">
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Job Type</TableHead>
                                <TableHead>Penjoki</TableHead>
                                <TableHead>Harga</TableHead>
                                <TableHead>Pembayaran</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        Tidak ada order ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.orderCode}</TableCell>
                                        <TableCell>{order.customerNumber}</TableCell>
                                        <TableCell className="max-w-32 truncate">{order.jobType}</TableCell>
                                        <TableCell>{order.jockey.name}</TableCell>
                                        <TableCell>{formatCurrency(order.price)}</TableCell>
                                        <TableCell>
                                            <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                                                {getPaymentStatusLabel(order.paymentStatus)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getWorkStatusColor(order.workStatus)}>
                                                {getWorkStatusLabel(order.workStatus)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Detail
                                                    </DropdownMenuItem>
                                                    {order.paymentStatus !== "PAID" && (
                                                        <DropdownMenuItem onClick={() => handleMarkPaid(order.id)}>
                                                            <DollarSign className="h-4 w-4 mr-2" />
                                                            Mark Paid
                                                        </DropdownMenuItem>
                                                    )}
                                                    {!["DONE", "DELIVERED", "CANCELED"].includes(order.workStatus) && (
                                                        <DropdownMenuItem onClick={() => handleMarkDone(order.id)}>
                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                            Mark Done
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Orders Cards - Mobile */}
            <div className="md:hidden space-y-4">
                {orders.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Tidak ada order ditemukan
                        </CardContent>
                    </Card>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-semibold">{order.orderCode}</p>
                                        <p className="text-sm text-muted-foreground">{order.customerNumber}</p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
                                                <Eye className="h-4 w-4 mr-2" />
                                                Detail
                                            </DropdownMenuItem>
                                            {order.paymentStatus !== "PAID" && (
                                                <DropdownMenuItem onClick={() => handleMarkPaid(order.id)}>
                                                    <DollarSign className="h-4 w-4 mr-2" />
                                                    Mark Paid
                                                </DropdownMenuItem>
                                            )}
                                            {!["DONE", "DELIVERED", "CANCELED"].includes(order.workStatus) && (
                                                <DropdownMenuItem onClick={() => handleMarkDone(order.id)}>
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Mark Done
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <p className="text-sm mb-3 line-clamp-1">{order.jobType}</p>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                                        {getPaymentStatusLabel(order.paymentStatus)}
                                    </Badge>
                                    <Badge className={getWorkStatusColor(order.workStatus)}>
                                        {getWorkStatusLabel(order.workStatus)}
                                    </Badge>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{order.jockey.name}</span>
                                    <span className="font-medium">{formatCurrency(order.price)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
