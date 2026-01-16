"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function getPayrollSummary(params: {
    startDate?: string
    endDate?: string
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return []
    }

    const where: Record<string, unknown> = {
        workStatus: { in: ["DONE", "DELIVERED"] },
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

    const penjokis = await prisma.user.findMany({
        where: { role: "PENJOKI" },
        include: {
            orders: {
                where,
            },
        },
    })

    const summary = penjokis.map((penjoki) => {
        const totalOrders = penjoki.orders.length
        const totalGross = penjoki.orders.reduce((sum, order) => sum + order.price, 0)
        const totalFee = penjoki.orders.reduce((sum, order) => sum + order.feeAdmin, 0)
        const totalNet = penjoki.orders.reduce((sum, order) => sum + order.netJockey, 0)

        return {
            id: penjoki.id,
            name: penjoki.name,
            email: penjoki.email,
            totalOrders,
            totalGross,
            totalFee,
            totalNet,
        }
    })

    return summary
}

export async function getJockeyPayrollDetail(jockeyId: string, params: {
    startDate?: string
    endDate?: string
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return null
    }

    const where: Record<string, unknown> = {
        jockeyId,
        workStatus: { in: ["DONE", "DELIVERED"] },
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

    const [jockey, orders] = await Promise.all([
        prisma.user.findUnique({
            where: { id: jockeyId },
            select: { id: true, name: true, email: true },
        }),
        prisma.order.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }),
    ])

    if (!jockey) return null

    const totalGross = orders.reduce((sum, order) => sum + order.price, 0)
    const totalFee = orders.reduce((sum, order) => sum + order.feeAdmin, 0)
    const totalNet = orders.reduce((sum, order) => sum + order.netJockey, 0)

    return {
        jockey,
        orders,
        summary: {
            totalOrders: orders.length,
            totalGross,
            totalFee,
            totalNet,
        },
    }
}

// Dashboard stats
export async function getDashboardStats(params: {
    startDate?: string
    endDate?: string
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return null
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const dateFilter: Record<string, unknown> = {}
    if (params.startDate || params.endDate) {
        if (params.startDate) {
            dateFilter.gte = new Date(params.startDate)
        }
        if (params.endDate) {
            dateFilter.lte = new Date(params.endDate)
        }
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0

    const [
        totalOrdersToday,
        totalOrdersWeek,
        totalOrdersMonth,
        allOrders,
        filteredOrders,
    ] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
        prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.order.findMany({
            select: {
                price: true,
                feeAdmin: true,
                netJockey: true,
                paymentStatus: true,
                workStatus: true,
                paidAmount: true,
            },
        }),
        hasDateFilter
            ? prisma.order.findMany({
                where: { createdAt: dateFilter },
                select: {
                    price: true,
                    feeAdmin: true,
                    netJockey: true,
                    paymentStatus: true,
                    workStatus: true,
                    paidAmount: true,
                },
            })
            : null,
    ])

    const ordersToAnalyze = filteredOrders || allOrders

    const omzetGross = ordersToAnalyze.reduce((sum, o) => sum + o.price, 0)
    const totalFeeAdmin = ordersToAnalyze.reduce((sum, o) => sum + o.feeAdmin, 0)
    const totalNet = ordersToAnalyze.reduce((sum, o) => sum + o.netJockey, 0)
    const totalPaid = ordersToAnalyze.reduce((sum, o) => sum + o.paidAmount, 0)

    const activeOrders = ordersToAnalyze.filter(
        (o) => !["DONE", "DELIVERED", "CANCELED"].includes(o.workStatus)
    ).length
    const doneOrders = ordersToAnalyze.filter(
        (o) => ["DONE", "DELIVERED"].includes(o.workStatus)
    ).length

    const paymentStatusCounts = {
        UNPAID: ordersToAnalyze.filter((o) => o.paymentStatus === "UNPAID").length,
        DP: ordersToAnalyze.filter((o) => o.paymentStatus === "DP").length,
        PAID: ordersToAnalyze.filter((o) => o.paymentStatus === "PAID").length,
    }

    return {
        totalOrdersToday,
        totalOrdersWeek,
        totalOrdersMonth,
        totalOrders: ordersToAnalyze.length,
        omzetGross,
        totalFeeAdmin,
        totalNet,
        totalPaid,
        activeOrders,
        doneOrders,
        paymentStatusCounts,
    }
}

// Order trend for last 30 days
export async function getOrderTrend() {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return []
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const orders = await prisma.order.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, price: true },
    })

    // Group by date
    const dailyData: Record<string, { count: number; revenue: number }> = {}

    for (let i = 0; i < 30; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split("T")[0]
        dailyData[dateStr] = { count: 0, revenue: 0 }
    }

    orders.forEach((order) => {
        const dateStr = order.createdAt.toISOString().split("T")[0]
        if (dailyData[dateStr]) {
            dailyData[dateStr].count++
            dailyData[dateStr].revenue += order.price
        }
    })

    return Object.entries(dailyData)
        .map(([date, data]) => ({
            date,
            count: data.count,
            revenue: data.revenue,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
}

// Omzet per penjoki
export async function getOmzetPerJockey(params: {
    startDate?: string
    endDate?: string
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return []
    }

    const where: Record<string, unknown> = {}
    if (params.startDate || params.endDate) {
        where.createdAt = {}
        if (params.startDate) {
            (where.createdAt as Record<string, Date>).gte = new Date(params.startDate)
        }
        if (params.endDate) {
            (where.createdAt as Record<string, Date>).lte = new Date(params.endDate)
        }
    }

    const penjokis = await prisma.user.findMany({
        where: { role: "PENJOKI" },
        include: {
            orders: { where },
        },
    })

    return penjokis.map((penjoki) => ({
        name: penjoki.name,
        omzet: penjoki.orders.reduce((sum, order) => sum + order.price, 0),
        orders: penjoki.orders.length,
    }))
}

// ============= PAYOUT MANAGEMENT =============

export async function createPayout(data: {
    jockeyId: string
    periodStart: string
    periodEnd: string
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const startDate = new Date(data.periodStart)
        const endDate = new Date(data.periodEnd)

        // Get orders for this jockey in the period
        const orders = await prisma.order.findMany({
            where: {
                jockeyId: data.jockeyId,
                workStatus: { in: ["DONE", "DELIVERED"] },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        })

        if (orders.length === 0) {
            return { success: false, error: "Tidak ada order selesai dalam periode ini" }
        }

        const totalGross = orders.reduce((sum, order) => sum + order.price, 0)
        const totalFee = orders.reduce((sum, order) => sum + order.feeAdmin, 0)
        const totalNet = orders.reduce((sum, order) => sum + order.netJockey, 0)

        // Check if payout already exists for this period
        const existing = await prisma.payout.findFirst({
            where: {
                jockeyId: data.jockeyId,
                periodStart: startDate,
                periodEnd: endDate,
            },
        })

        if (existing) {
            return { success: false, error: "Payout untuk periode ini sudah ada" }
        }

        const payout = await prisma.payout.create({
            data: {
                jockeyId: data.jockeyId,
                periodStart: startDate,
                periodEnd: endDate,
                totalGross,
                totalFee,
                totalNet,
                status: "UNPAID",
            },
        })

        return { success: true, payout }
    } catch (error) {
        console.error("Create payout error:", error)
        return { success: false, error: "Gagal membuat payout" }
    }
}

export async function getPayouts(params?: {
    jockeyId?: string
    status?: "UNPAID" | "PAID"
}) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return []
    }

    const where: Record<string, unknown> = {}
    if (params?.jockeyId) {
        where.jockeyId = params.jockeyId
    }
    if (params?.status) {
        where.status = params.status
    }

    const payouts = await prisma.payout.findMany({
        where,
        include: {
            jockey: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: { createdAt: "desc" },
    })

    return payouts
}

export async function updatePayoutStatus(payoutId: string, status: "UNPAID" | "PAID") {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const payout = await prisma.payout.update({
            where: { id: payoutId },
            data: { status },
        })

        return { success: true, payout }
    } catch (error) {
        console.error("Update payout status error:", error)
        return { success: false, error: "Gagal mengubah status payout" }
    }
}

export async function deletePayout(payoutId: string) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.payout.delete({
            where: { id: payoutId },
        })

        return { success: true }
    } catch (error) {
        console.error("Delete payout error:", error)
        return { success: false, error: "Gagal menghapus payout" }
    }
}
