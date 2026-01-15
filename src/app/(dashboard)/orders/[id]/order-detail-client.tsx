"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    DollarSign,
    Edit,
    FileText,
    History,
    Save,
    Trash,
    User,
} from "lucide-react"
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    getPaymentStatusLabel,
    getPaymentStatusColor,
    getWorkStatusLabel,
    getWorkStatusColor,
} from "@/lib/utils"
import { updateOrder, deleteOrder, markOrderPaid, markOrderDone } from "@/actions/orders"
import { Spinner } from "@/components/ui/spinner"

interface AuditLog {
    id: string
    action: string
    field: string | null
    oldValue: string | null
    newValue: string | null
    createdAt: Date
    user: { name: string }
}

interface Order {
    id: string
    orderCode: string
    customerNumber: string
    jobType: string
    price: number
    paidAmount: number
    paymentStatus: string
    workStatus: string
    feeAdmin: number
    netJockey: number
    dueDate: Date | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
    jockey: { id: string; name: string }
    auditLogs: AuditLog[]
}

interface Penjoki {
    id: string
    name: string
    email: string
}

interface OrderDetailClientProps {
    order: Order
    penjokis: Penjoki[]
}

export function OrderDetailClient({ order: initialOrder, penjokis }: OrderDetailClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        customerNumber: initialOrder.customerNumber,
        jobType: initialOrder.jobType,
        price: initialOrder.price,
        jockeyId: initialOrder.jockey.id,
        paymentStatus: initialOrder.paymentStatus,
        workStatus: initialOrder.workStatus,
        paidAmount: initialOrder.paidAmount,
        dueDate: initialOrder.dueDate ? new Date(initialOrder.dueDate).toISOString().split("T")[0] : "",
        notes: initialOrder.notes || "",
    })

    const handleSave = () => {
        startTransition(async () => {
            const form = new FormData()
            Object.entries(formData).forEach(([key, value]) => {
                form.append(key, value.toString())
            })

            const result = await updateOrder(initialOrder.id, form)
            if (result.error) {
                setError(result.error)
            } else {
                setIsEditing(false)
                setError(null)
                router.refresh()
            }
        })
    }

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteOrder(initialOrder.id)
            if (result.error) {
                setError(result.error)
            } else {
                router.push("/orders")
            }
        })
    }

    const handleMarkPaid = () => {
        startTransition(async () => {
            await markOrderPaid(initialOrder.id)
            router.refresh()
        })
    }

    const handleMarkDone = () => {
        startTransition(async () => {
            await markOrderDone(initialOrder.id)
            router.refresh()
        })
    }

    const remainingAmount = initialOrder.price - initialOrder.paidAmount

    // Status timeline
    const statusSteps = ["NEW", "IN_PROGRESS", "REVISION", "DONE", "DELIVERED"]
    const currentStepIndex = statusSteps.indexOf(initialOrder.workStatus)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/orders">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{initialOrder.orderCode}</h1>
                        <p className="text-muted-foreground">{initialOrder.jobType}</p>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    {!isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                            {initialOrder.paymentStatus !== "PAID" && (
                                <Button variant="outline" onClick={handleMarkPaid} disabled={isPending}>
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Mark Paid
                                </Button>
                            )}
                            {!["DONE", "DELIVERED", "CANCELED"].includes(initialOrder.workStatus) && (
                                <Button variant="outline" onClick={handleMarkDone} disabled={isPending}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Done
                                </Button>
                            )}
                            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                <Trash className="h-4 w-4 mr-2" />
                                Hapus
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Batal
                            </Button>
                            <Button onClick={handleSave} disabled={isPending}>
                                {isPending ? <Spinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Simpan
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Status Timeline */}
            {initialOrder.workStatus !== "CANCELED" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Status Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between overflow-x-auto pb-2">
                            {statusSteps.map((step, index) => (
                                <div key={step} className="flex items-center">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${index <= currentStepIndex
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {index < currentStepIndex ? "✓" : index + 1}
                                        </div>
                                        <span className="text-xs mt-1 text-center">{getWorkStatusLabel(step)}</span>
                                    </div>
                                    {index < statusSteps.length - 1 && (
                                        <div
                                            className={`w-12 md:w-20 h-1 mx-2 ${index < currentStepIndex ? "bg-primary" : "bg-muted"
                                                }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Order Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Detail Order
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isEditing ? (
                            <>
                                <div className="space-y-2">
                                    <Label>Customer Number</Label>
                                    <Input
                                        value={formData.customerNumber}
                                        onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Job Type</Label>
                                    <Input
                                        value={formData.jobType}
                                        onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Penjoki</Label>
                                    <Select
                                        value={formData.jockeyId}
                                        onValueChange={(value) => setFormData({ ...formData, jockeyId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {penjokis.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Harga</Label>
                                        <Input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Dibayar</Label>
                                        <Input
                                            type="number"
                                            value={formData.paidAmount}
                                            onChange={(e) => setFormData({ ...formData, paidAmount: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Status Bayar</Label>
                                        <Select
                                            value={formData.paymentStatus}
                                            onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UNPAID">Belum Bayar</SelectItem>
                                                <SelectItem value="DP">DP</SelectItem>
                                                <SelectItem value="PAID">Lunas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Status Kerja</Label>
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
                                                <SelectItem value="CANCELED">Dibatalkan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Deadline</Label>
                                    <Input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Catatan</Label>
                                    <Textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer</span>
                                    <span className="font-medium">{initialOrder.customerNumber}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Job Type</span>
                                    <span className="font-medium">{initialOrder.jobType}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Penjoki</span>
                                    <span className="font-medium flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {initialOrder.jockey.name}
                                    </span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Status Bayar</span>
                                    <Badge className={getPaymentStatusColor(initialOrder.paymentStatus)}>
                                        {getPaymentStatusLabel(initialOrder.paymentStatus)}
                                    </Badge>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Status Kerja</span>
                                    <Badge className={getWorkStatusColor(initialOrder.workStatus)}>
                                        {getWorkStatusLabel(initialOrder.workStatus)}
                                    </Badge>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Deadline</span>
                                    <span className="font-medium">
                                        {initialOrder.dueDate ? formatDate(initialOrder.dueDate) : "-"}
                                    </span>
                                </div>
                                {initialOrder.notes && (
                                    <>
                                        <Separator />
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Catatan</span>
                                            <p className="text-sm">{initialOrder.notes}</p>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Financial Details */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Keuangan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Harga</span>
                                <span className="font-bold text-lg">{formatCurrency(initialOrder.price)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Dibayar</span>
                                <span className="font-medium text-green-600">{formatCurrency(initialOrder.paidAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Sisa</span>
                                <span className={`font-medium ${remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                                    {formatCurrency(remainingAmount)}
                                </span>
                            </div>
                            <Separator />
                            <div className="p-4 rounded-lg bg-muted space-y-2">
                                <div className="flex justify-between">
                                    <span>Fee Admin</span>
                                    <span className="font-medium text-blue-600">{formatCurrency(initialOrder.feeAdmin)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Net Penjoki</span>
                                    <span className="font-medium text-green-600">{formatCurrency(initialOrder.netJockey)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Audit Log */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Riwayat Perubahan
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {initialOrder.auditLogs.length === 0 ? (
                                <p className="text-muted-foreground text-sm">Tidak ada riwayat perubahan</p>
                            ) : (
                                <div className="space-y-3">
                                    {initialOrder.auditLogs.slice(0, 10).map((log) => (
                                        <div key={log.id} className="text-sm border-l-2 border-muted pl-3">
                                            <p className="font-medium">{log.user.name}</p>
                                            <p className="text-muted-foreground">
                                                {log.action === "CREATE" && "Membuat order"}
                                                {log.action === "UPDATE" && log.field && (
                                                    <>
                                                        Mengubah <span className="font-medium">{log.field}</span>
                                                        {log.oldValue && log.newValue && (
                                                            <>
                                                                {" "}dari <span className="text-red-600">{log.oldValue}</span> ke{" "}
                                                                <span className="text-green-600">{log.newValue}</span>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Order</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus order {initialOrder.orderCode}? Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            {isPending ? <Spinner size="sm" className="mr-2" /> : null}
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
