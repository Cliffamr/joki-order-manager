"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const feeRuleSchema = z.object({
    minPrice: z.number().min(0, "Harga minimum tidak boleh negatif"),
    maxPrice: z.number().min(0, "Harga maksimum tidak boleh negatif"),
    feeType: z.enum(["FLAT", "PERCENT"]),
    feeValue: z.number().min(0, "Nilai fee tidak boleh negatif"),
}).refine((data) => data.maxPrice >= data.minPrice, {
    message: "Harga maksimum harus lebih besar atau sama dengan harga minimum",
    path: ["maxPrice"],
})

export async function getFeeRules() {
    const rules = await prisma.feeRule.findMany({
        orderBy: { minPrice: "asc" },
    })
    return rules
}

export async function createFeeRule(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const rawData = {
            minPrice: Number(formData.get("minPrice")),
            maxPrice: Number(formData.get("maxPrice")),
            feeType: formData.get("feeType") as "FLAT" | "PERCENT",
            feeValue: Number(formData.get("feeValue")),
        }

        const validated = feeRuleSchema.parse(rawData)

        // Check for overlapping ranges
        const overlapping = await prisma.feeRule.findFirst({
            where: {
                OR: [
                    {
                        AND: [
                            { minPrice: { lte: validated.minPrice } },
                            { maxPrice: { gte: validated.minPrice } },
                        ],
                    },
                    {
                        AND: [
                            { minPrice: { lte: validated.maxPrice } },
                            { maxPrice: { gte: validated.maxPrice } },
                        ],
                    },
                    {
                        AND: [
                            { minPrice: { gte: validated.minPrice } },
                            { maxPrice: { lte: validated.maxPrice } },
                        ],
                    },
                ],
            },
        })

        if (overlapping) {
            return { error: "Rentang harga overlap dengan rule yang sudah ada" }
        }

        await prisma.feeRule.create({
            data: validated,
        })

        revalidatePath("/fee-rules")
        return { success: true }
    } catch (error) {
        console.error("Create fee rule error:", error)
        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message }
        }
        return { error: "Gagal membuat fee rule" }
    }
}

export async function updateFeeRule(id: string, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const rawData = {
            minPrice: Number(formData.get("minPrice")),
            maxPrice: Number(formData.get("maxPrice")),
            feeType: formData.get("feeType") as "FLAT" | "PERCENT",
            feeValue: Number(formData.get("feeValue")),
        }

        const validated = feeRuleSchema.parse(rawData)

        // Check for overlapping ranges (excluding current rule)
        const overlapping = await prisma.feeRule.findFirst({
            where: {
                id: { not: id },
                OR: [
                    {
                        AND: [
                            { minPrice: { lte: validated.minPrice } },
                            { maxPrice: { gte: validated.minPrice } },
                        ],
                    },
                    {
                        AND: [
                            { minPrice: { lte: validated.maxPrice } },
                            { maxPrice: { gte: validated.maxPrice } },
                        ],
                    },
                    {
                        AND: [
                            { minPrice: { gte: validated.minPrice } },
                            { maxPrice: { lte: validated.maxPrice } },
                        ],
                    },
                ],
            },
        })

        if (overlapping) {
            return { error: "Rentang harga overlap dengan rule yang sudah ada" }
        }

        await prisma.feeRule.update({
            where: { id },
            data: validated,
        })

        revalidatePath("/fee-rules")
        return { success: true }
    } catch (error) {
        console.error("Update fee rule error:", error)
        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message }
        }
        return { error: "Gagal mengupdate fee rule" }
    }
}

export async function deleteFeeRule(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.feeRule.delete({ where: { id } })
        revalidatePath("/fee-rules")
        return { success: true }
    } catch (error) {
        console.error("Delete fee rule error:", error)
        return { error: "Gagal menghapus fee rule" }
    }
}

export async function simulateFee(price: number) {
    const rule = await prisma.feeRule.findFirst({
        where: {
            minPrice: { lte: price },
            maxPrice: { gte: price },
        },
    })

    if (!rule) {
        return { feeAdmin: 0, netJockey: price, rule: null }
    }

    let feeAdmin: number
    if (rule.feeType === "FLAT") {
        feeAdmin = rule.feeValue
    } else {
        feeAdmin = Math.round((price * rule.feeValue) / 100)
    }

    return { feeAdmin, netJockey: price - feeAdmin, rule }
}
