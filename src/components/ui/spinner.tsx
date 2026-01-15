"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpinnerProps {
    className?: string
    size?: "sm" | "md" | "lg"
}

const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
    return (
        <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
    )
}

interface LoadingProps {
    text?: string
}

export function Loading({ text = "Memuat..." }: LoadingProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Spinner size="lg" className="text-primary" />
            <p className="text-sm text-muted-foreground">{text}</p>
        </div>
    )
}
