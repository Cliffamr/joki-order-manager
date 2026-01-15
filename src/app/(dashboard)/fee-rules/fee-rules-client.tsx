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
import { Plus, Edit, Trash, Calculator, Percent, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { createFeeRule, updateFeeRule, deleteFeeRule, simulateFee, getFeeRules } from "@/actions/fee-rules"
import { Spinner } from "@/components/ui/spinner"

interface FeeRule {
    id: string
    minPrice: number
    maxPrice: number
    feeType: "FLAT" | "PERCENT"
    feeValue: number
}

interface FeeRulesClientProps {
    initialRules: FeeRule[]
}

export function FeeRulesClient({ initialRules }: FeeRulesClientProps) {
    const [isPending, startTransition] = useTransition()
    const [rules, setRules] = useState(initialRules)
    const [showDialog, setShowDialog] = useState(false)
    const [editingRule, setEditingRule] = useState<FeeRule | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        minPrice: 0,
        maxPrice: 0,
        feeType: "FLAT" as "FLAT" | "PERCENT",
        feeValue: 0,
    })

    // Simulator state
    const [simPrice, setSimPrice] = useState(0)
    const [simResult, setSimResult] = useState<{ feeAdmin: number; netJockey: number } | null>(null)

    const resetForm = () => {
        setFormData({ minPrice: 0, maxPrice: 0, feeType: "FLAT", feeValue: 0 })
        setEditingRule(null)
        setError(null)
    }

    const handleOpenDialog = (rule?: FeeRule) => {
        if (rule) {
            setEditingRule(rule)
            setFormData({
                minPrice: rule.minPrice,
                maxPrice: rule.maxPrice,
                feeType: rule.feeType,
                feeValue: rule.feeValue,
            })
        } else {
            resetForm()
        }
        setShowDialog(true)
    }

    const handleSave = () => {
        startTransition(async () => {
            const form = new FormData()
            form.append("minPrice", formData.minPrice.toString())
            form.append("maxPrice", formData.maxPrice.toString())
            form.append("feeType", formData.feeType)
            form.append("feeValue", formData.feeValue.toString())

            const result = editingRule
                ? await updateFeeRule(editingRule.id, form)
                : await createFeeRule(form)

            if (result.error) {
                setError(result.error)
            } else {
                setShowDialog(false)
                resetForm()
                const updated = await getFeeRules()
                setRules(updated)
            }
        })
    }

    const handleDelete = (id: string) => {
        startTransition(async () => {
            await deleteFeeRule(id)
            const updated = await getFeeRules()
            setRules(updated)
        })
    }

    const handleSimulate = () => {
        startTransition(async () => {
            const result = await simulateFee(simPrice)
            setSimResult(result)
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Fee Admin Rules</h1>
                    <p className="text-muted-foreground">Atur fee admin berdasarkan rentang harga</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Rule
                </Button>
            </div>

            {/* Rules Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rentang Harga</TableHead>
                            <TableHead>Tipe Fee</TableHead>
                            <TableHead>Nilai Fee</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    Belum ada fee rule. Klik &quot;Tambah Rule&quot; untuk membuat.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell>
                                        {formatCurrency(rule.minPrice)} - {formatCurrency(rule.maxPrice)}
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-1">
                                            {rule.feeType === "FLAT" ? (
                                                <DollarSign className="h-4 w-4" />
                                            ) : (
                                                <Percent className="h-4 w-4" />
                                            )}
                                            {rule.feeType === "FLAT" ? "Flat" : "Persen"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {rule.feeType === "FLAT" ? formatCurrency(rule.feeValue) : `${rule.feeValue}%`}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(rule.id)}
                                                disabled={isPending}
                                            >
                                                <Trash className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Fee Simulator */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Simulasi Fee
                    </CardTitle>
                    <CardDescription>Hitung fee admin dan net penjoki berdasarkan harga</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Label>Harga Order</Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    type="number"
                                    placeholder="Masukkan harga..."
                                    value={simPrice || ""}
                                    onChange={(e) => setSimPrice(parseInt(e.target.value) || 0)}
                                />
                                <Button onClick={handleSimulate} disabled={isPending || simPrice <= 0}>
                                    Hitung
                                </Button>
                            </div>
                        </div>
                        {simResult && (
                            <div className="flex-1 p-4 rounded-lg bg-muted">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Harga</p>
                                        <p className="font-bold">{formatCurrency(simPrice)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fee Admin</p>
                                        <p className="font-bold text-blue-600">{formatCurrency(simResult.feeAdmin)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Net Penjoki</p>
                                        <p className="font-bold text-green-600">{formatCurrency(simResult.netJockey)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRule ? "Edit Fee Rule" : "Tambah Fee Rule"}</DialogTitle>
                    </DialogHeader>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Harga Minimum</Label>
                                <Input
                                    type="number"
                                    value={formData.minPrice}
                                    onChange={(e) => setFormData({ ...formData, minPrice: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Harga Maksimum</Label>
                                <Input
                                    type="number"
                                    value={formData.maxPrice}
                                    onChange={(e) => setFormData({ ...formData, maxPrice: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Tipe Fee</Label>
                            <Select
                                value={formData.feeType}
                                onValueChange={(value: "FLAT" | "PERCENT") =>
                                    setFormData({ ...formData, feeType: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FLAT">Flat (Nominal)</SelectItem>
                                    <SelectItem value="PERCENT">Persen (%)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Nilai Fee {formData.feeType === "PERCENT" ? "(%)" : "(Rp)"}</Label>
                            <Input
                                type="number"
                                value={formData.feeValue}
                                onChange={(e) => setFormData({ ...formData, feeValue: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleSave} disabled={isPending}>
                            {isPending ? <Spinner size="sm" className="mr-2" /> : null}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
