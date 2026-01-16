import { NewPenjokiForm } from "./new-penjoki-form"

export default function NewPenjokiPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Tambah Penjoki Baru</h1>
                <p className="text-muted-foreground">Daftarkan penjoki baru ke dalam sistem</p>
            </div>

            <NewPenjokiForm />
        </div>
    )
}
