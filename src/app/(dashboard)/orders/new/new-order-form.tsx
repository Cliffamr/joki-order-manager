"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, Calculator } from "lucide-react"
import { createOrder } from "@/actions/orders"
import { simulateFee } from "@/actions/fee-rules"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

const orderSchema = z.object({
    customerNumber: z.string().min(1, "Nomor customer wajib diisi"),
    jobType: z.string().min(1, "Jenis pekerjaan wajib diisi"),
    price: z.number().min(1, "Harga harus lebih dari 0"),
    jockeyId: z.string().min(1, "Penjoki wajib dipilih"),
    paidAmount: z.number().min(0).optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
})

type OrderFormData = z.infer<typeof orderSchema>

interface Penjoki {
    id: string
    name: string
    email: string
}

interface NewOrderFormProps {
    penjokis: Penjoki[]
}

export function NewOrderForm({ penjokis }: NewOrderFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [feePreview, setFeePreview] = useState<{ feeAdmin: number; netJockey: number } | null>(null)

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema),
        defaultValues: {
            paidAmount: 0,
        },
    })

    const priceValue = watch("price")

    // Calculate fee preview when price changes
    useEffect(() => {
        const calculateFee = async () => {
            if (priceValue && priceValue > 0) {
                const result = await simulateFee(priceValue)
                setFeePreview(result)
            } else {
                setFeePreview(null)
            }
        }
        calculateFee()
    }, [priceValue])

    const onSubmit = async (data: OrderFormData) => {
        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append("customerNumber", data.customerNumber)
            formData.append("jobType", data.jobType)
            formData.append("price", data.price.toString())
            formData.append("jockeyId", data.jockeyId)
            if (data.paidAmount) formData.append("paidAmount", data.paidAmount.toString())
            if (data.dueDate) formData.append("dueDate", data.dueDate)
            if (data.notes) formData.append("notes", data.notes)

            const result = await createOrder(formData)

            if (result.error) {
                setError(result.error)
            } else {
                router.push("/orders")
                router.refresh()
            }
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
                <CardContent className="pt-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="customerNumber">Nomor Customer / WA *</Label>
                        <Input
                            id="customerNumber"
                            placeholder="081234567890"
                            {...register("customerNumber")}
                        />
                        {errors.customerNumber && (
                            <p className="text-sm text-destructive">{errors.customerNumber.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="jobType">Jenis Pekerjaan *</Label>
                        <Input
                            id="jobType"
                            placeholder="Tugas Matematika, Skripsi Bab 1, dll"
                            {...register("jobType")}
                        />
                        {errors.jobType && (
                            <p className="text-sm text-destructive">{errors.jobType.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="jockeyId">Penjoki *</Label>
                        <Select onValueChange={(value) => setValue("jockeyId", value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih penjoki" />
                            </SelectTrigger>
                            <SelectContent>
                                {penjokis.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.jockeyId && (
                            <p className="text-sm text-destructive">{errors.jockeyId.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Harga *</Label>
                            <Input
                                id="price"
                                type="number"
                                placeholder="50000"
                                {...register("price", { valueAsNumber: true })}
                            />
                            {errors.price && (
                                <p className="text-sm text-destructive">{errors.price.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="paidAmount">Jumlah Dibayar</Label>
                            <Input
                                id="paidAmount"
                                type="number"
                                placeholder="0"
                                {...register("paidAmount", { valueAsNumber: true })}
                            />
                        </div>
                    </div>

                    {/* Fee Preview */}
                    {feePreview && (
                        <div className="p-4 rounded-lg bg-muted space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Calculator className="h-4 w-4" />
                                Perhitungan Fee
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Fee Admin</p>
                                    <p className="font-medium text-blue-600">{formatCurrency(feePreview.feeAdmin)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Net Penjoki</p>
                                    <p className="font-medium text-green-600">{formatCurrency(feePreview.netJockey)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Total</p>
                                    <p className="font-medium">{formatCurrency(priceValue || 0)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="dueDate">Deadline (opsional)</Label>
                        <Input
                            id="dueDate"
                            type="date"
                            {...register("dueDate")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Catatan (opsional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Catatan tambahan untuk order ini..."
                            {...register("notes")}
                        />
                    </div>
                </CardContent>

                <CardFooter className="flex gap-2 justify-between">
                    <Button variant="outline" asChild>
                        <Link href="/orders">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Batal
                        </Link>
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Spinner size="sm" className="mr-2" />
                                Menyimpan...
                            </>
                        ) : (
                            "Simpan Order"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}
