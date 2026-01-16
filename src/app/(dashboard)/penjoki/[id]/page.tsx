import { notFound } from "next/navigation"
import { getPenjokiById } from "@/actions/users"
import { EditPenjokiForm } from "./edit-penjoki-form"

export default async function EditPenjokiPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const penjoki = await getPenjokiById(id)

    if (!penjoki) {
        notFound()
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Edit Penjoki</h1>
                <p className="text-muted-foreground">Ubah informasi penjoki</p>
            </div>

            <EditPenjokiForm penjoki={penjoki} />
        </div>
    )
}
