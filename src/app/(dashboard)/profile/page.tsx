import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ProfileForm } from "./profile-form"

export const metadata = {
    title: "Profil Saya",
}

export default async function ProfilePage() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        redirect("/login")
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            name: true,
            email: true,
        },
    })

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Profil</h2>
                <p className="text-muted-foreground">
                    Kelola informasi akun Anda
                </p>
            </div>
            <ProfileForm user={user} />
        </div>
    )
}
