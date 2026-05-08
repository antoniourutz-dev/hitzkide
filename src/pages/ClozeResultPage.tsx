import { useState, useEffect } from 'react';
import { ClozeSession } from '../types/cloze';
import { useNavigate } from 'react-router-dom';
import { SESSION_STORAGE_KEYS, readJsonFromSessionStorage } from '../lib/storage';

export default function ClozeResultPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ClozeSession | null>(null);

  useEffect(() => {
    const stored = readJsonFromSessionStorage<ClozeSession>(SESSION_STORAGE_KEYS.clozeResult);
    if (stored) {
      setSession(stored);
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!session) {
    return <div className="py-10 text-slate-600 font-medium">Kargatzen...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-brand-text tracking-tight">Emaitzak</h2>
      <div className="sleek-card p-6 space-y-2">
        <p className="text-4xl font-black text-brand-primary">{Math.round((session.score / session.total) * 100)}%</p>
        <p className="text-sm font-bold text-slate-700">Puntuazioa: {session.score} / {session.total}</p>
        <p className="text-sm font-bold text-slate-700">Maila: {session.level}</p>
      </div>

      <div className="space-y-3">
        <button onClick={() => navigate('/cloze')} className="w-full sleek-btn-primary bg-brand-primary">
          Beste cloze saio bat
        </button>
        <button onClick={() => navigate('/')} className="w-full sleek-btn-secondary">
          Sinonimoetara joan
        </button>
      </div>
    </div>
  );
}
