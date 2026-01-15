import { getOrders } from "@/actions/orders"
import { MyOrdersClient } from "./my-orders-client"

export default async function MyOrdersPage() {
    const { orders, total } = await getOrders({})

    return <MyOrdersClient initialOrders={orders} initialTotal={total} />
}
