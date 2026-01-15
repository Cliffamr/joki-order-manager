import { notFound } from "next/navigation"
import { getOrderById, getPenjokiList } from "@/actions/orders"
import { OrderDetailClient } from "./order-detail-client"

interface OrderDetailPageProps {
    params: { id: string }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
    const [order, penjokis] = await Promise.all([
        getOrderById(params.id),
        getPenjokiList(),
    ])

    if (!order) {
        notFound()
    }

    return <OrderDetailClient order={order} penjokis={penjokis} />
}
