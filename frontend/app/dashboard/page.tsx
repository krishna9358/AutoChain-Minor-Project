"use client"
// Appbar removed
import { DarkButton } from "@/components/buttons/DarkButton";
import axios from "axios";
import { useEffect, useState } from "react";
import { BACKEND_URL, HOOKS_URL } from "../config";
import { LinkButton } from "@/components/buttons/LinkButton";
import { useRouter } from "next/navigation";
import { Zap, Activity, Clock, Plus, ExternalLink, ChevronRight, LayoutTemplate } from "lucide-react";
import { motion } from "framer-motion";

interface Zap {
    id: string;
    triggerId: string;
    userId: number;
    actions: {
        id: string;
        zapId: string;
        actionId: string;
        sortingOrder: number;
        type: {
            id: string;
            name: string;
            image: string;
        }
    }[];
    trigger: {
        id: string;
        zapId: string;
        triggerId: string;
        type: {
            id: string;
            name: string;
            image: string;
        }
    };
}

function useZaps() {
    const [loading, setLoading] = useState(true);
    const [zaps, setZaps] = useState<Zap[]>([]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            return;
        }

        axios.get(`${BACKEND_URL}/api/v1/zap`, {
            headers: {
                "Authorization": token
            }
        })
            .then(res => {
                setZaps(res.data.zaps);
                setLoading(false)
            })
            .catch(() => setLoading(false));
    }, []);

    return { loading, zaps }
}

export default function Dashboard() {
    const { loading, zaps } = useZaps();
    const router = useRouter();

    return <div className="min-h-screen bg-[#f8fafc] flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
            <div
                onClick={() => router.push("/")}
                className="flex items-center gap-2 cursor-pointer text-xl font-bold tracking-tight text-slate-800 hover:opacity-80 transition-opacity"
            >
                <Zap className="w-6 h-6 text-blue-600" />
                <span>Autochain</span>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        localStorage.removeItem("token");
                        router.push("/login");
                    }}
                    className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
                >
                    Log out
                </button>
            </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-6 lg:p-12">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Zaps</h1>
                    <p className="text-slate-500 mt-2">Manage and monitor your automated workflows</p>
                </div>
                <button
                    onClick={() => router.push("/zap/create")}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Zap</span>
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Activity className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-slate-500">Loading your workflows...</p>
                </div>
            ) : zaps.length === 0 ? (
                <div className="bg-white border rounded-3xl p-16 text-center shadow-sm">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                            <Zap className="w-10 h-10" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">No Zaps yet</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        Automate your work by connecting the apps you use every day. Get started by creating your first Zap.
                    </p>
                    <button
                        onClick={() => router.push("/zap/create")}
                        className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold shadow-md hover:bg-blue-700 transition"
                    >
                        Create your first Zap
                    </button>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border rounded-3xl overflow-hidden shadow-sm"
                >
                    <ZapTable zaps={zaps} />
                </motion.div>
            )}
        </main>
    </div>
}

function ZapTable({ zaps }: { zaps: Zap[] }) {
    const router = useRouter();

    return <div className="w-full">
        <div className="grid grid-cols-12 gap-4 p-6 bg-slate-50 border-b text-sm font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Workflow Info</div>
            <div className="col-span-2 hidden md:block">ID</div>
            <div className="col-span-2 hidden sm:block">Webhook URL</div>
            <div className="col-span-2 hidden sm:block">Created</div>
            <div className="col-span-2 text-right">Action</div>
        </div>
        <div className="divide-y">
            {zaps.map((z, i) => (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={z.id}
                    className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-blue-50/50 transition-colors group cursor-pointer"
                    onClick={() => router.push("/zap/" + z.id)}
                >
                    <div className="col-span-8 sm:col-span-4 flex items-center space-x-4">
                        <div className="flex items-center p-2 bg-slate-100 rounded-lg">
                            <img src={z.trigger?.type?.image || "https://upload.wikimedia.org/wikipedia/commons/4/4e/Zapier_logo_2023.png"} className="w-6 h-6 object-cover rounded" />
                            <ChevronRight className="w-4 h-4 text-slate-400 mx-1" />
                            <div className="flex -space-x-2 relative">
                                {z.actions.slice(0, 3).map((a, i) => (
                                    <img key={a.id} src={a.type?.image || "https://upload.wikimedia.org/wikipedia/commons/4/4e/Zapier_logo_2023.png"} className="w-6 h-6 rounded border-2 border-white relative z-[1]" style={{ zIndex: 3 - i }} />
                                ))}
                                {z.actions.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 relative z-0">
                                        +{z.actions.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Untitled Zap</p>
                            <p className="text-xs text-slate-500">{z.actions.length} action(s)</p>
                        </div>
                    </div>

                    <div className="col-span-2 hidden md:block">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 font-mono">
                            {z.id.split("-")[0]}...
                        </span>
                    </div>

                    <div className="col-span-2 hidden sm:block">
                        <div className="text-xs text-blue-600 truncate bg-blue-50 px-2 py-1 rounded max-w-[150px]">
                            {`${HOOKS_URL}/hooks/catch/1/${z.id}`}
                        </div>
                    </div>

                    <div className="col-span-2 hidden sm:flex items-center text-sm text-slate-500">
                        <Clock className="w-4 h-4 mr-1.5" />
                        Just now
                    </div>

                    <div className="col-span-4 sm:col-span-2 flex justify-end">
                        <button className="text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 group-hover:-translate-x-2 transition-all flex items-center">
                            View <ExternalLink className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
}