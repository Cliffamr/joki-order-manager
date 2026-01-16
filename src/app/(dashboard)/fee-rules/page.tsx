import { getFeeRules } from "@/actions/fee-rules"
import { FeeRulesClient } from "./fee-rules-client"

export const dynamic = 'force-dynamic'

export default async function FeeRulesPage() {
    const rules = await getFeeRules()

    return <FeeRulesClient initialRules={rules} />
}
