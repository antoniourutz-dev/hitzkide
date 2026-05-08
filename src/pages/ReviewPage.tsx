import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Eye } from 'lucide-react';
import { fetchGroupsForReview } from '../services/lexicalService';
import { LexicalGroup } from '../types/lexical';
import LoadingState from '../components/LoadingState';
import { getCategoryLabel, getReviewStatusLabel, getGrammarLabel, getFilterLabel, getConceptLabel, getLevelLabel } from '../utils/labels';
import { useNavigate } from 'react-router-dom';

export default function ReviewPage() {
  const navigate = useNavigate();
  const [allGroups, setAllGroups] = useState<LexicalGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<LexicalGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filters, setFilters] = useState({
    level: 'all',
    category: 'all',
    status: 'all'
  });

  useEffect(() => {
    async function load() {
      const data = await fetchGroupsForReview();
      setAllGroups(data);
      setFilteredGroups(data);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    let result = allGroups;

    if (searchTerm) {
      result = result.filter(g => 
        getConceptLabel(g.concept).toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.words.some(w => w.word.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filters.level !== 'all') {
      result = result.filter(g => g.reviewed_level === filters.level);
    }

    if (filters.category !== 'all') {
      result = result.filter(g => g.category === filters.category);
    }

    if (filters.status !== 'all') {
      result = result.filter(g => g.review_status === filters.status);
    }

    setFilteredGroups(result);
  }, [searchTerm, filters, allGroups]);

  const uniqueLevels = Array.from(new Set(allGroups.map(g => g.reviewed_level).filter(Boolean))) as string[];
  const uniqueCategories = Array.from(new Set(allGroups.map(g => g.category).filter(Boolean))) as string[];
  const uniqueStatuses = Array.from(new Set(allGroups.map(g => g.review_status).filter(Boolean))) as string[];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/')} className="p-2 rounded-full text-slate-700 hover:text-brand-primary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-brand-text tracking-tight">Berrikuspena</h2>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Bilatu hitza..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-[3px] border-brand-border rounded-none shadow-[6px_6px_0px_0px_#0f172a] focus:outline-none transition-all font-medium text-sm"
          />
        </div>

        <div className="flex overflow-x-auto pb-4 space-x-2 no-scrollbar">
          <div className="flex items-center bg-white px-3 py-2 rounded-none border-[3px] border-brand-border shadow-[3px_3px_0px_0px_#0f172a]">
            <Filter size={14} className="text-slate-600 mr-2" />
            <select 
              value={filters.level} 
              onChange={e => setFilters(f => ({ ...f, level: e.target.value }))}
              className="bg-transparent text-xs font-semibold tracking-wide outline-none text-slate-600 appearance-none max-w-[100px] sm:max-w-none text-ellipsis"
            >
              <option value="all">{getFilterLabel('all_levels')}</option>
              {uniqueLevels.map(l => <option key={l} value={l!}>{getLevelLabel(l)}</option>)}
            </select>
          </div>
          <div className="flex items-center bg-white px-3 py-2 rounded-none border-[3px] border-brand-border shadow-[3px_3px_0px_0px_#0f172a]">
            <select 
              value={filters.category} 
              onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              className="bg-transparent text-xs font-semibold tracking-wide outline-none text-slate-600 appearance-none max-w-[100px] sm:max-w-none text-ellipsis"
            >
              <option value="all">{getFilterLabel('all_categories')}</option>
              {uniqueCategories.map(c => <option key={c} value={c!}>{getCategoryLabel(c)}</option>)}
            </select>
          </div>
          <div className="flex items-center bg-white px-3 py-2 rounded-none border-[3px] border-brand-border shadow-[3px_3px_0px_0px_#0f172a]">
            <select 
              value={filters.status} 
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="bg-transparent text-xs font-semibold tracking-wide outline-none text-slate-600 appearance-none max-w-[100px] sm:max-w-none text-ellipsis"
            >
              <option value="all">{getFilterLabel('all_statuses')}</option>
              {uniqueStatuses.map(s => <option key={s} value={s!}>{getReviewStatusLabel(s)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
            Aurkitutakoak: {filteredGroups.length}
          </p>
          {filteredGroups.map(group => (
            <div key={group.id} className="sleek-card p-6 space-y-4">
               <div className="flex justify-between items-start">
                 <div>
                   <h4 className="text-xl font-black text-brand-text tracking-tight">{getConceptLabel(group.concept)}</h4>
                   <p className="text-xs text-slate-600 font-medium">{group.meaning_es}</p>
                 </div>
                 <div className={group.is_active ? "text-emerald-500" : "text-slate-300"}>
                   <Eye size={20} />
                 </div>
               </div>
               <div className="flex flex-wrap gap-2">
                 <span className="px-2 py-0.5 bg-white text-[9px] font-black uppercase tracking-widest text-slate-700 border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">{getGrammarLabel(group.grammar)}</span>
                 <span className="px-2 py-0.5 bg-purple-50 text-[9px] font-black uppercase tracking-widest text-purple-800 border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">{getReviewStatusLabel(group.review_status)}</span>
                 {group.category && <span className="px-2 py-0.5 bg-blue-50 text-[9px] font-black uppercase tracking-widest text-blue-800 border-[3px] border-brand-border shadow-[2px_2px_0px_0px_#0f172a]">{getCategoryLabel(group.category)}</span>}
               </div>
               <div className="pt-4 border-t-[3px] border-brand-border grid grid-cols-2 gap-2">
                 {group.words.map(w => (
                   <span key={w.id} className="text-sm font-black text-slate-800 flex items-center bg-white px-3 py-2 border-[3px] border-brand-border shadow-[3px_3px_0px_0px_#0f172a] uppercase tracking-tight">
                      {w.word}
                   </span>
                 ))}
               </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <div className="py-12 text-center text-slate-400 font-medium italic">Ez da emaitzarik aurkitu.</div>
          )}
        </div>
      )}
    </div>
  );
}
