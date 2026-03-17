"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "@/app/config";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (IS_DEV) { localStorage.setItem("token", "dev-demo-token"); localStorage.setItem("user", JSON.stringify({ name: "Dev User" })); router.push("/dashboard"); }
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const r = await axios.post(`${BACKEND_URL}/api/v1/user/login`, { email, password });
      localStorage.setItem("token", r.data.token); localStorage.setItem("user", JSON.stringify(r.data.user));
      if (r.data.workspace) localStorage.setItem("workspace", JSON.stringify(r.data.workspace));
      router.push("/dashboard");
    } catch (err: any) { setError(err.response?.data?.error || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-lg bg-indigo-600 items-center justify-center mb-4"><Zap className="w-5 h-5 text-white" /></div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Sign in</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Welcome back to AgentFlow</p>
        </div>
        <form onSubmit={login} className="space-y-4">
          <div className="p-5 rounded-xl border space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
            {error && <div className="px-3 py-2 rounded-lg text-xs bg-red-500/10 text-red-500 border border-red-500/20">{error}</div>}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 pr-10"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </form>
        <p className="text-center text-xs mt-5" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}<button onClick={() => router.push("/signup")} className="text-indigo-500 font-medium">Sign up</button>
        </p>
      </div>
    </div>
  );
}
