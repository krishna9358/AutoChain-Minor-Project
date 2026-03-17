"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Play, Zap, Database, MessageSquare, Briefcase, Code, ShieldCheck, Mail, Workflow } from "lucide-react";

export const Hero = () => {
    const router = useRouter();

    return (
        <section className="relative overflow-hidden bg-[#0B0B0F] min-h-[90vh] flex flex-col pt-10">
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#FF5A00]/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full pt-16 flex flex-col justify-center">
                {/* Text Hero Content */}
                <div className="text-center md:text-left mb-16 relative z-10 w-full md:max-w-3xl">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
                    >
                        Automate anything. <br />
                        <span className="text-slate-400">Code freely.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl font-light"
                    >
                        Autochain is an open-source workflow automation tool. Easily
                        connect different services together and integrate your own custom APIs.
                    </motion.p>
                </div>

                {/* Split Interactive View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 mt-4 rounded-3xl p-2 bg-white/[0.02] border border-white/[0.05] shadow-2xl overflow-hidden backdrop-blur-xl">
                    {/* Left: Roles */}
                    <div className="lg:col-span-4 flex flex-col p-4 border-r border-white/[0.05]">
                        <RoleTab 
                            title="IT Ops" 
                            desc="On-board new employees" 
                            active={true} 
                        />
                        <RoleTab 
                            title="Sec Ops" 
                            desc="Enrich security incident tickets" 
                        />
                        <RoleTab 
                            title="Dev Ops" 
                            desc="Convert natural language into API calls" 
                        />
                        <RoleTab 
                            title="Sales" 
                            desc="Generate customer insights from reviews" 
                        />
                        
                        <div className="mt-8 flex items-center shrink-0 w-full pl-4 pt-4 border-t border-white/[0.05]">
                            <button className="flex items-center text-slate-400 group hover:text-white transition-colors text-sm">
                                <Play className="w-4 h-4 mr-2 bg-white/10 rounded-full p-0.5 group-hover:bg-[#FF5A00] text-white transition-colors" />
                                <span className="font-semibold text-white mr-1">You</span> can
                            </button>
                        </div>
                    </div>

                    {/* Right: Node Visualizer */}
                    <div className="lg:col-span-8 relative min-h-[400px] flex items-center justify-center p-8 overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>

                        {/* Network / Node Visual */}
                        <div className="relative w-full h-full max-w-2xl flex items-center justify-center z-10">
                            {/* Main Agent Node */}
                            <motion.div 
                                animate={{ y: [-5, 5, -5] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 bg-[#1C1C24] border border-white/10 shadow-2xl rounded-xl p-4 flex flex-col items-center justify-center z-20 space-y-2"
                            >
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                    <BotIcon className="w-8 h-8 text-white" />
                                </div>
                                <div className="text-center text-white font-semibold">AI Agent</div>
                                <div className="text-xs text-slate-400">Tools Agent</div>
                                
                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#1C1C24] border border-white/10 rounded-full"></div>
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#1C1C24] border border-white/10 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-[#FF5A00] rounded-full"></div>
                                </div>
                            </motion.div>

                            {/* Left Trigger Node */}
                            <motion.div 
                                animate={{ y: [5, -5, 5] }}
                                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                                className="absolute left-8 top-1/2 -translate-y-1/2 w-40 bg-[#1C1C24] border border-white/10 shadow-xl rounded-xl p-4 flex flex-col items-center justify-center z-10"
                            >
                                <div className="w-10 h-10 bg-[#FF5A00]/20 rounded-lg flex items-center justify-center border border-[#FF5A00]/30 mb-2">
                                    <Zap className="w-5 h-5 text-[#FF5A00]" />
                                </div>
                                <div className="text-sm text-center text-slate-300">
                                    On 'Create User' <br/> form submission
                                </div>
                                
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#1C1C24] border border-white/10 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                                </div>
                            </motion.div>

                            {/* Right Action Node */}
                            <motion.div 
                                animate={{ y: [-3, 3, -3] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 1 }}
                                className="absolute right-0 top-1/3 -translate-y-1/2 w-36 bg-[#1C1C24] border border-white/10 shadow-xl rounded-xl p-4 flex flex-col items-center justify-center z-10"
                            >
                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30 mb-2">
                                    <MessageSquare className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="text-sm font-semibold text-white">Add to channel</div>
                                <div className="text-[10px] text-slate-400 mt-1">invite: channel</div>
                                
                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#1C1C24] border border-white/10 rounded-full"></div>
                            </motion.div>

                            {/* Bottom Tools Nodes */}
                            <div className="absolute bottom-4 left-1/3 flex gap-8 z-10">
                                <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="w-20 bg-[#1C1C24] border border-white/10 rounded-xl p-3 flex flex-col items-center"
                                >
                                    <Database className="w-6 h-6 text-emerald-400 mb-2" />
                                    <span className="text-[10px] text-slate-300 text-center">Postgres</span>
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1C1C24] border border-white/10 rounded-full"></div>
                                </motion.div>
                                <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    className="w-20 bg-[#1C1C24] border border-white/10 rounded-xl p-3 flex flex-col items-center"
                                >
                                    <Code className="w-6 h-6 text-purple-400 mb-2" />
                                    <span className="text-[10px] text-slate-300 text-center">Anthropic</span>
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1C1C24] border border-white/10 rounded-full"></div>
                                </motion.div>
                            </div>

                            {/* SVG Connection Lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-white/20 stroke-2 fill-none" style={{ zIndex: 5 }}>
                                {/* Trigger to AI Agent */}
                                <path d="M 195 200 C 230 200, 270 200, 310 200" className="animate-pulse" />
                                {/* AI Agent to Right Action */}
                                <path d="M 495 200 C 530 200, 520 133, 560 133" />
                                {/* AI Agent to Tools */}
                                <path d="M 360 270 C 360 300, 320 320, 280 340" strokeDasharray="4 4" />
                                <path d="M 445 270 C 445 300, 410 320, 370 340" strokeDasharray="4 4" />
                            </svg>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

function RoleTab({ title, desc, active = false }: { title: string, desc: string, active?: boolean }) {
    return (
        <div className={`p-4 rounded-xl cursor-pointer transition-all ${active ? "bg-white/[0.05] border-l-2 border-[#FF5A00]" : "hover:bg-white/[0.02] border-l-2 border-transparent"} mb-2`}>
            <div className="flex items-center gap-1.5 font-medium text-lg text-white mb-1">
                <span className="font-bold">{title}</span> <span className="text-slate-500 font-normal">can</span>
            </div>
            <p className="text-slate-400 text-sm">{desc}</p>
        </div>
    )
}

function BotIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
        </svg>
    )
}