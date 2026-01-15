import { getOrders, getPenjokiList } from "@/actions/orders"
import { OrdersClient } from "./orders-client"

export default async function OrdersPage() {
    const [ordersData, penjokis] = await Promise.all([
        getOrders({}),
        getPenjokiList(),
    ])

    return (
        <OrdersClient
            initialOrders={ordersData.orders}
            initialTotal={ordersData.total}
            penjokis={penjokis}
        />
    )
}
