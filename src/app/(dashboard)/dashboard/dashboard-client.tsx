"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    ClipboardList,
    DollarSign,
    TrendingUp,
    CheckCircle,
    Clock,
    CreditCard,
    Calendar,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"
import { getDashboardStats, getOrderTrend, getOmzetPerJockey } from "@/actions/payroll"

interface DashboardStats {
    totalOrdersToday: number
    totalOrdersWeek: number
    totalOrdersMonth: number
    totalOrders: number
    omzetGross: number
    totalFeeAdmin: number
    totalNet: number
    totalPaid: number
    activeOrders: number
    doneOrders: number
    paymentStatusCounts: {
        UNPAID: number
        DP: number
        PAID: number
    }
}

interface TrendData {
    date: string
    count: number
    revenue: number
}

interface OmzetData {
    name: string
    omzet: number
    orders: number
}

interface DashboardClientProps {
    initialStats: DashboardStats | null
    initialTrend: TrendData[]
    initialOmzetPerJockey: OmzetData[]
}

const PAYMENT_COLORS = {
    UNPAID: "#ef4444",
    DP: "#eab308",
    PAID: "#22c55e",
}

const BAR_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6"]

export function DashboardClient({
    initialStats,
    initialTrend,
    initialOmzetPerJockey,
}: DashboardClientProps) {
    const [stats, setStats] = useState(initialStats)
    const [trend, setTrend] = useState(initialTrend)
    const [omzetPerJockey, setOmzetPerJockey] = useState(initialOmzetPerJockey)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleFilter = async () => {
        setIsLoading(true)
        try {
            const [newStats, newTrend, newOmzet] = await Promise.all([
                getDashboardStats({ startDate, endDate }),
                getOrderTrend(),
                getOmzetPerJockey({ startDate, endDate }),
            ])
            setStats(newStats)
            setTrend(newTrend)
            setOmzetPerJockey(newOmzet)
        } finally {
            setIsLoading(false)
        }
    }

    const paymentPieData = stats
        ? [
            { name: "Belum Bayar", value: stats.paymentStatusCounts.UNPAID, color: PAYMENT_COLORS.UNPAID },
            { name: "DP", value: stats.paymentStatusCounts.DP, color: PAYMENT_COLORS.DP },
            { name: "Lunas", value: stats.paymentStatusCounts.PAID, color: PAYMENT_COLORS.PAID },
        ]
        : []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Ringkasan performa order joki</p>
                </div>

                {/* Date Filter */}
                <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Dari</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-9 w-36"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Sampai</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-9 w-36"
                        />
                    </div>
                    <Button onClick={handleFilter} disabled={isLoading} size="sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        Filter
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Hari Ini</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalOrdersToday || 0}</div>
                        <p className="text-xs text-muted-foreground">order baru</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Minggu Ini</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalOrdersWeek || 0}</div>
                        <p className="text-xs text-muted-foreground">order</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Bulan Ini</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalOrdersMonth || 0}</div>
                        <p className="text-xs text-muted-foreground">order</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Omzet Gross</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats?.omzetGross || 0)}</div>
                        <p className="text-xs text-muted-foreground">total pendapatan</p>
                    </CardContent>
                </Card>
            </div>

            {/* Second Row KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-950">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Fee Admin</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(stats?.totalFeeAdmin || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-950">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Net Penjoki</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(stats?.totalNet || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Aktif</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.activeOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">order dalam proses</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Selesai</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.doneOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">order selesai</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart - Order Trend */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Tren Order (30 Hari Terakhir)</CardTitle>
                        <CardDescription>Jumlah order per hari</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value) => {
                                            const date = new Date(value)
                                            return `${date.getDate()}/${date.getMonth() + 1}`
                                        }}
                                        fontSize={12}
                                    />
                                    <YAxis fontSize={12} />
                                    <Tooltip
                                        labelFormatter={(value) => new Date(value).toLocaleDateString("id-ID")}
                                        formatter={(value: number, name: string) => [
                                            name === "count" ? value : formatCurrency(value),
                                            name === "count" ? "Order" : "Revenue",
                                        ]}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        name="Jumlah Order"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Bar Chart - Omzet per Penjoki */}
                <Card>
                    <CardHeader>
                        <CardTitle>Omzet per Penjoki</CardTitle>
                        <CardDescription>Total pendapatan masing-masing penjoki</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={omzetPerJockey} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={10} />
                                    <YAxis dataKey="name" type="category" fontSize={12} width={100} />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Bar dataKey="omzet" name="Omzet">
                                        {omzetPerJockey.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Pie Chart - Payment Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Status Pembayaran</CardTitle>
                        <CardDescription>Distribusi status pembayaran order</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {paymentPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Stats Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Ringkasan Pembayaran
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
                            <p className="text-2xl font-bold text-red-600">{stats?.paymentStatusCounts.UNPAID || 0}</p>
                            <p className="text-sm text-muted-foreground">Belum Bayar</p>
                        </div>
                        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                            <p className="text-2xl font-bold text-yellow-600">{stats?.paymentStatusCounts.DP || 0}</p>
                            <p className="text-sm text-muted-foreground">DP</p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                            <p className="text-2xl font-bold text-green-600">{stats?.paymentStatusCounts.PAID || 0}</p>
                            <p className="text-sm text-muted-foreground">Lunas</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
