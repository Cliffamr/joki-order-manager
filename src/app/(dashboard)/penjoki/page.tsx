import { getPenjokiList } from "@/actions/users"
import { PenjokiClient } from "./penjoki-client"

export default async function PenjokiPage() {
    const penjokis = await getPenjokiList()

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Kelola Penjoki</h1>
                    <p className="text-muted-foreground">Tambah, edit, dan hapus penjoki</p>
                </div>
            </div>

            <PenjokiClient penjokis={penjokis} />
        </div>
    )
}
