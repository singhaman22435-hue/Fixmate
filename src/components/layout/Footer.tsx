import React from 'react';
import Link from 'next/link';
import { Shield, Lock, Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-8 px-4 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>FixMate operates with 100% local privacy. No cloud AI keys or external data transmission.</span>
        </div>

        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Specs</span>
          </Link>
          <Link href="/setup" className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>Local AI Runtime</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

