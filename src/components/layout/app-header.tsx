"use client";

import React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockUserProfile } from "@/server/mock/dashboard-data";

export interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  return (
    <header className={cn("flex lg:hidden items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 sticky top-0 z-30 backdrop-blur", className)}>
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold text-sm shadow-sm shadow-emerald-500/20">
          N
        </div>
        <span className="font-bold text-sm tracking-tight text-slate-100">
          Nancy Finance
        </span>
      </Link>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-emerald-400 border border-slate-700">
          {mockUserProfile.name.charAt(0)}
        </div>
      </div>
    </header>
  );
}
