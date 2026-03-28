"use client";
import { useRouter } from "next/navigation";
import { Workflow, Github, ChevronDown } from "lucide-react";

export const Appbar = () => {
    const router = useRouter();
    return (
        <div className="flex bg-[#0B0B0F]/90 backdrop-blur-xl border-b border-white/[0.08] justify-between items-center px-4 py-3 sticky top-0 z-50 text-white rounded-b-2xl mx-2 mt-0 shadow-2xl">
            <div className="flex items-center gap-8 pl-4">
                <div
                    onClick={() => router.push("/")}
                    className="flex items-center gap-2 cursor-pointer text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
                >
                    <Workflow className="w-6 h-6 text-white" />
                    <span>Autochain</span>
                </div>
                
                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
                    <button className="hover:text-white transition-colors flex items-center gap-1 group">
                        Product <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </button>
                    <button className="hover:text-white transition-colors flex items-center gap-1 group">
                        Use cases <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </button>
                    <button className="hover:text-white transition-colors flex items-center gap-1 group">
                        Docs <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </button>
                    <button className="hover:text-white transition-colors">
                        Enterprise
                    </button>
                    <button className="hover:text-white transition-colors">
                        Pricing
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 pr-1">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hidden lg:flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">
                    <Github className="w-4 h-4" />
                    <span>179,537</span>
                </a>
                <button
                    onClick={() => router.push("/login")}
                    className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-2"
                >
                    Sign in
                </button>
                <button
                    onClick={() => router.push("/signup")}
                    className="text-sm font-semibold bg-primary text-white px-5 py-2.5 rounded-full hover:shadow-glow transition-all hover:scale-105 active:scale-95 hover:bg-primary"
                >
                    Get Started
                </button>
            </div>
        </div>
    );
}