import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

export default function StatCard({ label, value, icon, color = "bg-emerald-50 text-emerald-500" }: StatCardProps) {
  return (
    <div className="sleek-card p-4 flex flex-col gap-3">
      <div className={`w-10 h-10 ${color} rounded-none border-[3px] border-brand-border shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center`}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <span className="text-2xl font-black text-brand-text tracking-tight">{value}</span>
        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</span>
      </div>
    </div>
  );
}
