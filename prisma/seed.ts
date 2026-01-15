import { PrismaClient, Role, FeeType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // Clear existing data
    await prisma.auditLog.deleteMany()
    await prisma.payout.deleteMany()
    await prisma.order.deleteMany()
    await prisma.feeRule.deleteMany()
    await prisma.user.deleteMany()

    // Create Admin user
    const adminPassword = await bcrypt.hash('admin123', 12)
    const admin = await prisma.user.create({
        data: {
            email: 'admin@joki.com',
            name: 'Administrator',
            password: adminPassword,
            role: Role.ADMIN,
        },
    })
    console.log('✅ Created admin:', admin.email)

    // Create Penjoki users
    const penjokiPassword = await bcrypt.hash('penjoki123', 12)

    const penjoki1 = await prisma.user.create({
        data: {
            email: 'penjoki1@joki.com',
            name: 'Budi Santoso',
            password: penjokiPassword,
            role: Role.PENJOKI,
        },
    })
    console.log('✅ Created penjoki:', penjoki1.email)

    const penjoki2 = await prisma.user.create({
        data: {
            email: 'penjoki2@joki.com',
            name: 'Andi Pratama',
            password: penjokiPassword,
            role: Role.PENJOKI,
        },
    })
    console.log('✅ Created penjoki:', penjoki2.email)

    // Create Fee Rules
    const feeRules = await Promise.all([
        prisma.feeRule.create({
            data: {
                minPrice: 10000,
                maxPrice: 14999,
                feeType: FeeType.FLAT,
                feeValue: 2000,
            },
        }),
        prisma.feeRule.create({
            data: {
                minPrice: 15000,
                maxPrice: 24999,
                feeType: FeeType.FLAT,
                feeValue: 3000,
            },
        }),
        prisma.feeRule.create({
            data: {
                minPrice: 25000,
                maxPrice: 49999,
                feeType: FeeType.FLAT,
                feeValue: 5000,
            },
        }),
        prisma.feeRule.create({
            data: {
                minPrice: 50000,
                maxPrice: 99999,
                feeType: FeeType.FLAT,
                feeValue: 7500,
            },
        }),
        prisma.feeRule.create({
            data: {
                minPrice: 100000,
                maxPrice: 999999999,
                feeType: FeeType.PERCENT,
                feeValue: 10, // 10%
            },
        }),
    ])
    console.log('✅ Created', feeRules.length, 'fee rules')

    // Create sample orders
    const today = new Date()
    const sampleOrders = [
        {
            orderCode: `JK-${today.getFullYear()}-000001`,
            customerNumber: '081234567890',
            jobType: 'Tugas Matematika',
            price: 25000,
            feeAdmin: 5000,
            netJockey: 20000,
            jockeyId: penjoki1.id,
            paymentStatus: 'PAID' as const,
            workStatus: 'DONE' as const,
            paidAmount: 25000,
        },
        {
            orderCode: `JK-${today.getFullYear()}-000002`,
            customerNumber: '082345678901',
            jobType: 'Skripsi Bab 1-3',
            price: 150000,
            feeAdmin: 15000,
            netJockey: 135000,
            jockeyId: penjoki1.id,
            paymentStatus: 'DP' as const,
            workStatus: 'IN_PROGRESS' as const,
            paidAmount: 75000,
        },
        {
            orderCode: `JK-${today.getFullYear()}-000003`,
            customerNumber: '083456789012',
            jobType: 'Coding Python',
            price: 50000,
            feeAdmin: 7500,
            netJockey: 42500,
            jockeyId: penjoki2.id,
            paymentStatus: 'UNPAID' as const,
            workStatus: 'NEW' as const,
            paidAmount: 0,
        },
    ]

    for (const order of sampleOrders) {
        await prisma.order.create({ data: order })
    }
    console.log('✅ Created', sampleOrders.length, 'sample orders')

    console.log('🎉 Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
