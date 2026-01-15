import { getFeeRules } from "@/actions/fee-rules"
import { FeeRulesClient } from "./fee-rules-client"

export default async function FeeRulesPage() {
    const rules = await getFeeRules()

    return <FeeRulesClient initialRules={rules} />
}
