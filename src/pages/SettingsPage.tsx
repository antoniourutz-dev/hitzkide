import { ArrowLeft } from 'lucide-react';
import { useLanguagePreference, LanguagePreference } from '../hooks/useLanguagePreference';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useLanguagePreference();

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/')} className="p-2 rounded-full text-slate-700 hover:text-brand-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-brand-text tracking-tight">Ezarpenak</h2>
      </div>

      <div className="sleek-card p-6 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Hizkuntza</p>
        <h3 className="text-lg font-bold text-brand-text">Azalpenen hizkuntza</h3>
        <div className="grid grid-cols-1 gap-2">
          {(['eu', 'es', 'both'] as LanguagePreference[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={[
                'sleek-btn-option w-full flex items-center justify-between gap-3',
                language === lang
                  ? 'bg-brand-primary text-white border-brand-border shadow-[5px_5px_0px_0px_#0f172a]'
                  : 'bg-white text-slate-900 border-brand-border shadow-[5px_5px_0px_0px_#0f172a]',
              ].join(' ')}
              aria-pressed={language === lang}
            >
              <span className="text-left">
                {lang === 'eu' ? 'Euskara' : lang === 'es' ? 'Gaztelania' : 'Biak'}
              </span>
              <span className="text-xs font-black tracking-widest opacity-80">
                {language === lang ? 'ON' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}