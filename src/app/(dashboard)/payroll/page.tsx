import { getPayrollSummary, getPayouts } from "@/actions/payroll"
import { PayrollClient } from "./payroll-client"

export const dynamic = 'force-dynamic'

export default async function PayrollPage() {
    const [summary, payouts] = await Promise.all([
        getPayrollSummary({}),
        getPayouts(),
    ])

    return <PayrollClient initialSummary={summary} initialPayouts={payouts} />
}
