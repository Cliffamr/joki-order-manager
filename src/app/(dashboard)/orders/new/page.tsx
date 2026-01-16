import { getPenjokiList } from "@/actions/orders"
import { NewOrderForm } from "./new-order-form"

export const dynamic = 'force-dynamic'

export default async function NewOrderPage() {
    const penjokis = await getPenjokiList()

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Order Baru</h1>
                <p className="text-muted-foreground">Buat order joki baru</p>
            </div>

            <NewOrderForm penjokis={penjokis} />
        </div>
    )
}
