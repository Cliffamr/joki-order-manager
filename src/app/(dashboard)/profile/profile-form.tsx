"use client"

import { useFormState, useFormStatus } from "react-dom"
import { updateProfile, ProfileState } from "@/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

const initialState: ProfileState = {}

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Perubahan
        </Button>
    )
}

export function ProfileForm({ user }: { user: { name: string; email: string } }) {
    const [state, formAction] = useFormState(updateProfile, initialState)
    const { toast } = useToast()

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.error ? "Gagal" : "Berhasil",
                description: state.message,
                variant: state.error ? "destructive" : "default",
            })
        }
    }, [state, toast])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Informasi Profil</CardTitle>
                <CardDescription>
                    Perbarui informasi profil dan password Anda.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Masukkan nama lengkap"
                            defaultValue={user.name}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Masukkan email"
                            defaultValue={user.email}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password Baru (Opsional)</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Biarkan kosong jika tidak ingin mengubah"
                        />
                        <p className="text-sm text-muted-foreground">
                            Minimal 6 karakter
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="Masukkan ulang password baru"
                        />
                    </div>

                    <div className="flex justify-end">
                        <SubmitButton />
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
