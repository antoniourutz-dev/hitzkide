import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, RefreshCw, ShieldAlert, Table2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import {
  fetchDiscourseCoverageRows,
  fetchDiscourseCoverageSummary,
  fetchDuplicateExactRows,
  fetchDuplicateSummary,
  fetchEditorialPriorityQueue,
  fetchEditorialPrioritySummary,
  fetchLexicalCoverageByCategory,
  fetchLexicalCoverageByLevel,
  fetchLexicalCoverageByQuality,
  fetchLexicalCoverageByQuestionType,
  fetchLexicalCoverageByRisk,
  fetchLexicalCoverageRows,
  fetchLexicalCoverageSummary,
} from '../services/corpusCoverageService';
import {
  CoverageDistributionRow,
  DiscourseCoverageRow,
  DiscourseCoverageSummary,
  DuplicateExactRow,
  DuplicateSummary,
  EditorialPriorityBand,
  EditorialPriorityFilters,
  EditorialPriorityRow,
  EditorialPrioritySummary,
  LexicalCoverageFilters,
  LexicalCoverageRow,
  LexicalCoverageSummary,
} from '../types/corpusCoverage';
import { getCategoryLabel, getGrammarLabel, getQuestionTypeLabel, getReviewStatusLabel, humanizeInternalCode } from '../utils/labels';

const STATUS_FILTERS: Array<{ value: NonNullable<LexicalCoverageFilters['status']>; label: string }> = [
  { value: 'all', label: 'Guztiak' },
  { value: 'playable', label: 'Jokagarriak' },
  { value: 'non_playable', label: 'Ez-jokagarriak' },
  { value: 'high_risk', label: 'Arrisku handia' },
  { value: 'needs_external_check', label: 'Kanpo-egiaztapena' },
  { value: 'disabled_for_game', label: 'Jokotik kanpo' },
  { value: 'missing_explanation', label: 'Azalpena falta da' },
  { value: 'missing_examples', label: 'Adibidea falta da' },
];

const PRIORITY_BAND_FILTERS: Array<{ value: EditorialPriorityBand | 'all'; label: string }> = [
  { value: 'all', label: 'Lehentasun guztia' },
  { value: 'oso_handia', label: 'Oso handia' },
  { value: 'handia', label: 'Handia' },
  { value: 'ertaina', label: 'Ertaina' },
  { value: 'baxua', label: 'Baxua' },
];

function getCoverageStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'playable': return 'Prest';
    case 'inactive': return 'Ez aktibo';
    case 'disabled_for_game': return 'Jokotik kanpo';
    case 'needs_external_check': return 'Kanpo-egiaztapena';
    case 'high_risk': return 'Arrisku handia';
    case 'low_quality': return 'Kalitate baxua';
    case 'missing_quality_level': return 'Kalitate-maila falta da';
    case 'missing_question_type': return 'Galdera mota falta da';
    case 'unknown_question_type': return 'Galdera mota ezezaguna';
    case 'not_enough_words': return 'Hitz gutxiegi';
    case 'missing_explanation': return 'Azalpena falta da';
    case 'missing_examples': return 'Adibidea falta da';
    case 'not_reviewed_safe': return 'Ez dago segurutzat berrikusita';
    case 'wrong_option_count': return 'Aukera kopuru okerra';
    case 'wrong_correct_option_count': return 'Aukera zuzen kopuru okerra';
    case 'missing_question_explanation_eu': return 'Galderaren azalpena falta da';
    case 'missing_option_explanation_eu': return 'Aukeren azalpena falta da';
    case 'possible_english_in_es_fields': return 'Balizko ingelesa ES eremuetan';
    default: return humanizeInternalCode(status);
  }
}

function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('eu-ES').format(value || 0);
}

function formatPercentage(value: number | null | undefined): string {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getPriorityBandLabel(band: string | null | undefined): string {
  switch (band) {
    case 'oso_handia': return 'Oso handia';
    case 'handia': return 'Handia';
    case 'ertaina': return 'Ertaina';
    case 'baxua': return 'Baxua';
    default: return humanizeInternalCode(band);
  }
}

function getPriorityBandClass(band: string | null | undefined): string {
  switch (band) {
    case 'oso_handia': return 'bg-red-50 text-red-700 border-red-100';
    case 'handia': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'ertaina': return 'bg-sky-50 text-sky-700 border-sky-100';
    case 'baxua': return 'bg-slate-50 text-slate-600 border-slate-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
  }
}

function MetricCard({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'good' | 'warning' | 'danger' }) {
  const toneClass = {
    neutral: 'border-slate-200 bg-white text-slate-900',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-normal">{value}</p>
    </div>
  );
}

function DistributionTable({ title, rows }: { title: string; rows: CoverageDistributionRow[] }) {
  if (rows.length === 0) return null;
  const maxCount = Math.max(...rows.map((row) => row.total_count), 1);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-black text-slate-800">{title}</h3>
      <div className="space-y-2">
        {rows.slice(0, 12).map((row) => (
          <div key={`${title}-${row.label}`} className="rounded-xl border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700 truncate">{humanizeInternalCode(row.label)}</span>
              <span className="font-black text-slate-900">{formatNumber(row.playable_count)} / {formatNumber(row.total_count)}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.max(4, (row.total_count / maxCount) * 100)}%` }}
              />
            </div>
            {row.playable_percentage !== undefined && (
              <p className="mt-1 text-[10px] font-bold text-slate-400">{formatPercentage(row.playable_percentage)} jokagarri</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function exportRowsToCsv(rows: LexicalCoverageRow[]) {
  const headers = [
    'id',
    'source_id',
    'group_label',
    'level',
    'category',
    'grammar',
    'relation',
    'review_status',
    'risk_level',
    'quality_level',
    'recommended_question_type',
    'is_playable',
    'coverage_status',
    'recommended_action',
  ];
  const body = rows.map((row) => [
    row.id,
    row.source_id,
    row.group_label,
    row.reviewed_level || row.original_level,
    row.category,
    row.grammar,
    row.relation,
    row.review_status,
    row.risk_level,
    row.quality_level,
    row.recommended_question_type,
    row.is_playable,
    row.coverage_status,
    row.recommended_action,
  ].map(csvEscape).join(','));

  const blob = new Blob([[headers.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hitzkideak_corpus_coverage.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function exportEditorialPriorityToCsv(rows: EditorialPriorityRow[]) {
  const headers = [
    'id',
    'source_id',
    'group_label',
    'reviewed_level',
    'category',
    'relation',
    'recommended_question_type',
    'word_count',
    'priority_score',
    'priority_band',
    'priority_reasons',
    'editorial_next_action',
  ];
  const body = rows.map((row) => [
    row.id,
    row.source_id,
    row.group_label,
    row.reviewed_level || row.original_level,
    row.category,
    row.relation,
    row.recommended_question_type,
    row.word_count,
    row.priority_score,
    row.priority_band,
    row.priority_reasons.join(' | '),
    row.editorial_next_action,
  ].map(csvEscape).join(','));

  const blob = new Blob([[headers.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hitzkideak_editorial_priority_queue.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function exportDuplicateRowsToCsv(rows: DuplicateExactRow[]) {
  const headers = [
    'normalized_word_set',
    'duplicate_count',
    'group_ids',
    'source_ids',
    'labels',
    'quality_levels',
    'review_statuses',
    'active_flags',
    'playable_flags',
  ];
  const body = rows.map((row) => [
    row.normalized_word_set,
    row.duplicate_count,
    row.group_ids.join(' | '),
    row.source_ids.map((value) => value ?? '').join(' | '),
    row.labels.map((value) => value ?? '').join(' | '),
    row.quality_levels.map((value) => value ?? '').join(' | '),
    row.review_statuses.map((value) => value ?? '').join(' | '),
    row.active_flags.join(' | '),
    row.playable_flags.join(' | '),
  ].map(csvEscape).join(','));

  const blob = new Blob([[headers.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hitzkideak_duplicate_audit.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminCorpusCoveragePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [missingView, setMissingView] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<LexicalCoverageSummary | null>(null);
  const [rows, setRows] = useState<LexicalCoverageRow[]>([]);
  const [byLevel, setByLevel] = useState<CoverageDistributionRow[]>([]);
  const [byCategory, setByCategory] = useState<CoverageDistributionRow[]>([]);
  const [byQuestionType, setByQuestionType] = useState<CoverageDistributionRow[]>([]);
  const [byQuality, setByQuality] = useState<CoverageDistributionRow[]>([]);
  const [byRisk, setByRisk] = useState<CoverageDistributionRow[]>([]);
  const [discourseSummary, setDiscourseSummary] = useState<DiscourseCoverageSummary | null>(null);
  const [discourseRows, setDiscourseRows] = useState<DiscourseCoverageRow[]>([]);
  const [discourseMissingView, setDiscourseMissingView] = useState(false);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityMissingView, setPriorityMissingView] = useState(false);
  const [priorityErrorMessage, setPriorityErrorMessage] = useState<string | null>(null);
  const [prioritySummary, setPrioritySummary] = useState<EditorialPrioritySummary | null>(null);
  const [priorityRows, setPriorityRows] = useState<EditorialPriorityRow[]>([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateMissingView, setDuplicateMissingView] = useState(false);
  const [duplicateErrorMessage, setDuplicateErrorMessage] = useState<string | null>(null);
  const [duplicateSummary, setDuplicateSummary] = useState<DuplicateSummary | null>(null);
  const [duplicateRows, setDuplicateRows] = useState<DuplicateExactRow[]>([]);
  const [filters, setFilters] = useState<LexicalCoverageFilters>({
    status: 'all',
    level: 'all',
    category: 'all',
    questionType: 'all',
    limit: 500,
    offset: 0,
  });
  const [priorityFilters, setPriorityFilters] = useState<EditorialPriorityFilters>({
    priorityBand: 'all',
    level: 'all',
    category: 'all',
    questionType: 'all',
    limit: 200,
    offset: 0,
  });

  const levelOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.reviewed_level || row.original_level).filter(Boolean))) as string[], [rows]);
  const categoryOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.category).filter(Boolean))) as string[], [rows]);
  const questionTypeOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.recommended_question_type).filter(Boolean))) as string[], [rows]);
  const priorityLevelOptions = useMemo(() => Array.from(new Set([...rows, ...priorityRows].map((row) => row.reviewed_level || row.original_level).filter(Boolean))) as string[], [rows, priorityRows]);
  const priorityCategoryOptions = useMemo(() => Array.from(new Set([...rows, ...priorityRows].map((row) => row.category).filter(Boolean))) as string[], [rows, priorityRows]);
  const priorityQuestionTypeOptions = useMemo(() => Array.from(new Set([...rows, ...priorityRows].map((row) => row.recommended_question_type).filter(Boolean))) as string[], [rows, priorityRows]);
  const priorityGroupIds = useMemo(() => new Set(priorityRows.map((row) => row.id)), [priorityRows]);

  const loadRows = async (nextFilters: LexicalCoverageFilters = filters) => {
    if (missingView) return;
    setRowsLoading(true);
    setErrorMessage(null);
    const result = await fetchLexicalCoverageRows(nextFilters);
    setRows(result.data);
    setMissingView(result.missingView);
    if (result.error && !result.missingView) {
      setErrorMessage(result.error);
    }
    setRowsLoading(false);
  };

  const loadPriorityRows = async (nextFilters: EditorialPriorityFilters = priorityFilters) => {
    if (priorityMissingView) return;
    setPriorityLoading(true);
    setPriorityErrorMessage(null);
    const result = await fetchEditorialPriorityQueue(nextFilters);
    setPriorityRows(result.data);
    setPriorityMissingView(result.missingView);
    if (result.error && !result.missingView) {
      setPriorityErrorMessage(result.error);
    }
    setPriorityLoading(false);
  };

  const loadDuplicates = async () => {
    setDuplicateLoading(true);
    setDuplicateErrorMessage(null);
    const [summaryResult, rowsResult] = await Promise.all([
      fetchDuplicateSummary(),
      fetchDuplicateExactRows({ limit: 200 }),
    ]);

    setDuplicateSummary(summaryResult.data);
    setDuplicateRows(rowsResult.data);
    setDuplicateMissingView(summaryResult.missingView || rowsResult.missingView);
    setDuplicateErrorMessage(
      [summaryResult, rowsResult].find((result) => result.error && !result.missingView)?.error || null
    );
    setDuplicateLoading(false);
  };

  const loadAll = async () => {
    setLoading(true);
    setErrorMessage(null);
    setPriorityErrorMessage(null);
    setDuplicateErrorMessage(null);
    setMissingView(false);
    setDiscourseMissingView(false);
    setPriorityMissingView(false);
    setDuplicateMissingView(false);

    const summaryResult = await fetchLexicalCoverageSummary();

    setSummary(summaryResult.data);
    if (summaryResult.missingView) {
      setRows([]);
      setByLevel([]);
      setByCategory([]);
      setByQuestionType([]);
      setByQuality([]);
      setByRisk([]);
      setDiscourseSummary(null);
      setDiscourseRows([]);
      setPrioritySummary(null);
      setPriorityRows([]);
      setDuplicateSummary(null);
      setDuplicateRows([]);
      setMissingView(true);
      setLoading(false);
      return;
    }

    if (summaryResult.error) {
      setErrorMessage(summaryResult.error);
      setLoading(false);
      return;
    }

    const [rowsResult, levelResult, categoryResult, questionTypeResult, qualityResult, riskResult] = await Promise.all([
      fetchLexicalCoverageRows(filters),
      fetchLexicalCoverageByLevel(),
      fetchLexicalCoverageByCategory(),
      fetchLexicalCoverageByQuestionType(),
      fetchLexicalCoverageByQuality(),
      fetchLexicalCoverageByRisk(),
    ]);

    const discourseSummaryResult = await fetchDiscourseCoverageSummary();
    const discourseRowsResult = discourseSummaryResult.missingView || !discourseSummaryResult.data
      ? null
      : await fetchDiscourseCoverageRows({ limit: 200 });
    const prioritySummaryResult = await fetchEditorialPrioritySummary();
    const priorityRowsResult = prioritySummaryResult.missingView || !prioritySummaryResult.data
      ? null
      : await fetchEditorialPriorityQueue(priorityFilters);
    const [duplicateSummaryResult, duplicateRowsResult] = await Promise.all([
      fetchDuplicateSummary(),
      fetchDuplicateExactRows({ limit: 200 }),
    ]);

    setRows(rowsResult.data);
    setByLevel(levelResult.data);
    setByCategory(categoryResult.data);
    setByQuestionType(questionTypeResult.data);
    setByQuality(qualityResult.data);
    setByRisk(riskResult.data);
    setDiscourseSummary(discourseSummaryResult.data);
    setDiscourseRows(discourseRowsResult?.data || []);
    setDiscourseMissingView(discourseSummaryResult.missingView || Boolean(discourseRowsResult?.missingView));
    setPrioritySummary(prioritySummaryResult.data);
    setPriorityRows(priorityRowsResult?.data || []);
    setPriorityMissingView(prioritySummaryResult.missingView || Boolean(priorityRowsResult?.missingView));
    setPriorityErrorMessage(
      [prioritySummaryResult, priorityRowsResult].find((result) => result?.error && !result.missingView)?.error || null
    );
    setDuplicateSummary(duplicateSummaryResult.data);
    setDuplicateRows(duplicateRowsResult.data);
    setDuplicateMissingView(duplicateSummaryResult.missingView || duplicateRowsResult.missingView);
    setDuplicateErrorMessage(
      [duplicateSummaryResult, duplicateRowsResult].find((result) => result.error && !result.missingView)?.error || null
    );

    const lexicalMissingView = summaryResult.missingView || rowsResult.missingView;
    setMissingView(lexicalMissingView);
    const firstError = [
      summaryResult,
      rowsResult,
      levelResult,
      categoryResult,
      questionTypeResult,
      qualityResult,
      riskResult,
    ].find((result) => result.error && !result.missingView)?.error;
    setErrorMessage(firstError || null);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilters = (patch: Partial<LexicalCoverageFilters>) => {
    const nextFilters = { ...filters, ...patch, offset: 0 };
    setFilters(nextFilters);
    void loadRows(nextFilters);
  };

  const updatePriorityFilters = (patch: Partial<EditorialPriorityFilters>) => {
    const nextFilters = { ...priorityFilters, ...patch, offset: 0 };
    setPriorityFilters(nextFilters);
    void loadPriorityRows(nextFilters);
  };

  if (loading) {
    return <LoadingState message="Corpusaren estaldura kargatzen..." />;
  }

  if (missingView) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
          <ArrowLeft size={16} />
          Itzuli
        </button>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-black">Estaldura-datuak ez daude oraindik eskuragarri. Exekutatu migrazioa lehenik.</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
          <ArrowLeft size={16} />
          Itzuli
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <p className="font-black">Ezin izan da corpusaren estaldura kargatu.</p>
          <p className="mt-2 text-sm font-semibold">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 font-bold">
        Ez dago corpus-daturik erakusteko.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={() => void loadAll()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          Freskatu
        </button>
      </div>

      <header className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Hitzkideak v0.5-corpus-coverage-panel</p>
        <h2 className="text-3xl font-black text-slate-900 tracking-normal">Corpusaren estaldura</h2>
        <p className="text-sm font-semibold leading-relaxed text-slate-500">
          Barne-panela: corpusaren kalitatea, erabilgarritasuna eta jokoan sartzeko prestasuna aztertzeko.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Corpus osoa" value={formatNumber(summary.total_groups)} />
        <MetricCard label="Aktiboak" value={formatNumber(summary.active_groups)} />
        <MetricCard label="Jokagarriak" value={formatNumber(summary.playable_groups)} tone="good" />
        <MetricCard label="Blokeatuta" value={formatNumber(summary.non_playable_groups)} tone="warning" />
        <MetricCard label="Estaldura" value={formatPercentage(summary.playable_percentage)} tone="good" />
        <MetricCard label="Platinum" value={formatNumber(summary.platinum_count)} />
        <MetricCard label="Silver oinarrizkoa" value={formatNumber(summary.silver_count)} tone="good" />
        <MetricCard label="High risk" value={formatNumber(summary.high_risk_count)} tone="danger" />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-amber-500" />
          <h3 className="text-lg font-black text-slate-900">Blokeo nagusiak</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <MetricCard label="Jokotik kanpo" value={formatNumber(summary.disabled_for_game_count)} />
          <MetricCard label="Kanpo-egiaztapena" value={formatNumber(summary.needs_external_check_count)} />
          <MetricCard label="Arrisku handia" value={formatNumber(summary.high_risk_count)} tone="danger" />
          <MetricCard label="Kalitate baxua" value={formatNumber(summary.low_quality_count)} tone="warning" />
          <MetricCard label="Kalitate-maila falta da" value={formatNumber(summary.missing_quality_level_count)} tone="warning" />
          <MetricCard label="Galdera mota falta da" value={formatNumber(summary.missing_question_type_count)} />
          <MetricCard label="Galdera mota ezezaguna" value={formatNumber(summary.unknown_question_type_count)} />
          <MetricCard label="Hitz gutxiegi" value={formatNumber(summary.not_enough_words_count)} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-black text-slate-900">Hobekuntza editorialak</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Oinarrizko jokagarriak" value={formatNumber(summary.playable_basic_count)} tone="good" />
          <MetricCard label="Premium jokagarriak" value={formatNumber(summary.playable_premium_count)} tone="good" />
          <MetricCard label="Azalpena falta da" value={formatNumber(summary.missing_explanation_count)} tone="warning" />
          <MetricCard label="Adibidea falta da" value={formatNumber(summary.missing_examples_count)} tone="warning" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">Lehentasun editoriala</h3>
            <p className="text-sm font-semibold leading-relaxed text-slate-500">
              Jokoan sar daitezkeen baina oraindik premium ez diren taldeak lehenesteko zerrenda.
            </p>
          </div>
          <button
            onClick={() => exportEditorialPriorityToCsv(priorityRows)}
            disabled={priorityRows.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40"
          >
            <Download size={14} />
            Lehentasun editoriala CSV
          </button>
        </div>

        {priorityMissingView ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">
            Lehentasun editorialaren datuak ez daude oraindik eskuragarri. Exekutatu migrazioa lehenik.
          </div>
        ) : priorityErrorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-900">
            Ezin izan da lehentasun editoriala kargatu.
          </div>
        ) : prioritySummary ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Lehentasunezko taldeak" value={formatNumber(prioritySummary.total_priority_items)} />
              <MetricCard label="Oso handia" value={formatNumber(prioritySummary.very_high_priority_count)} tone="danger" />
              <MetricCard label="Handia" value={formatNumber(prioritySummary.high_priority_count)} tone="warning" />
              <MetricCard label="Ertaina" value={formatNumber(prioritySummary.medium_priority_count)} />
              <MetricCard label="Batez besteko puntuazioa" value={Number(prioritySummary.average_priority_score || 0).toFixed(1)} />
              <MetricCard label="Azalpena falta zaie" value={formatNumber(prioritySummary.missing_explanation_in_priority_count)} tone="warning" />
              <MetricCard label="Adibidea falta zaie" value={formatNumber(prioritySummary.missing_example_in_priority_count)} tone="warning" />
              <MetricCard label="Kontrastea falta zaie" value={formatNumber(prioritySummary.missing_contrast_in_priority_count)} tone="warning" />
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <select value={priorityFilters.priorityBand || 'all'} onChange={(event) => updatePriorityFilters({ priorityBand: event.target.value as EditorialPriorityFilters['priorityBand'] })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold">
                {PRIORITY_BAND_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
              </select>
              <select value={priorityFilters.level || 'all'} onChange={(event) => updatePriorityFilters({ level: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold">
                <option value="all">Maila guztiak</option>
                {priorityLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
              <select value={priorityFilters.category || 'all'} onChange={(event) => updatePriorityFilters({ category: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold">
                <option value="all">Kategoria guztiak</option>
                {priorityCategoryOptions.map((category) => <option key={category} value={category}>{getCategoryLabel(category)}</option>)}
              </select>
              <select value={priorityFilters.questionType || 'all'} onChange={(event) => updatePriorityFilters({ questionType: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold">
                <option value="all">Galdera mota guztiak</option>
                {priorityQuestionTypeOptions.map((type) => <option key={type} value={type}>{getQuestionTypeLabel(type)}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => updatePriorityFilters({ missingExplanationOnly: !priorityFilters.missingExplanationOnly })} className={`rounded-full border px-3 py-2 text-[11px] font-black ${priorityFilters.missingExplanationOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-500'}`}>
                Azalpena falta da
              </button>
              <button onClick={() => updatePriorityFilters({ missingExampleOnly: !priorityFilters.missingExampleOnly })} className={`rounded-full border px-3 py-2 text-[11px] font-black ${priorityFilters.missingExampleOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-500'}`}>
                Adibidea falta da
              </button>
              <button onClick={() => updatePriorityFilters({ missingContrastOnly: !priorityFilters.missingContrastOnly })} className={`rounded-full border px-3 py-2 text-[11px] font-black ${priorityFilters.missingContrastOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-500'}`}>
                Kontrastea falta da
              </button>
            </div>

            {priorityLoading ? (
              <LoadingState message="Lehentasun editoriala kargatzen..." />
            ) : priorityRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 font-bold">Ez dago lehentasun editorialik erakusteko.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-[1180px] w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-3 py-3">ID</th>
                      <th className="px-3 py-3">source_id</th>
                      <th className="px-3 py-3">Taldea</th>
                      <th className="px-3 py-3">Maila</th>
                      <th className="px-3 py-3">Kategoria</th>
                      <th className="px-3 py-3">Erlazioa</th>
                      <th className="px-3 py-3">Galdera mota</th>
                      <th className="px-3 py-3">Hitz kopurua</th>
                      <th className="px-3 py-3">Puntuazioa</th>
                      <th className="px-3 py-3">Lehentasuna</th>
                      <th className="px-3 py-3">Arrazoiak</th>
                      <th className="px-3 py-3">Hurrengo ekintza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priorityRows.map((row) => (
                      <tr key={`priority-${row.id}`} className="align-top">
                        <td className="px-3 py-3 font-black text-slate-900">{row.id}</td>
                        <td className="px-3 py-3 text-slate-500">{row.source_id || '-'}</td>
                        <td className="px-3 py-3 font-bold text-slate-800 max-w-[240px]">{row.group_label || row.concept || '-'}</td>
                        <td className="px-3 py-3">{row.reviewed_level || row.original_level || '-'}</td>
                        <td className="px-3 py-3">{getCategoryLabel(row.category) || '-'}</td>
                        <td className="px-3 py-3">{humanizeInternalCode(row.relation) || '-'}</td>
                        <td className="px-3 py-3">{getQuestionTypeLabel(row.recommended_question_type) || '-'}</td>
                        <td className="px-3 py-3 font-black">{row.word_count}</td>
                        <td className="px-3 py-3 font-black text-slate-900">{row.priority_score}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${getPriorityBandClass(row.priority_band)}`}>
                            {getPriorityBandLabel(row.priority_band)}
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[300px]">
                          <div className="flex flex-wrap gap-1">
                            {row.priority_reasons.map((reason) => (
                              <span key={`${row.id}-${reason}`} className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 max-w-[260px] text-slate-600">{row.editorial_next_action || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 font-bold">Ez dago lehentasun editorialik erakusteko.</div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">Bikoiztu editorialak</h3>
            <p className="text-sm font-semibold leading-relaxed text-slate-500">
              Hitz multzo berdinak edo errepikatuak detektatzeko barne-auditoria.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => void loadDuplicates()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Freskatu
            </button>
            <button
              onClick={() => exportDuplicateRowsToCsv(duplicateRows)}
              disabled={duplicateRows.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white disabled:opacity-40"
            >
              <Download size={14} />
              Bikoiztuak CSV
            </button>
          </div>
        </div>

        {duplicateMissingView ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">
            Bikoiztuen datuak ez daude oraindik eskuragarri. Exekutatu migrazioa lehenik.
          </div>
        ) : duplicateErrorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-900">
            Ezin izan da bikoiztuen auditoria kargatu.
          </div>
        ) : duplicateSummary ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <MetricCard label="Multzo bikoiztuak" value={formatNumber(duplicateSummary.duplicate_set_count)} tone="warning" />
              <MetricCard label="Talde bikoiztuak" value={formatNumber(duplicateSummary.duplicated_group_count)} tone="warning" />
              <MetricCard label="Aktibo bikoiztuak" value={formatNumber(duplicateSummary.active_duplicated_group_count)} tone="warning" />
              <MetricCard label="Jokagarri bikoiztuak" value={formatNumber(duplicateSummary.playable_duplicated_group_count)} tone="danger" />
              <MetricCard label="Ebatzi gabe" value={formatNumber(duplicateSummary.pending_duplicate_set_count)} tone="warning" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-sm font-black text-slate-900">Ebazpen kontrolatua</h4>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                Duplicatuak eskuz berrikusi ondoren bakarrik desaktibatu behar dira. Funtzio honek ez du daturik ezabatzen;
                talde bikoiztu ez-kanonikoak jokotik kanpo uzten ditu.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dry run</p>
                  <code className="mt-2 block whitespace-pre-wrap text-xs font-bold text-slate-700">
                    select * from public.resolve_lexical_exact_duplicates(true);
                  </code>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Aplikatu eskuz</p>
                  <code className="mt-2 block whitespace-pre-wrap text-xs font-bold text-slate-700">
                    select * from public.resolve_lexical_exact_duplicates(false);
                  </code>
                </div>
              </div>
            </div>

            {duplicateLoading ? (
              <LoadingState message="Bikoiztuen auditoria kargatzen..." />
            ) : duplicateRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 font-bold">Ez dago bikoizturik erakusteko.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-[1180px] w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Hitz multzoa</th>
                      <th className="px-3 py-3">Kop.</th>
                      <th className="px-3 py-3">group_ids</th>
                      <th className="px-3 py-3">source_ids</th>
                      <th className="px-3 py-3">Etiketak</th>
                      <th className="px-3 py-3">Kalitatea</th>
                      <th className="px-3 py-3">review_status</th>
                      <th className="px-3 py-3">Aktibo</th>
                      <th className="px-3 py-3">Jokagarri</th>
                      <th className="px-3 py-3">Oharrak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {duplicateRows.map((row) => {
                      const hasPlayableDuplicate = row.playable_flags.filter(Boolean).length > 1;
                      const hasPriorityDuplicate = row.group_ids.some((id) => priorityGroupIds.has(id));
                      const isLargeDuplicateSet = row.duplicate_count >= 4;
                      return (
                        <tr key={row.normalized_word_set} className={`align-top ${isLargeDuplicateSet || hasPlayableDuplicate ? 'bg-amber-50/40' : ''}`}>
                          <td className="px-3 py-3 font-black text-slate-900 max-w-[240px]">{row.normalized_word_set}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isLargeDuplicateSet ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
                              {row.duplicate_count}
                            </span>
                          </td>
                          <td className="px-3 py-3">{row.group_ids.join(' / ')}</td>
                          <td className="px-3 py-3">{row.source_ids.map((value) => value ?? '-').join(' / ')}</td>
                          <td className="px-3 py-3 max-w-[260px]">{row.labels.map((value) => value || '-').join(' | ')}</td>
                          <td className="px-3 py-3">{row.quality_levels.map((value) => value || '-').join(' / ')}</td>
                          <td className="px-3 py-3">{row.review_statuses.map((value) => getReviewStatusLabel(value) || '-').join(' / ')}</td>
                          <td className="px-3 py-3">{row.active_flags.map((value) => value ? 'Bai' : 'Ez').join(' / ')}</td>
                          <td className="px-3 py-3">{row.playable_flags.map((value) => value ? 'Bai' : 'Ez').join(' / ')}</td>
                          <td className="px-3 py-3 max-w-[240px]">
                            <div className="flex flex-wrap gap-1">
                              {isLargeDuplicateSet && <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">4+ aldiz</span>}
                              {hasPlayableDuplicate && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">Jokagarri errepikatuak</span>}
                              {hasPriorityDuplicate && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Lehentasun ilaran</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 font-bold">Ez dago bikoizturik erakusteko.</div>
        )}
      </section>

      <section className="space-y-5">
        <h3 className="text-lg font-black text-slate-900">Banaketak</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <DistributionTable title="Mailaka" rows={byLevel} />
          <DistributionTable title="Kategoriaka" rows={byCategory} />
          <DistributionTable title="Galdera motaren arabera" rows={byQuestionType} />
          <DistributionTable title="Quality level" rows={byQuality} />
          <DistributionTable title="Risk level" rows={byRisk} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Table2 size={18} className="text-slate-500" />
            <h3 className="text-lg font-black text-slate-900">Lexical groups</h3>
          </div>
          <button
            onClick={() => exportRowsToCsv(rows)}
            disabled={rows.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white disabled:opacity-40"
          >
            <Download size={14} />
            CSV esportatu
          </button>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <select value={filters.status || 'all'} onChange={(event) => updateFilters({ status: event.target.value as LexicalCoverageFilters['status'] })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold">
            {STATUS_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
          <select value={filters.level || 'all'} onChange={(event) => updateFilters({ level: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold">
            <option value="all">Maila guztiak</option>
            {levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
          <select value={filters.category || 'all'} onChange={(event) => updateFilters({ category: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold">
            <option value="all">Kategoria guztiak</option>
            {categoryOptions.map((category) => <option key={category} value={category}>{getCategoryLabel(category)}</option>)}
          </select>
          <select value={filters.questionType || 'all'} onChange={(event) => updateFilters({ questionType: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold">
            <option value="all">Galdera mota guztiak</option>
            {questionTypeOptions.map((type) => <option key={type} value={type}>{getQuestionTypeLabel(type)}</option>)}
          </select>
        </div>

        {rowsLoading ? (
          <LoadingState message="Taula kargatzen..." />
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 font-bold">Ez dago corpus-daturik erakusteko.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-[1180px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">source_id</th>
                  <th className="px-3 py-3">Taldea</th>
                  <th className="px-3 py-3">Maila</th>
                  <th className="px-3 py-3">Kategoria</th>
                  <th className="px-3 py-3">Gramatika</th>
                  <th className="px-3 py-3">Erlazioa</th>
                  <th className="px-3 py-3">review_status</th>
                  <th className="px-3 py-3">risk_level</th>
                  <th className="px-3 py-3">quality_level</th>
                  <th className="px-3 py-3">Galdera mota</th>
                  <th className="px-3 py-3">Jokagarria</th>
                  <th className="px-3 py-3">Egoera</th>
                  <th className="px-3 py-3">Ekintza gomendatua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-3 py-3 font-black text-slate-900">{row.id}</td>
                    <td className="px-3 py-3 text-slate-500">{row.source_id || '-'}</td>
                    <td className="px-3 py-3 font-bold text-slate-800 max-w-[240px]">{row.group_label || row.concept || '-'}</td>
                    <td className="px-3 py-3">{row.reviewed_level || row.original_level || '-'}</td>
                    <td className="px-3 py-3">{getCategoryLabel(row.category) || '-'}</td>
                    <td className="px-3 py-3">{getGrammarLabel(row.grammar) || '-'}</td>
                    <td className="px-3 py-3">{humanizeInternalCode(row.relation) || '-'}</td>
                    <td className="px-3 py-3">{getReviewStatusLabel(row.review_status) || '-'}</td>
                    <td className="px-3 py-3">{row.risk_level || '-'}</td>
                    <td className="px-3 py-3">{row.quality_level || '-'}</td>
                    <td className="px-3 py-3">{getQuestionTypeLabel(row.recommended_question_type) || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${row.is_playable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {row.is_playable ? 'Bai' : 'Ez'}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold">{getCoverageStatusLabel(row.coverage_status)}</td>
                    <td className="px-3 py-3 text-slate-600 max-w-[260px]">{row.recommended_action || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!discourseMissingView && discourseSummary && (
        <section className="space-y-4">
          <h3 className="text-lg font-black text-slate-900">Antolatzaileak</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Galderak guztira" value={formatNumber(discourseSummary.total_questions)} />
            <MetricCard label="Galdera aktiboak" value={formatNumber(discourseSummary.active_questions)} />
            <MetricCard label="Jokagarriak" value={formatNumber(discourseSummary.playable_questions)} tone="good" />
            <MetricCard label="4 aukera dituztenak" value={formatNumber(discourseSummary.four_option_questions)} />
            <MetricCard label="Aukera zuzen bakarra" value={formatNumber(discourseSummary.single_correct_option_questions)} />
            <MetricCard label="Azalpenik gabe" value={formatNumber(discourseSummary.missing_explanation_count)} tone="warning" />
            <MetricCard label="Balizko ingelesa ES eremuetan" value={formatNumber(discourseSummary.possible_english_in_es_fields_count)} tone="warning" />
          </div>

          {discourseRows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-3 py-3">question_id</th>
                    <th className="px-3 py-3">Erantzuna</th>
                    <th className="px-3 py-3">Maila</th>
                    <th className="px-3 py-3">Funtzio diskurtsiboa</th>
                    <th className="px-3 py-3">Aukerak</th>
                    <th className="px-3 py-3">Zuzenak</th>
                    <th className="px-3 py-3">Jokagarria</th>
                    <th className="px-3 py-3">Egoera</th>
                    <th className="px-3 py-3">Ekintza gomendatua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discourseRows.map((row) => (
                    <tr key={row.question_id}>
                      <td className="px-3 py-3 font-black">{row.question_id}</td>
                      <td className="px-3 py-3 font-bold">{row.answer || '-'}</td>
                      <td className="px-3 py-3">{row.level || '-'}</td>
                      <td className="px-3 py-3">{humanizeInternalCode(row.discursive_function) || '-'}</td>
                      <td className="px-3 py-3">{row.option_count}</td>
                      <td className="px-3 py-3">{row.correct_option_count}</td>
                      <td className="px-3 py-3">{row.is_playable ? 'Bai' : 'Ez'}</td>
                      <td className="px-3 py-3 font-bold">{getCoverageStatusLabel(row.coverage_status)}</td>
                      <td className="px-3 py-3 max-w-[260px] text-slate-600">{row.recommended_action || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
