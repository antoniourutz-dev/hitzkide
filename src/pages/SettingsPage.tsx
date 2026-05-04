import { ArrowLeft } from 'lucide-react';
import { useLanguagePreference, LanguagePreference } from '../hooks/useLanguagePreference';

interface SettingsPageProps {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const [language, setLanguage] = useLanguagePreference();

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ezarpenak</h2>
      </div>

      <div className="bg-white rounded-3xl p-6 border-2 border-slate-50 shadow-sm space-y-4">
        <h3 className="text-lg font-bold">Azalpenen hizkuntza</h3>
        <div className="grid grid-cols-1 gap-2">
          {(['eu', 'es', 'both'] as LanguagePreference[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`p-4 rounded-2xl font-bold border-2 transition-all ${
                language === lang 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                  : 'border-slate-100 text-slate-600 hover:border-slate-200'
              }`}
            >
              {lang === 'eu' ? 'Euskara' : lang === 'es' ? 'Gaztelania' : 'Biak'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
