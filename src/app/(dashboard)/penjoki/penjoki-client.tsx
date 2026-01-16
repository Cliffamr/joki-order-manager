"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Plus, Pencil, Trash2, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { deletePenjoki } from "@/actions/users"

type Penjoki = {
    id: string
    name: string
    email: string
    createdAt: Date
    _count: {
        orders: number
    }
}

export function PenjokiClient({ penjokis }: { penjokis: Penjoki[] }) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedPenjoki, setSelectedPenjoki] = useState<Penjoki | null>(null)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleDelete = async () => {
        if (!selectedPenjoki) return

        startTransition(async () => {
            const result = await deletePenjoki(selectedPenjoki.id)
            if (result.error) {
                setError(result.error)
            } else {
                setDeleteDialogOpen(false)
                setSelectedPenjoki(null)
                setError(null)
            }
        })
    }

    const openDeleteDialog = (penjoki: Penjoki) => {
        setSelectedPenjoki(penjoki)
        setError(null)
        setDeleteDialogOpen(true)
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5" />
                        Daftar Penjoki ({penjokis.length})
                    </CardTitle>
                    <Link href="/penjoki/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Penjoki
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {penjokis.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Belum ada penjoki. Klik tombol &quot;Tambah Penjoki&quot; untuk menambahkan.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Orders</TableHead>
                                    <TableHead>Terdaftar</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {penjokis.map((penjoki) => (
                                    <TableRow key={penjoki.id}>
                                        <TableCell className="font-medium">{penjoki.name}</TableCell>
                                        <TableCell>{penjoki.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {penjoki._count.orders} order
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(penjoki.createdAt), "dd MMM yyyy", { locale: id })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/penjoki/${penjoki.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDeleteDialog(penjoki)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Penjoki</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus penjoki <strong>{selectedPenjoki?.name}</strong>?
                            Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    {error && (
                        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            {isPending ? "Menghapus..." : "Hapus"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
