import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const pathname = req.nextUrl.pathname

        // Admin-only routes
        const adminRoutes = ['/dashboard', '/orders', '/fee-rules', '/payroll', '/penjoki']
        const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

        // Penjoki-only routes
        const penjokiRoutes = ['/my-orders']
        const isPenjokiRoute = penjokiRoutes.some(route => pathname.startsWith(route))

        if (isAdminRoute && token?.role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/my-orders', req.url))
        }

        if (isPenjokiRoute && token?.role !== 'PENJOKI') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
)

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/orders/:path*',
        '/fee-rules/:path*',
        '/payroll/:path*',
        '/penjoki/:path*',
        '/my-orders/:path*',
        '/profile/:path*',
    ],
}
