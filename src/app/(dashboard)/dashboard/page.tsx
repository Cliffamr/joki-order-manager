import { getDashboardStats, getOrderTrend, getOmzetPerJockey } from "@/actions/payroll"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
    const [stats, trend, omzetPerJockey] = await Promise.all([
        getDashboardStats({}),
        getOrderTrend(),
        getOmzetPerJockey({}),
    ])

    return (
        <DashboardClient
            initialStats={stats}
            initialTrend={trend}
            initialOmzetPerJockey={omzetPerJockey}
        />
    )
}
