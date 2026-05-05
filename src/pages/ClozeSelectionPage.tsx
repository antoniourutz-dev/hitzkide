import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClozeSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => navigate('/')} className="p-2 -ml-2">
        <ArrowLeft />
      </button>
      <h2 className="text-2xl font-black">Cloze testak</h2>
      <p>Ikasi hitzak testuinguruan, ñabardurak eta erabilera zaindua landuz.</p>
      <div className="grid gap-3">
        {[5, 10, 15].map(size => (
          <button key={size} onClick={() => navigate(`/cloze/${size}`)} className="p-4 bg-sky-100 hover:bg-sky-200 rounded-2xl font-bold">
            Saioa: {size} galdera
          </button>
        ))}
      </div>
    </div>
  );
}