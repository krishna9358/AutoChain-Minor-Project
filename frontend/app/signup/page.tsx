"use client";
import { Appbar } from "@/components/Appbar";
import { Input } from "@/components/Input";
import axios from "axios";
import { useState } from "react";
import { BACKEND_URL } from "../config";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Zap, Target, Lock } from "lucide-react";

export default function Signup() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignup = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await axios.post(`${BACKEND_URL}/api/v1/user/signup`, {
                username: email,
                password,
                name
            });
            router.push("/login");
        } catch (e: any) {
            setError(e.response?.data?.message || "Something went wrong registering.");
        } finally {
            setLoading(false);
        }
    };

    return <div className="min-h-screen bg-slate-50 flex flex-col">
        <Appbar />
        <div className="flex-1 flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-8 hidden md:block"
                >
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
                        Power up your workflow with <span className="text-blue-600">Autochain</span>
                    </h1>

                    <div className="space-y-8">
                        <FeatureRow icon={<Zap className="w-6 h-6 text-amber-500" />} title="Infinite Automations" subtitle="Build complex, multi-step workflows without writing a single line of code." />
                        <FeatureRow icon={<Target className="w-6 h-6 text-green-500" />} title="Native AI Integration" subtitle="Connect the world's best ML models directly to standard SaaS apps." />
                        <FeatureRow icon={<Lock className="w-6 h-6 text-blue-500" />} title="Enterprise Security" subtitle="Bank-grade encryption protecting your data at rest and over the wire." />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full mx-auto"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            Create account
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Start building for free forever
                        </p>
                    </div>

                    <div className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <Input
                                onChange={e => setName(e.target.value)}
                                label={"Full Name"}
                                type="text"
                                placeholder="Steve Jobs"
                            />
                            <Input
                                onChange={e => setEmail(e.target.value)}
                                label={"Work Email"}
                                type="email"
                                placeholder="you@company.com"
                            />
                            <Input
                                onChange={e => setPassword(e.target.value)}
                                label={"Password"}
                                type="password"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            onClick={handleSignup}
                            disabled={loading || !email || !password || !name}
                            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Registering...</>
                            ) : (
                                <>Get Started <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>

                        <div className="text-center text-sm">
                            <span className="text-slate-500">Already have an account? </span>
                            <span
                                onClick={() => router.push("/login")}
                                className="font-semibold text-blue-600 hover:text-blue-500 cursor-pointer transition-colors"
                            >
                                Log in
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    </div>
}

function FeatureRow({ icon, title, subtitle }: { icon: any, title: string, subtitle: string }) {
    return <div className="flex gap-4">
        <div className="mt-1 w-12 h-12 flex-shrink-0 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
            {icon}
        </div>
        <div>
            <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
            <p className="text-slate-500 leading-relaxed mt-1">{subtitle}</p>
        </div>
    </div>
}