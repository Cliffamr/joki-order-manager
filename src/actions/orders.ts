"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { syncOrderToSheet } from "@/lib/google-sheets"

// Schemas
const orderSchema = z.object({
    customerNumber: z.string().min(1, "Nomor customer wajib diisi"),
    jobType: z.string().min(1, "Jenis pekerjaan wajib diisi"),
    price: z.number().min(1, "Harga harus lebih dari 0"),
    jockeyId: z.string().min(1, "Penjoki wajib dipilih"),
    paymentStatus: z.enum(["UNPAID", "DP", "PAID"]).optional(),
    workStatus: z.enum(["NEW", "IN_PROGRESS", "REVISION", "DONE", "DELIVERED", "CANCELED"]).optional(),
    paidAmount: z.number().min(0).optional(),
    dueDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
})

// Helper to calculate fee
async function calculateFee(price: number): Promise<{ feeAdmin: number; netJockey: number }> {
    const rule = await prisma.feeRule.findFirst({
        where: {
            minPrice: { lte: price },
            maxPrice: { gte: price },
        },
    })

    if (!rule) {
        return { feeAdmin: 0, netJockey: price }
    }

    let feeAdmin: number
    if (rule.feeType === "FLAT") {
        feeAdmin = rule.feeValue
    } else {
        feeAdmin = Math.round((price * rule.feeValue) / 100)
    }

    return { feeAdmin, netJockey: price - feeAdmin }
}

// Generate order code
async function generateOrderCode(): Promise<string> {
    const year = new Date().getFullYear()
    const lastOrder = await prisma.order.findFirst({
        where: {
            orderCode: { startsWith: `JK-${year}-` },
        },
        orderBy: { orderCode: "desc" },
    })

    let nextNumber = 1
    if (lastOrder) {
        const lastNumber = parseInt(lastOrder.orderCode.split("-")[2])
        nextNumber = lastNumber + 1
    }

    return `JK-${year}-${nextNumber.toString().padStart(6, "0")}`
}

// Create audit log
async function createAuditLog(
    orderId: string,
    userId: string,
    action: string,
    field?: string,
    oldValue?: string,
    newValue?: string
) {
    await prisma.auditLog.create({
        data: {
            orderId,
            userId,
            action,
            field,
            oldValue,
            newValue,
        },
    })
}

// Create Order
export async function createOrder(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const rawData = {
            customerNumber: formData.get("customerNumber") as string,
            jobType: formData.get("jobType") as string,
            price: Number(formData.get("price")),
            jockeyId: formData.get("jockeyId") as string,
            paidAmount: Number(formData.get("paidAmount") || 0),
            dueDate: formData.get("dueDate") as string || null,
            notes: formData.get("notes") as string || null,
        }

        const validated = orderSchema.parse(rawData)
        const orderCode = await generateOrderCode()
        const { feeAdmin, netJockey } = await calculateFee(validated.price)

        const order = await prisma.order.create({
            data: {
                orderCode,
                customerNumber: validated.customerNumber,
                jobType: validated.jobType,
                price: validated.price,
                jockeyId: validated.jockeyId,
                paidAmount: validated.paidAmount || 0,
                dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
                notes: validated.notes,
                feeAdmin,
                netJockey,
                paymentStatus: validated.paidAmount && validated.paidAmount >= validated.price ? "PAID" : validated.paidAmount && validated.paidAmount > 0 ? "DP" : "UNPAID",
            },
            include: { jockey: true },
        })

        await createAuditLog(order.id, session.user.id, "CREATE")

        // Sync to Google Sheets
        try {
            await syncOrderToSheet(order)
        } catch (e) {
            console.error("Failed to sync to Google Sheets:", e)
        }

        revalidatePath("/orders")
        return { success: true, order }
    } catch (error) {
        console.error("Create order error:", error)
        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message }
        }
        return { error: "Gagal membuat order" }
    }
}

// Update Order
export async function updateOrder(id: string, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return { error: "Unauthorized" }
    }

    try {
        const existingOrder = await prisma.order.findUnique({ where: { id } })
        if (!existingOrder) {
            return { error: "Order tidak ditemukan" }
        }

        // Penjoki can only update workStatus and notes
        const isPenjoki = session.user.role === "PENJOKI"
        if (isPenjoki && existingOrder.jockeyId !== session.user.id) {
            return { error: "Unauthorized" }
        }

        let updateData: Record<string, unknown> = {}
        const auditLogs: { field: string; oldValue: string; newValue: string }[] = []

        if (isPenjoki) {
            const workStatus = formData.get("workStatus") as string
            const notes = formData.get("notes") as string

            if (workStatus && workStatus !== existingOrder.workStatus) {
                updateData.workStatus = workStatus
                auditLogs.push({
                    field: "workStatus",
                    oldValue: existingOrder.workStatus,
                    newValue: workStatus,
                })
            }
            if (notes !== undefined) {
                updateData.notes = notes
            }
        } else {
            // Admin can update everything
            const rawData = {
                customerNumber: formData.get("customerNumber") as string,
                jobType: formData.get("jobType") as string,
                price: Number(formData.get("price")),
                jockeyId: formData.get("jockeyId") as string,
                paymentStatus: formData.get("paymentStatus") as string,
                workStatus: formData.get("workStatus") as string,
                paidAmount: Number(formData.get("paidAmount") || 0),
                dueDate: formData.get("dueDate") as string || null,
                notes: formData.get("notes") as string || null,
            }

            // Recalculate fee if price changed
            let feeAdmin = existingOrder.feeAdmin
            let netJockey = existingOrder.netJockey
            if (rawData.price !== existingOrder.price) {
                const feeCalc = await calculateFee(rawData.price)
                feeAdmin = feeCalc.feeAdmin
                netJockey = feeCalc.netJockey
                auditLogs.push({
                    field: "price",
                    oldValue: existingOrder.price.toString(),
                    newValue: rawData.price.toString(),
                })
            }

            if (rawData.paymentStatus !== existingOrder.paymentStatus) {
                auditLogs.push({
                    field: "paymentStatus",
                    oldValue: existingOrder.paymentStatus,
                    newValue: rawData.paymentStatus,
                })
            }

            if (rawData.workStatus !== existingOrder.workStatus) {
                auditLogs.push({
                    field: "workStatus",
                    oldValue: existingOrder.workStatus,
                    newValue: rawData.workStatus,
                })
            }

            updateData = {
                customerNumber: rawData.customerNumber,
                jobType: rawData.jobType,
                price: rawData.price,
                jockeyId: rawData.jockeyId,
                paymentStatus: rawData.paymentStatus,
                workStatus: rawData.workStatus,
                paidAmount: rawData.paidAmount,
                dueDate: rawData.dueDate ? new Date(rawData.dueDate) : null,
                notes: rawData.notes,
                feeAdmin,
                netJockey,
            }
        }

        const order = await prisma.order.update({
            where: { id },
            data: updateData,
            include: { jockey: true },
        })

        // Create audit logs
        for (const log of auditLogs) {
            await createAuditLog(order.id, session.user.id, "UPDATE", log.field, log.oldValue, log.newValue)
        }

        // Sync to Google Sheets
        try {
            await syncOrderToSheet(order)
        } catch (e) {
            console.error("Failed to sync to Google Sheets:", e)
        }

        revalidatePath("/orders")
        revalidatePath(`/orders/${id}`)
        revalidatePath("/my-orders")
        return { success: true, order }
    } catch (error) {
        console.error("Update order error:", error)
        return { error: "Gagal mengupdate order" }
    }
}

// Delete Order
export async function deleteOrder(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.order.delete({ where: { id } })
        revalidatePath("/orders")
        return { success: true }
    } catch (error) {
        console.error("Delete order error:", error)
        return { error: "Gagal menghapus order" }
    }
}

// Quick actions
export async function markOrderPaid(id: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        const order = await prisma.order.findUnique({ where: { id } })
        if (!order) return { error: "Order tidak ditemukan" }

        const updated = await prisma.order.update({
            where: { id },
            data: {
                paymentStatus: "PAID",
                paidAmount: order.price
            },
            include: { jockey: true },
        })

        await createAuditLog(id, session.user.id, "UPDATE", "paymentStatus", order.paymentStatus, "PAID")

        try {
            await syncOrderToSheet(updated)
        } catch (e) {
            console.error("Failed to sync to Google Sheets:", e)
        }

        revalidatePath("/orders")
        return { success: true }
    } catch (error) {
        console.error("Mark paid error:", error)
        return { error: "Gagal mengupdate status" }
    }
}

export async function markOrderDone(id: string) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        const order = await prisma.order.findUnique({ where: { id } })
        if (!order) return { error: "Order tidak ditemukan" }

        // Penjoki can only update their own orders
        if (session.user.role === "PENJOKI" && order.jockeyId !== session.user.id) {
            return { error: "Unauthorized" }
        }

        const updated = await prisma.order.update({
            where: { id },
            data: { workStatus: "DONE" },
            include: { jockey: true },
        })

        await createAuditLog(id, session.user.id, "UPDATE", "workStatus", order.workStatus, "DONE")

        try {
            await syncOrderToSheet(updated)
        } catch (e) {
            console.error("Failed to sync to Google Sheets:", e)
        }

        revalidatePath("/orders")
        revalidatePath("/my-orders")
        return { success: true }
    } catch (error) {
        console.error("Mark done error:", error)
        return { error: "Gagal mengupdate status" }
    }
}

// Get orders with filters
export async function getOrders(params: {
    search?: string
    jockeyId?: string
    paymentStatus?: string
    workStatus?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { orders: [], total: 0 }

    const where: Record<string, unknown> = {}

    // Penjoki can only see their orders
    if (session.user.role === "PENJOKI") {
        where.jockeyId = session.user.id
    } else if (params.jockeyId) {
        where.jockeyId = params.jockeyId
    }

    if (params.search) {
        where.OR = [
            { orderCode: { contains: params.search, mode: "insensitive" } },
            { customerNumber: { contains: params.search, mode: "insensitive" } },
            { jobType: { contains: params.search, mode: "insensitive" } },
        ]
    }

    if (params.paymentStatus) {
        where.paymentStatus = params.paymentStatus
    }

    if (params.workStatus) {
        where.workStatus = params.workStatus
    }

    if (params.startDate || params.endDate) {
        where.createdAt = {}
        if (params.startDate) {
            (where.createdAt as Record<string, Date>).gte = new Date(params.startDate)
        }
        if (params.endDate) {
            (where.createdAt as Record<string, Date>).lte = new Date(params.endDate)
        }
    }

    const page = params.page || 1
    const limit = params.limit || 20

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: { jockey: true },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.order.count({ where }),
    ])

    return { orders, total }
}

// Get single order
export async function getOrderById(id: string) {
    const session = await getServerSession(authOptions)
    if (!session) return null

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            jockey: true,
            auditLogs: {
                include: { user: true },
                orderBy: { createdAt: "desc" },
            },
        },
    })

    if (!order) return null

    // Penjoki can only see their orders
    if (session.user.role === "PENJOKI" && order.jockeyId !== session.user.id) {
        return null
    }

    return order
}

// Get all penjoki users
export async function getPenjokiList() {
    const users = await prisma.user.findMany({
        where: { role: "PENJOKI" },
        select: { id: true, name: true, email: true },
    })
    return users
}
