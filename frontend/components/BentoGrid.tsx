"use client";
import { motion } from "framer-motion";
import { Network, GitPullRequest, ArrowUpRight } from "lucide-react";

export const BentoGrid = () => {
    return (
        <section className="py-32 bg-[#0B0B0F] text-center border-t border-white/[0.02]">
            <div className="max-w-6xl mx-auto px-6">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
                    The platform that won&apos;t <br /> paint you into a corner
                </h2>
                <p className="text-lg text-slate-400 font-light mb-16">
                    Build on a foundation that won&apos;t lead to architectural regret.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
                    {/* Big Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="md:col-span-8 bg-[var(--card)] border border-white/5 rounded-3xl p-10 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-secondary-500/20 transition-all duration-700" />
                        
                        <div className="relative z-10 w-full md:max-w-md">
                            <h3 className="text-3xl font-bold text-white mb-4 leading-tight">
                                Build complex AI <br /> without getting boxed in
                            </h3>
                            <p className="text-slate-400 font-light mb-8 pt-2">
                                Handle multi-agent setups and RAG systems. Use multiple cloud or offline AI models. 
                                Integrate with legacy systems while staying set up for the future with MCP support.
                            </p>
                            <button className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-glow transition-all hover:bg-primary">
                                Explore AI
                            </button>
                        </div>

                        {/* Visual element on right of the big card */}
                        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 md:translate-x-0 md:translate-y-0 md:-right-10 md:top-1/2 md:-translate-y-1/2 pointer-events-none">
                            <div className="w-80 h-64 border border-white/10 bg-[var(--card)] rounded-2xl p-6 shadow-2xl relative">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Network className="w-24 h-24 text-slate-500/30" />
                                </div>
                                <div className="w-full h-4 bg-white/5 rounded-full mb-3"></div>
                                <div className="w-3/4 h-4 bg-white/5 rounded-full mb-8"></div>
                                <div className="flex gap-4 invisible md:visible">
                                    <div className="w-12 h-12 rounded-lg bg-primary-700/20 border border-primary-700/20"></div>
                                    <div className="w-12 h-12 rounded-lg bg-secondary-500/20 border border-secondary-500/20"></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Small Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="md:col-span-4 bg-[var(--card)] border border-white/5 rounded-3xl p-10 relative overflow-hidden group flex flex-col justify-between"
                    >
                        <div className="absolute -top-10 -right-10 w-[200px] h-[200px] bg-accent-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-accent-500/20 transition-all duration-700" />
                        
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                                Let people and logic guide AI decisions
                            </h3>
                            <p className="text-slate-400 font-light mb-8 text-sm leading-relaxed">
                                Enforce structured inputs and outputs to control the data flow to and from AI steps.
                                Combine human-in-the-loop approvals with rule-based automation to contain AI actions.
                            </p>
                        </div>

                        <div className="relative z-10 w-full bg-[var(--card)] border border-white/10 rounded-xl p-4">
                            <div className="flex gap-3">
                                <GitPullRequest className="w-5 h-5 text-accent-400 mt-0.5" />
                                <div className="text-xs text-slate-300 font-medium">
                                    Wait for human approval to continue?
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold cursor-pointer border border-emerald-500/20">Approve</div>
                                <div className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold cursor-pointer border border-red-500/20">Reject</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
