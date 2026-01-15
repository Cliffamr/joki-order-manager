import { getPayrollSummary } from "@/actions/payroll"
import { PayrollClient } from "./payroll-client"

export default async function PayrollPage() {
    const summary = await getPayrollSummary({})

    return <PayrollClient initialSummary={summary} />
}
