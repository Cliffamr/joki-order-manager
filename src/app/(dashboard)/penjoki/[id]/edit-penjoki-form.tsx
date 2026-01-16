"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { updatePenjoki } from "@/actions/users"

type Penjoki = {
    id: string
    name: string
    email: string
    createdAt: Date
}

export function EditPenjokiForm({ penjoki }: { penjoki: Penjoki }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = await updatePenjoki(penjoki.id, formData)
            if (result.error) {
                setError(result.error)
            } else {
                router.push("/penjoki")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Penjoki</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Nama</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Masukkan nama penjoki"
                            defaultValue={penjoki.name}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Masukkan email penjoki"
                            defaultValue={penjoki.email}
                            required
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>Ganti Password</CardTitle>
                    <CardDescription>
                        Kosongkan jika tidak ingin mengubah password
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Password Baru</Label>
                        <PasswordInput
                            id="password"
                            name="password"
                            placeholder="Masukkan password baru"
                            minLength={6}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                        <PasswordInput
                            id="confirmPassword"
                            name="confirmPassword"
                            placeholder="Masukkan ulang password baru"
                            minLength={6}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
                <Link href="/penjoki">
                    <Button type="button" variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kembali
                    </Button>
                </Link>
                <Button type="submit" disabled={isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
            </div>
        </form>
    )
}
