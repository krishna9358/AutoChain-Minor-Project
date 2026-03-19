"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Loader2 } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "@/app/config";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signup = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const r = await axios.post(`${BACKEND_URL}/api/v1/user/signup`, { name, email, password });
      localStorage.setItem("token", r.data.token); localStorage.setItem("user", JSON.stringify(r.data.user));
      if (r.data.workspace) localStorage.setItem("workspace", JSON.stringify(r.data.workspace));
      router.push("/dashboard");
    } catch (err: any) { setError(err.response?.data?.error || "Signup failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-lg bg-indigo-600 items-center justify-center mb-4"><Zap className="w-5 h-5 text-white" /></div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Create account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Get started with AutoChain</p>
        </div>
        <form onSubmit={signup} className="space-y-4">
          <div className="p-5 rounded-xl border space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
            {error && <div className="px-3 py-2 rounded-lg text-xs bg-red-500/10 text-red-500 border border-red-500/20">{error}</div>}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 chars" required
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }} />
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </form>
        <p className="text-center text-xs mt-5" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}<button onClick={() => router.push("/login")} className="text-indigo-500 font-medium">Sign in</button>
        </p>
      </div>
    </div>
  );
}