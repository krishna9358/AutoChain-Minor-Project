"use client";
import { useRouter } from "next/navigation"
import { motion } from "framer-motion";
import { Workflow } from "lucide-react";

export const Appbar = () => {
    const router = useRouter();
    return <div className="flex border-b border-white/5 bg-black/50 backdrop-blur-md justify-between items-center p-4 px-8 sticky top-0 z-50">
        <div
            onClick={() => router.push("/")}
            className="flex items-center gap-2 cursor-pointer text-2xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity"
        >
            <Workflow className="w-8 h-8 text-blue-500" />
            <span>Autochain</span>
        </div>
        <div className="flex items-center gap-6">
            <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Integrations
            </button>
            <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Pricing
            </button>
            <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
            <button
                onClick={() => router.push("/login")}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
                Log in
            </button>
            <button
                onClick={() => router.push("/signup")}
                className="text-sm font-medium bg-white text-black px-5 py-2.5 rounded-full hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
                Start building free
            </button>
        </div>
    </div>
}