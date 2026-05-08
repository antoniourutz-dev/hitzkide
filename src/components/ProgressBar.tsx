import { motion } from 'motion/react';

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="w-full">
      <div className="h-2 w-full bg-slate-100 overflow-hidden border-b-[3px] border-brand-border">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-brand-primary"
        />
      </div>
    </div>
  );
}
