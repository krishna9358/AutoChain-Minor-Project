"use client";
import { Appbar } from "@/components/Appbar";
import { Input } from "@/components/Input";
import axios from "axios";
import { useState } from "react";
import { BACKEND_URL } from "../config";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await axios.post(`${BACKEND_URL}/api/v1/user/signin`, {
                username: email,
                password,
            });
            localStorage.setItem("token", res.data.token);
            router.push("/dashboard");
        } catch (e: any) {
            setError(e.response?.data?.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return <div className="min-h-screen bg-slate-50 flex flex-col">
        <Appbar />
        <div className="flex-1 flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
            >
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Sign in to your Autochain workspace
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100 text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
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
                        onClick={handleLogin}
                        disabled={loading || !email || !password}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</>
                        ) : (
                            <>Sign In <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>

                    <div className="text-center text-sm">
                        <span className="text-slate-500">Don't have an account? </span>
                        <span
                            onClick={() => router.push("/signup")}
                            className="font-semibold text-blue-600 hover:text-blue-500 cursor-pointer transition-colors"
                        >
                            Sign up freely
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    </div>
}