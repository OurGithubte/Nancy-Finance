"use client";

import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { mockUserProfile } from "@/server/mock/dashboard-data";
import { User, Shield, Database, Check } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <FinancePageHeader
        title="Cài đặt"
        subtitle="Quản lý tài khoản, bảo mật và cấu hình hệ thống"
      />

      <div className="space-y-4">
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur">
          <div className="flex items-center gap-2.5 mb-4">
            <User className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Thông tin cá nhân
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                defaultValue={mockUserProfile.name}
                className="w-full rounded-xl border border-slate-800 bg-slate-800/80 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                defaultValue={mockUserProfile.email}
                className="w-full rounded-xl border border-slate-800 bg-slate-800/80 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Currency & Architecture Rules */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur">
          <div className="flex items-center gap-2.5 mb-4">
            <Database className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Cấu hình tiền tệ & Cơ sở dữ liệu (Khóa kiến trúc)
            </h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-300">Đơn vị tiền tệ chính</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> VND (Việt Nam Đồng)
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-300">Database Engine</span>
              <span className="font-semibold text-slate-200">
                Neon Serverless PostgreSQL
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-300">ORM & Migration</span>
              <span className="font-semibold text-slate-200">Drizzle ORM</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-300">Authentication</span>
              <span className="font-semibold text-slate-200">Better Auth</span>
            </div>
          </div>
        </div>

        {/* Security & Notifications */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur">
          <div className="flex items-center gap-2.5 mb-4">
            <Shield className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-100">Bảo mật</h3>
          </div>
          <p className="text-xs text-slate-400">
            Phiên đăng nhập được mã hóa an toàn qua Better Auth HttpOnly cookie.
          </p>
        </div>
      </div>
    </div>
  );
}
