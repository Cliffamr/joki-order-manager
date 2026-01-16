"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, Eye, DollarSign, TrendingUp, Receipt, Plus, Check, Trash2, History } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
    getPayrollSummary,
    getJockeyPayrollDetail,
    createPayout,
    getPayouts,
    updatePayoutStatus,
    deletePayout
} from "@/actions/payroll"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/use-toast"

interface PayrollSummary {
    id: string
    name: string
    email: string
    totalOrders: number
    totalGross: number
    totalFee: number
    totalNet: number
}

interface JockeyDetail {
    jockey: { id: string; name: string; email: string }
    orders: Array<{
        id: string
        orderCode: string
        jobType: string
        price: number
        feeAdmin: number
        netJockey: number
        createdAt: Date
    }>
    summary: {
        totalOrders: number
        totalGross: number
        totalFee: number
        totalNet: number
    }
}

interface Payout {
    id: string
    periodStart: Date
    periodEnd: Date
    totalGross: number
    totalFee: number
    totalNet: number
    status: "UNPAID" | "PAID"
    createdAt: Date
    jockey: { id: string; name: string; email: string }
}

interface PayrollClientProps {
    initialSummary: PayrollSummary[]
    initialPayouts: Payout[]
}

export function PayrollClient({ initialSummary, initialPayouts }: PayrollClientProps) {
    const [isPending, startTransition] = useTransition()
    const [summary, setSummary] = useState(initialSummary)
    const [payouts, setPayouts] = useState<Payout[]>(initialPayouts)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [showDetail, setShowDetail] = useState(false)
    const [jockeyDetail, setJockeyDetail] = useState<JockeyDetail | null>(null)
    const [showCreatePayout, setShowCreatePayout] = useState(false)
    const [selectedJockey, setSelectedJockey] = useState<PayrollSummary | null>(null)
    const { toast } = useToast()

    const handleFilter = () => {
        startTransition(async () => {
            const result = await getPayrollSummary({ startDate, endDate })
            setSummary(result)
        })
    }

    const handleViewDetail = (jockeyId: string) => {
        startTransition(async () => {
            const result = await getJockeyPayrollDetail(jockeyId, { startDate, endDate })
            setJockeyDetail(result)
            setShowDetail(true)
        })
    }

    const handleOpenCreatePayout = (jockey: PayrollSummary) => {
        if (!startDate || !endDate) {
            toast({
                title: "Filter tanggal diperlukan",
                description: "Pilih periode tanggal terlebih dahulu untuk membuat payout",
                variant: "destructive",
            })
            return
        }
        setSelectedJockey(jockey)
        setShowCreatePayout(true)
    }

    const handleCreatePayout = () => {
        if (!selectedJockey) return

        startTransition(async () => {
            const result = await createPayout({
                jockeyId: selectedJockey.id,
                periodStart: startDate,
                periodEnd: endDate,
            })

            if (result.success) {
                toast({
                    title: "Payout berhasil dibuat",
                    description: `Payout untuk ${selectedJockey.name} telah disimpan`,
                })
                setShowCreatePayout(false)
                // Refresh payouts
                const newPayouts = await getPayouts()
                setPayouts(newPayouts)
            } else {
                toast({
                    title: "Gagal membuat payout",
                    description: result.error,
                    variant: "destructive",
                })
            }
        })
    }

    const handleUpdateStatus = (payoutId: string, status: "UNPAID" | "PAID") => {
        startTransition(async () => {
            const result = await updatePayoutStatus(payoutId, status)
            if (result.success) {
                toast({
                    title: "Status diperbarui",
                    description: `Status payout berhasil diubah ke ${status}`,
                })
                const newPayouts = await getPayouts()
                setPayouts(newPayouts)
            } else {
                toast({
                    title: "Gagal mengubah status",
                    description: result.error,
                    variant: "destructive",
                })
            }
        })
    }

    const handleDeletePayout = (payoutId: string) => {
        startTransition(async () => {
            const result = await deletePayout(payoutId)
            if (result.success) {
                toast({
                    title: "Payout dihapus",
                    description: "Payout berhasil dihapus",
                })
                const newPayouts = await getPayouts()
                setPayouts(newPayouts)
            } else {
                toast({
                    title: "Gagal menghapus payout",
                    description: result.error,
                    variant: "destructive",
                })
            }
        })
    }

    // Calculate totals
    const totals = summary.reduce(
        (acc, item) => ({
            orders: acc.orders + item.totalOrders,
            gross: acc.gross + item.totalGross,
            fee: acc.fee + item.totalFee,
            net: acc.net + item.totalNet,
        }),
        { orders: 0, gross: 0, fee: 0, net: 0 }
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Rekap Gaji Penjoki</h1>
                    <p className="text-muted-foreground">Ringkasan pendapatan penjoki berdasarkan order selesai</p>
                </div>
            </div>

            {/* Date Filter */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Dari Tanggal</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Sampai Tanggal</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <Button onClick={handleFilter} disabled={isPending}>
                            {isPending ? <Spinner size="sm" className="mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                            Terapkan
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Order</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totals.orders}</div>
                        <p className="text-xs text-muted-foreground">order selesai</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totals.gross)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 dark:bg-blue-950">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Fee Admin</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(totals.fee)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-950">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Net</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(totals.net)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Payroll Summary and Payout History */}
            <Tabs defaultValue="summary" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="summary" className="gap-2">
                        <Receipt className="h-4 w-4" />
                        Rekap Penjoki
                    </TabsTrigger>
                    <TabsTrigger value="payouts" className="gap-2">
                        <History className="h-4 w-4" />
                        Riwayat Payout
                        {payouts.filter(p => p.status === "UNPAID").length > 0 && (
                            <Badge variant="destructive" className="ml-1">
                                {payouts.filter(p => p.status === "UNPAID").length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                Rekap per Penjoki
                            </CardTitle>
                            <CardDescription>
                                Daftar pendapatan masing-masing penjoki dari order yang sudah selesai
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Penjoki</TableHead>
                                            <TableHead className="text-right">Order</TableHead>
                                            <TableHead className="text-right">Gross</TableHead>
                                            <TableHead className="text-right">Fee Admin</TableHead>
                                            <TableHead className="text-right">Net</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summary.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    Tidak ada data untuk periode ini
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            summary.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{item.name}</p>
                                                            <p className="text-sm text-muted-foreground">{item.email}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.totalOrders}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.totalGross)}</TableCell>
                                                    <TableCell className="text-right text-blue-600">
                                                        {formatCurrency(item.totalFee)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-green-600">
                                                        {formatCurrency(item.totalNet)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleViewDetail(item.id)}
                                                                disabled={isPending}
                                                            >
                                                                <Eye className="h-4 w-4 mr-1" />
                                                                Detail
                                                            </Button>
                                                            {item.totalOrders > 0 && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleOpenCreatePayout(item)}
                                                                    disabled={isPending}
                                                                >
                                                                    <Plus className="h-4 w-4 mr-1" />
                                                                    Payout
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-4">
                                {summary.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">
                                        Tidak ada data untuk periode ini
                                    </p>
                                ) : (
                                    summary.map((item) => (
                                        <Card key={item.id}>
                                            <CardContent className="pt-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="font-medium">{item.name}</p>
                                                        <p className="text-sm text-muted-foreground">{item.totalOrders} order</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewDetail(item.id)}
                                                            disabled={isPending}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {item.totalOrders > 0 && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleOpenCreatePayout(item)}
                                                                disabled={isPending}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Gross</p>
                                                        <p className="font-medium text-sm">{formatCurrency(item.totalGross)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Fee</p>
                                                        <p className="font-medium text-sm text-blue-600">{formatCurrency(item.totalFee)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Net</p>
                                                        <p className="font-medium text-sm text-green-600">{formatCurrency(item.totalNet)}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payouts">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Riwayat Payout
                            </CardTitle>
                            <CardDescription>
                                Daftar pembayaran gaji yang sudah dibuat
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Penjoki</TableHead>
                                            <TableHead>Periode</TableHead>
                                            <TableHead className="text-right">Gross</TableHead>
                                            <TableHead className="text-right">Fee</TableHead>
                                            <TableHead className="text-right">Net</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payouts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    Belum ada payout
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            payouts.map((payout) => (
                                                <TableRow key={payout.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{payout.jockey.name}</p>
                                                            <p className="text-sm text-muted-foreground">{payout.jockey.email}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm">
                                                            {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatCurrency(payout.totalGross)}</TableCell>
                                                    <TableCell className="text-right text-blue-600">{formatCurrency(payout.totalFee)}</TableCell>
                                                    <TableCell className="text-right font-medium text-green-600">
                                                        {formatCurrency(payout.totalNet)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={payout.status === "PAID" ? "default" : "destructive"}>
                                                            {payout.status === "PAID" ? "Sudah Dibayar" : "Belum Dibayar"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            {payout.status === "UNPAID" && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleUpdateStatus(payout.id, "PAID")}
                                                                    disabled={isPending}
                                                                >
                                                                    <Check className="h-4 w-4 mr-1" />
                                                                    Tandai Lunas
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeletePayout(payout.id)}
                                                                disabled={isPending}
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-4">
                                {payouts.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">
                                        Belum ada payout
                                    </p>
                                ) : (
                                    payouts.map((payout) => (
                                        <Card key={payout.id}>
                                            <CardContent className="pt-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="font-medium">{payout.jockey.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                                                        </p>
                                                    </div>
                                                    <Badge variant={payout.status === "PAID" ? "default" : "destructive"}>
                                                        {payout.status === "PAID" ? "Lunas" : "Belum"}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Gross</p>
                                                        <p className="font-medium text-sm">{formatCurrency(payout.totalGross)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Fee</p>
                                                        <p className="font-medium text-sm text-blue-600">{formatCurrency(payout.totalFee)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Net</p>
                                                        <p className="font-medium text-sm text-green-600">{formatCurrency(payout.totalNet)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {payout.status === "UNPAID" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleUpdateStatus(payout.id, "PAID")}
                                                            disabled={isPending}
                                                            className="flex-1"
                                                        >
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Tandai Lunas
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeletePayout(payout.id)}
                                                        disabled={isPending}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Detail Dialog */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Detail Rekap: {jockeyDetail?.jockey.name}
                        </DialogTitle>
                    </DialogHeader>

                    {jockeyDetail && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-muted">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Order</p>
                                    <p className="text-xl font-bold">{jockeyDetail.summary.totalOrders}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Gross</p>
                                    <p className="text-xl font-bold">{formatCurrency(jockeyDetail.summary.totalGross)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Fee</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {formatCurrency(jockeyDetail.summary.totalFee)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Net</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatCurrency(jockeyDetail.summary.totalNet)}
                                    </p>
                                </div>
                            </div>

                            {/* Orders Table */}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Job Type</TableHead>
                                        <TableHead className="text-right">Harga</TableHead>
                                        <TableHead className="text-right">Fee</TableHead>
                                        <TableHead className="text-right">Net</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {jockeyDetail.orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.orderCode}</TableCell>
                                            <TableCell className="max-w-32 truncate">{order.jobType}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(order.price)}</TableCell>
                                            <TableCell className="text-right text-blue-600">
                                                {formatCurrency(order.feeAdmin)}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600">
                                                {formatCurrency(order.netJockey)}
                                            </TableCell>
                                            <TableCell>{formatDate(order.createdAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Payout Dialog */}
            <Dialog open={showCreatePayout} onOpenChange={setShowCreatePayout}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buat Payout Baru</DialogTitle>
                        <DialogDescription>
                            Buat record pembayaran untuk {selectedJockey?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedJockey && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-muted space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Periode</span>
                                    <span className="font-medium">{startDate} - {endDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Order</span>
                                    <span className="font-medium">{selectedJockey.totalOrders}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Gross</span>
                                    <span className="font-medium">{formatCurrency(selectedJockey.totalGross)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Fee Admin</span>
                                    <span className="font-medium text-blue-600">{formatCurrency(selectedJockey.totalFee)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="font-medium">Net yang Dibayar</span>
                                    <span className="font-bold text-green-600">{formatCurrency(selectedJockey.totalNet)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreatePayout(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleCreatePayout} disabled={isPending}>
                            {isPending ? <Spinner size="sm" className="mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Buat Payout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
