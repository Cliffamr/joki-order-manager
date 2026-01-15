# Joki Order Manager

Aplikasi untuk mengelola order joki dengan fitur dashboard, manajemen order, fee admin, dan rekap gaji penjoki.

## Fitur

- **Dashboard** - KPI cards, grafik tren order, omzet per penjoki, status pembayaran
- **Order Management** - CRUD order dengan auto-generated order code, fee calculation
- **Fee Rules** - Atur fee admin berdasarkan rentang harga (FLAT/PERCENT)
- **Payroll** - Rekap gaji penjoki dengan filter tanggal
- **Role-based Access** - Admin dan Penjoki dengan akses berbeda
- **Google Sheets Sync** - Sinkronisasi otomatis ke Google Sheets

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL (Supabase/Neon)
- NextAuth (Credentials)
- Recharts
- Google Sheets API

## Getting Started

### 1. Clone & Install

```bash
cd sistem-joki
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` dan isi nilai-nilainya:

```env
# Database (Supabase/Neon)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google Sheets (optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="your-sheet-id"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema ke database
npx prisma db push

# Seed data awal (1 admin + 2 penjoki)
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Default Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@joki.com | admin123 |
| Penjoki | penjoki1@joki.com | penjoki123 |
| Penjoki | penjoki2@joki.com | penjoki123 |

> ⚠️ Ganti password setelah deploy ke production!

## Google Sheets Setup

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Enable Google Sheets API
4. Buat Service Account:
   - IAM & Admin → Service Accounts → Create
   - Download JSON key
5. Buat Google Spreadsheet baru
6. Share spreadsheet ke email service account
7. Isi environment variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = client_email dari JSON
   - `GOOGLE_PRIVATE_KEY` = private_key dari JSON
   - `GOOGLE_SHEET_ID` = ID dari URL spreadsheet

## Deploy to Vercel

1. Push code ke GitHub
2. Connect repository ke Vercel
3. Tambahkan environment variables di Vercel Dashboard
4. Deploy!

### Environment Variables untuk Vercel

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL (set ke domain Vercel)
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_SHEET_ID
```

## Project Structure

```
sistem-joki/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── app/
│   │   ├── (dashboard)/   # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   ├── fee-rules/
│   │   │   ├── payroll/
│   │   │   └── my-orders/
│   │   ├── api/auth/      # NextAuth API route
│   │   └── login/
│   ├── actions/           # Server Actions
│   │   ├── orders.ts
│   │   ├── fee-rules.ts
│   │   └── payroll.ts
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   └── layout/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   ├── google-sheets.ts
│   │   └── utils.ts
│   └── middleware.ts      # Auth middleware
├── .env.example
└── README.md
```

## Prisma Commands

```bash
# View data di browser
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Generate client setelah update schema
npx prisma generate
```

## License

MIT
