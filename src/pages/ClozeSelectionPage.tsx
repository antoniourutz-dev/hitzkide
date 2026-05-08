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
    <div className="p-6 space-y-6">
      <button onClick={() => navigate('/')} className="p-2 -ml-2" aria-label="Hasierara itzuli">
        <ArrowLeft aria-hidden="true" />
      </button>
      <h2 className="text-2xl font-black">Cloze testak</h2>
      <p>Ikasi hitzak testuinguruan, ñabardurak eta erabilera zaindua landuz.</p>
      {!user && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-900">
          Saioa hasi behar duzu cloze saioak jokatu eta aurrerapena Supabasen gordetzeko.
        </div>
      )}
      <div className="grid gap-3">
        {[5, 10, 15].map(size => (
          <button
            key={size}
            onClick={() => navigate(user ? `/cloze/${size}` : '/profile')}
            className="p-4 bg-sky-100 hover:bg-sky-200 rounded-2xl font-bold"
          >
            Saioa: {size} galdera
          </button>
        ))}
      </div>
    </div>
  );
}
