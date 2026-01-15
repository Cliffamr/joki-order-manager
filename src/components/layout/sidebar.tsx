"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
    LayoutDashboard,
    ClipboardList,
    Receipt,
    Users,
    LogOut,
    Menu,
    X,
    FileText,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

const adminNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ClipboardList },
    { href: "/fee-rules", label: "Fee Rules", icon: Receipt },
    { href: "/payroll", label: "Payroll", icon: Users },
]

const penjokiNavItems = [
    { href: "/my-orders", label: "My Orders", icon: FileText },
]

export function Sidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [mobileOpen, setMobileOpen] = useState(false)

    const isAdmin = session?.user?.role === "ADMIN"
    const navItems = isAdmin ? adminNavItems : penjokiNavItems

    const NavContent = () => (
        <>
            {/* Logo */}
            <div className="flex items-center gap-2 px-4 py-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                    JM
                </div>
                <div>
                    <h1 className="font-semibold text-lg">Joki Manager</h1>
                    <p className="text-xs text-muted-foreground capitalize">
                        {session?.user?.role?.toLowerCase()}
                    </p>
                </div>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <Separator />

            {/* User Info */}
            <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {session?.user?.email}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </>
    )

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background border-b">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                        JM
                    </div>
                    <span className="font-semibold">Joki Manager</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={cn(
                    "lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-background border-r transform transition-transform duration-200 ease-in-out flex flex-col",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <NavContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-background border-r flex-col">
                <NavContent />
            </aside>

            {/* Spacer for mobile header */}
            <div className="lg:hidden h-14" />
        </>
    )
}
