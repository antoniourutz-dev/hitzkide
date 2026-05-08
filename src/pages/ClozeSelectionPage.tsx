import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';

export default function ClozeSelectionPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then(setUser);
  }, []);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full text-slate-700 hover:text-brand-primary transition-colors" aria-label="Hasierara itzuli">
        <ArrowLeft aria-hidden="true" />
      </button>
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-brand-text tracking-tight">Cloze testak</h2>
        <p className="text-slate-700">
          Ikasi hitzak testuinguruan, ñabardurak eta erabilera zaindua landuz.
        </p>
      </div>
      {!user && (
        <div className="sleek-card p-4 bg-sky-50 text-sm font-semibold text-sky-900">
          Saioa hasi behar duzu cloze saioak jokatu eta aurrerapena Supabasen gordetzeko.
        </div>
      )}
      <div className="grid gap-3">
        {[5, 10, 15].map(size => (
          <button
            key={size}
            onClick={() => navigate(user ? `/cloze/${size}` : '/profile')}
            className="sleek-card-interactive p-4 bg-sky-50 font-black text-left"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-800/70">Saioa</span>
            <div className="text-lg font-black text-sky-900">{size} galdera</div>
          </button>
        ))}
      </div>
    </div>
  );
}
