"use client"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion";
import { ArrowRight, Bot, Zap, Puzzle, Code, ShieldCheck, ChevronRight } from "lucide-react";

export const Hero = () => {
    const router = useRouter();
    return <div className="relative overflow-hidden bg-black text-white min-h-[90vh] flex flex-col justify-center items-center">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-blue-400 mb-8"
            >
                <Zap className="w-4 h-4" />
                <span>The ultimate automation platform</span>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[1.1]"
            >
                Connect tools. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    Automate workflows.
                </span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 font-light"
            >
                Autochain is the connective tissue for your AI agents and standard apps.
                Build infinitely scalable, bidirectional workflows in minutes.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
                <button
                    onClick={() => router.push("/signup")}
                    className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-slate-200 transition-all hover:scale-105 active:scale-95"
                >
                    Start for free <ArrowRight className="w-5 h-5" />
                </button>
                <button
                    className="flex items-center gap-2 bg-white/5 text-white border border-white/10 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-all"
                >
                    Read the docs
                </button>
            </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
            <FeatureCard
                icon={<Bot />}
                title="AI-Native Integrations"
                desc="Expose standard APIs to your LLMs instantly."
            />
            <FeatureCard
                icon={<Puzzle />}
                title="100+ App Ecosystem"
                desc="Connect with Hubspot, Slack, Salesforce and more natively."
            />
            <FeatureCard
                icon={<Code />}
                title="Developer First"
                desc="Robust SDKs and clear documentation for engineers."
            />
        </div>
    </div>
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm group cursor-pointer"
        >
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-slate-400 leading-relaxed">{desc}</p>
        </motion.div>
    )
}