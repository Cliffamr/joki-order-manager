"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { FileText, Clock, CheckCircle, Edit, Save, X } from "lucide-react"
import {
    formatCurrency,
    formatDate,
    getPaymentStatusLabel,
    getPaymentStatusColor,
    getWorkStatusLabel,
    getWorkStatusColor,
} from "@/lib/utils"
import { updateOrder, markOrderDone, getOrders } from "@/actions/orders"
import { Spinner } from "@/components/ui/spinner"

interface Order {
    id: string
    orderCode: string
    customerNumber: string
    jobType: string
    price: number
    netJockey: number
    paymentStatus: string
    workStatus: string
    dueDate: Date | null
    notes: string | null
    createdAt: Date
}

interface MyOrdersClientProps {
    initialOrders: Order[]
    initialTotal: number
}

export function MyOrdersClient({ initialOrders, initialTotal }: MyOrdersClientProps) {
    const [isPending, startTransition] = useTransition()
    const [orders, setOrders] = useState(initialOrders)
    const [showUpdateDialog, setShowUpdateDialog] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [formData, setFormData] = useState({ workStatus: "", notes: "" })
    const [error, setError] = useState<string | null>(null)

    const handleOpenUpdate = (order: Order) => {
        setSelectedOrder(order)
        setFormData({
            workStatus: order.workStatus,
            notes: order.notes || "",
        })
        setShowUpdateDialog(true)
    }

    const handleSave = () => {
        if (!selectedOrder) return

        startTransition(async () => {
            const form = new FormData()
            form.append("workStatus", formData.workStatus)
            form.append("notes", formData.notes)

            const result = await updateOrder(selectedOrder.id, form)
            if (result.error) {
                setError(result.error)
            } else {
                setShowUpdateDialog(false)
                setError(null)
                const updated = await getOrders({})
                setOrders(updated.orders as Order[])
            }
        })
    }

    const handleMarkDone = (id: string) => {
        startTransition(async () => {
            await markOrderDone(id)
            const updated = await getOrders({})
            setOrders(updated.orders as Order[])
        })
    }

    // Calculate stats
    const activeOrders = orders.filter(
        (o) => !["DONE", "DELIVERED", "CANCELED"].includes(o.workStatus)
    ).length
    const doneOrders = orders.filter(
        (o) => ["DONE", "DELIVERED"].includes(o.workStatus)
    ).length
    const totalNetEarnings = orders
        .filter((o) => ["DONE", "DELIVERED"].includes(o.workStatus))
        .reduce((sum, o) => sum + o.netJockey, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Order Saya</h1>
                <p className="text-muted-foreground">Daftar order yang ditugaskan kepada Anda</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeOrders}</p>
                                <p className="text-xs text-muted-foreground">Aktif</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{doneOrders}</p>
                                <p className="text-xs text-muted-foreground">Selesai</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(totalNetEarnings)}</p>
                            <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {orders.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Belum ada order yang ditugaskan kepada Anda</p>
                        </CardContent>
                    </Card>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{order.orderCode}</CardTitle>
                                        <CardDescription>{order.customerNumber}</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                                            {getPaymentStatusLabel(order.paymentStatus)}
                                        </Badge>
                                        <Badge className={getWorkStatusColor(order.workStatus)}>
                                            {getWorkStatusLabel(order.workStatus)}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm mb-4">{order.jobType}</p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Pendapatan</p>
                                        <p className="font-medium text-green-600">{formatCurrency(order.netJockey)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Deadline</p>
                                        <p className="font-medium">
                                            {order.dueDate ? formatDate(order.dueDate) : "-"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Dibuat</p>
                                        <p className="font-medium">{formatDate(order.createdAt)}</p>
                                    </div>
                                </div>

                                {order.notes && (
                                    <div className="p-3 rounded-lg bg-muted text-sm mb-4">
                                        <p className="text-muted-foreground text-xs mb-1">Catatan:</p>
                                        <p>{order.notes}</p>
                                    </div>
                                )}

                                {!["DONE", "DELIVERED", "CANCELED"].includes(order.workStatus) && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenUpdate(order)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Update Status
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleMarkDone(order.id)}
                                            disabled={isPending}
                                        >
                                            {isPending ? (
                                                <Spinner size="sm" className="mr-2" />
                                            ) : (
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                            )}
                                            Tandai Selesai
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Update Dialog */}
            <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Order: {selectedOrder?.orderCode}</DialogTitle>
                    </DialogHeader>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Status Pengerjaan</Label>
                            <Select
                                value={formData.workStatus}
                                onValueChange={(value) => setFormData({ ...formData, workStatus: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NEW">Baru</SelectItem>
                                    <SelectItem value="IN_PROGRESS">Dikerjakan</SelectItem>
                                    <SelectItem value="REVISION">Revisi</SelectItem>
                                    <SelectItem value="DONE">Selesai</SelectItem>
                                    <SelectItem value="DELIVERED">Dikirim</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Catatan Progress</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Tambahkan catatan progress pengerjaan..."
                                rows={4}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                            <X className="h-4 w-4 mr-2" />
                            Batal
                        </Button>
                        <Button onClick={handleSave} disabled={isPending}>
                            {isPending ? <Spinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
