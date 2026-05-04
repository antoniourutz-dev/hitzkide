import { ClozeSession } from '../types/cloze';

export default function ClozeResultPage({ session, onBack }: { session: ClozeSession, onBack: () => void }) {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-black">Emaitzak</h2>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
        <p className="text-4xl font-black text-emerald-600">{Math.round((session.score / session.total) * 100)}%</p>
        <p className="text-sm font-bold text-slate-500">Puntuazioa: {session.score} / {session.total}</p>
        <p className="text-sm font-bold text-slate-500">Maila: {session.level}</p>
      </div>

      <div className="space-y-3">
        <button className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black">Beste cloze saio bat</button>
        <button className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-black">Sinonimoetara joan</button>
        <button onClick={onBack} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">
            Hasierara itzuli
        </button>
      </div>
    </div>
  );
}
