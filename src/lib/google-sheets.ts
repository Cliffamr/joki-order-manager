import { google } from "googleapis"

interface OrderWithJockey {
    id: string
    orderCode: string
    customerNumber: string
    jobType: string
    price: number
    feeAdmin: number
    netJockey: number
    paymentStatus: string
    workStatus: string
    paidAmount: number
    dueDate: Date | null
    sheetRowId: string | null
    updatedAt: Date
    jockey: {
        name: string
    }
}

// Get Google Sheets API client
async function getSheetClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    const sheetId = process.env.GOOGLE_SHEET_ID

    if (!email || !privateKey || !sheetId) {
        console.warn("Google Sheets credentials not configured")
        return null
    }

    const auth = new google.auth.JWT({
        email,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    return { sheets, sheetId }
}

// Sync order to Google Sheets
export async function syncOrderToSheet(order: OrderWithJockey) {
    const client = await getSheetClient()
    if (!client) {
        console.log("Google Sheets sync skipped - not configured")
        return
    }

    const { sheets, sheetId } = client
    const sheetName = "Orders"

    const remainingAmount = order.price - order.paidAmount
    const rowData = [
        order.orderCode,
        order.customerNumber,
        order.jobType,
        order.price,
        order.feeAdmin,
        order.netJockey,
        order.jockey.name,
        order.paymentStatus,
        order.workStatus,
        order.paidAmount,
        remainingAmount,
        order.dueDate ? order.dueDate.toISOString().split("T")[0] : "",
        order.updatedAt.toISOString(),
    ]

    try {
        // First, check if the sheet exists and has headers
        await ensureSheetExists(sheets, sheetId, sheetName)

        if (order.sheetRowId) {
            // Update existing row
            const rowNumber = parseInt(order.sheetRowId)
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `${sheetName}!A${rowNumber}:M${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [rowData] },
            })
            console.log(`Updated row ${rowNumber} for order ${order.orderCode}`)
        } else {
            // Find existing row by orderCode or append new row
            const existingRow = await findRowByOrderCode(sheets, sheetId, sheetName, order.orderCode)

            if (existingRow) {
                // Update existing row
                await sheets.spreadsheets.values.update({
                    spreadsheetId: sheetId,
                    range: `${sheetName}!A${existingRow}:M${existingRow}`,
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values: [rowData] },
                })
                console.log(`Updated existing row ${existingRow} for order ${order.orderCode}`)

                // Update sheetRowId in database
                const { prisma } = await import("@/lib/prisma")
                await prisma.order.update({
                    where: { id: order.id },
                    data: { sheetRowId: existingRow.toString() },
                })
            } else {
                // Append new row
                const appendResult = await sheets.spreadsheets.values.append({
                    spreadsheetId: sheetId,
                    range: `${sheetName}!A:M`,
                    valueInputOption: "USER_ENTERED",
                    insertDataOption: "INSERT_ROWS",
                    requestBody: { values: [rowData] },
                })

                // Extract row number from update range
                const updatedRange = appendResult.data.updates?.updatedRange
                if (updatedRange) {
                    const match = updatedRange.match(/!A(\d+):/)
                    if (match) {
                        const rowNumber = match[1]
                        // Update sheetRowId in database
                        const { prisma } = await import("@/lib/prisma")
                        await prisma.order.update({
                            where: { id: order.id },
                            data: { sheetRowId: rowNumber },
                        })
                        console.log(`Appended new row ${rowNumber} for order ${order.orderCode}`)
                    }
                }
            }
        }
    } catch (error) {
        console.error("Google Sheets sync error:", error)
        // Retry logic
        await retrySync(order, 1)
    }
}

async function ensureSheetExists(
    sheets: ReturnType<typeof google.sheets>,
    sheetId: string,
    sheetName: string
) {
    try {
        // Check if headers exist
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A1:M1`,
        })

        if (!response.data.values || response.data.values.length === 0) {
            // Add headers
            const headers = [
                "Order Code",
                "Customer Number",
                "Job Type",
                "Price",
                "Fee Admin",
                "Net Jockey",
                "Jockey Name",
                "Payment Status",
                "Work Status",
                "Paid Amount",
                "Remaining",
                "Due Date",
                "Updated At",
            ]

            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `${sheetName}!A1:M1`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [headers] },
            })
            console.log("Added headers to sheet")
        }
    } catch (error) {
        console.error("Error ensuring sheet exists:", error)
        throw error
    }
}

async function findRowByOrderCode(
    sheets: ReturnType<typeof google.sheets>,
    sheetId: string,
    sheetName: string,
    orderCode: string
): Promise<number | null> {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:A`,
        })

        const values = response.data.values
        if (!values) return null

        for (let i = 0; i < values.length; i++) {
            if (values[i][0] === orderCode) {
                return i + 1 // 1-indexed row number
            }
        }

        return null
    } catch {
        return null
    }
}

async function retrySync(order: OrderWithJockey, attempt: number) {
    if (attempt > 3) {
        console.error(`Failed to sync order ${order.orderCode} after 3 attempts`)
        return
    }

    const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay))

    try {
        await syncOrderToSheet(order)
    } catch {
        await retrySync(order, attempt + 1)
    }
}
