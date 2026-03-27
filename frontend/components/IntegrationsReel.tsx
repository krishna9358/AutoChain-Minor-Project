"use client";
import { motion } from "framer-motion";
import { Slack, Github, Database, Webhook, Box, Grid, Server, Zap, Globe, MessageCircle, Cloud, Trello, MousePointer2 } from "lucide-react";

export const IntegrationsReel = () => {
    return (
        <section className="relative overflow-hidden py-32 bg-[#0B0B0F] border-t border-white/[0.02]">
            {/* Background Gradients */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 text-center mb-16 relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                    Plug AI into your own data & <br /> over 500 integrations
                </h2>
                <p className="text-lg text-slate-400 font-light max-w-2xl mx-auto">
                    Use pre-built nodes for common apps. Custom API connections for everything else.
                </p>
            </div>

            {/* Slanted Marquee Container */}
            <div className="relative z-10 w-full max-w-[1400px] mx-auto overflow-hidden h-[300px]">
                {/* Fade edges */}
                <div className="absolute inset-y-0 left-0 w-32 bg-[#0B0B0F] z-20" style={{maskImage: 'linear-gradient(to right, #0B0B0F, transparent)'}}></div>
                <div className="absolute inset-y-0 right-0 w-32 bg-[#0B0B0F] z-20" style={{maskImage: 'linear-gradient(to left, #0B0B0F, transparent)'}}></div>

                <div 
                    className="flex flex-col gap-6 ml-[-100px] pt-8"
                    style={{ transform: "rotate(-5deg) scale(1.1)" }}
                >
                    {/* Row 1 */}
                    <MarqueeRow icons={Row1Icons} speed={25} />
                    {/* Row 2 */}
                    <MarqueeRow icons={Row2Icons} direction="reverse" speed={30} />
                </div>
            </div>

            <div className="mt-16 text-center relative z-10">
                <button className="bg-[#6B4BFF] hover:bg-[#5E40E3] text-white px-8 py-3 rounded-full font-medium transition-colors shadow-[0_0_20px_rgba(107,75,255,0.4)] hover:shadow-[0_0_30px_rgba(107,75,255,0.6)]">
                    Browse all integrations
                </button>
            </div>
        </section>
    );
};

const Row1Icons = [Slack, Github, Database, Webhook, Box, Grid, Server, Zap, Globe, MessageCircle, Cloud, Trello, MousePointer2];
const Row2Icons = [Box, Server, Slack, Trello, Grid, Database, Webhook, Globe, Github, Cloud, Zap, MessageCircle, MousePointer2];

function MarqueeRow({ icons, direction = "normal", speed = 20 }: { icons: any[], direction?: "normal" | "reverse", speed?: number }) {
    // Duplicate array to loop smoothly
    const items = [...icons, ...icons, ...icons];

    return (
        <div className="flex gap-6 relative w-[200vw]">
            <motion.div
                className="flex gap-6 will-change-transform"
                animate={{
                    x: direction === "normal" ? ["0%", "-33.333%"] : ["-33.333%", "0%"],
                }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: speed,
                }}
            >
                {items.map((Icon, idx) => (
                    <div 
                        key={idx} 
                        className="w-20 h-20 md:w-24 md:h-24 bg-[#1C1C24]/80 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center shadow-lg hover:border-white/30 transition-colors group cursor-pointer"
                    >
                        <Icon className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-white group-hover:scale-110 transition-all" />
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
