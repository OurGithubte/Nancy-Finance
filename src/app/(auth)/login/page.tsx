"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { NancyLogo } from "@/components/branding/nancy-logo";
import { signIn } from "@/lib/auth/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("nguyenvana@nancyfinance.vn");
  const [password, setPassword] = useState("••••••••");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    await signIn.email({
      email,
      password,
    }, {
      onSuccess: () => {
        router.push("/");
        router.refresh();
      },
      onError: (ctx) => {
        setError(ctx.error.message || "Đăng nhập thất bại");
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface/90 p-8 shadow-2xl backdrop-blur">
        {/* Brand */}
        <div className="text-center mb-8">
          <NancyLogo
            className="mx-auto h-20 w-20 mb-3 shadow-lg shadow-primary/20"
            sizes="80px"
            priority
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Nancy Finance
          </h1>
          <p className="text-xs text-muted mt-1">
            Đăng nhập để quản lý tài chính cá nhân
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-surface-card pl-10 pr-3.5 py-2.5 text-xs text-foreground placeholder:text-muted outline-none focus:border-primary transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Mật khẩu
              </label>
              <a
                href="#"
                className="text-[11px] text-primary hover:underline"
              >
                Quên mật khẩu?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-surface-card pl-10 pr-3.5 py-2.5 text-xs text-foreground placeholder:text-muted outline-none focus:border-primary transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 mt-2 cursor-pointer"
          >
            <span>{isLoading ? "Đang xử lý..." : "Đăng nhập"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="text-primary font-semibold hover:underline"
          >
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
