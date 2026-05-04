import { ArrowLeft } from 'lucide-react';

interface ClozeSelectionPageProps {
  onBack: () => void;
  onStart: (size: number) => void;
}

export default function ClozeSelectionPage({ onBack, onStart }: ClozeSelectionPageProps) {
  return (
    <div className="p-6 space-y-6">
      <button onClick={onBack} className="p-2 -ml-2">
        <ArrowLeft />
      </button>
      <h2 className="text-2xl font-black">Cloze testak</h2>
      <p>Ikasi hitzak testuinguruan, ñabardurak eta erabilera zaindua landuz.</p>
      <div className="grid gap-3">
        {[5, 10, 15].map(size => (
          <button key={size} onClick={() => onStart(size)} className="p-4 bg-sky-100 hover:bg-sky-200 rounded-2xl font-bold">
            Saioa: {size} galdera
          </button>
        ))}
      </div>
    </div>
  );
}
