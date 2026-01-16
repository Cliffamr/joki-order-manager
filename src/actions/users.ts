"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"

// Schemas
const createPenjokiSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
})

const updatePenjokiSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
}).refine((data) => {
    if (data.password && data.password !== data.confirmPassword) {
        return false
    }
    return true
}, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
})

// Get all penjoki users
export async function getPenjokiList() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return []
    }

    const users = await prisma.user.findMany({
        where: { role: "PENJOKI" },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
                select: { orders: true }
            }
        },
        orderBy: { createdAt: "desc" },
    })
    return users
}

// Get single penjoki by ID
export async function getPenjokiById(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return null
    }

    const user = await prisma.user.findUnique({
        where: { id, role: "PENJOKI" },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
        },
    })
    return user
}

// Create Penjoki
export async function createPenjoki(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const rawData = {
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            confirmPassword: formData.get("confirmPassword") as string,
        }

        const validated = createPenjokiSchema.parse(rawData)

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: validated.email },
        })
        if (existingUser) {
            return { error: "Email sudah digunakan" }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validated.password, 10)

        const user = await prisma.user.create({
            data: {
                name: validated.name,
                email: validated.email,
                password: hashedPassword,
                role: "PENJOKI",
            },
        })

        revalidatePath("/penjoki")
        return { success: true, user: { id: user.id, name: user.name, email: user.email } }
    } catch (error) {
        console.error("Create penjoki error:", error)
        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message }
        }
        return { error: "Gagal membuat penjoki" }
    }
}

// Update Penjoki
export async function updatePenjoki(id: string, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { id, role: "PENJOKI" },
        })
        if (!existingUser) {
            return { error: "Penjoki tidak ditemukan" }
        }

        const rawData = {
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            password: (formData.get("password") as string) || "",
            confirmPassword: (formData.get("confirmPassword") as string) || "",
        }

        const validated = updatePenjokiSchema.parse(rawData)

        // Check if email is used by another user
        if (validated.email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email: validated.email },
            })
            if (emailExists) {
                return { error: "Email sudah digunakan oleh user lain" }
            }
        }

        // Prepare update data
        const updateData: { name: string; email: string; password?: string } = {
            name: validated.name,
            email: validated.email,
        }

        // Only update password if provided
        if (validated.password) {
            updateData.password = await bcrypt.hash(validated.password, 10)
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
        })

        revalidatePath("/penjoki")
        revalidatePath(`/penjoki/${id}`)
        return { success: true, user: { id: user.id, name: user.name, email: user.email } }
    } catch (error) {
        console.error("Update penjoki error:", error)
        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message }
        }
        return { error: "Gagal mengupdate penjoki" }
    }
}

// Delete Penjoki
export async function deletePenjoki(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id, role: "PENJOKI" },
            include: { _count: { select: { orders: true } } },
        })

        if (!user) {
            return { error: "Penjoki tidak ditemukan" }
        }

        if (user._count.orders > 0) {
            return { error: `Tidak dapat menghapus penjoki yang memiliki ${user._count.orders} order` }
        }

        await prisma.user.delete({ where: { id } })
        revalidatePath("/penjoki")
        return { success: true }
    } catch (error) {
        console.error("Delete penjoki error:", error)
        return { error: "Gagal menghapus penjoki" }
    }
}
