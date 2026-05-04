import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

export default function StatCard({ label, value, icon, color = "bg-emerald-50 text-emerald-500" }: StatCardProps) {
  return (
    <div className="bg-white border-2 border-slate-50 rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <span className="text-2xl font-black text-slate-800 tracking-tight">{value}</span>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</span>
      </div>
    </div>
  );
}
