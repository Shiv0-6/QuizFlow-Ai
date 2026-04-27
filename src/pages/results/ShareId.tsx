import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, Trophy, Users, Clock, TrendingUp,
  Zap, Copy, Check, RefreshCw, ChevronDown, ChevronUp,
  Medal, Share2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
interface AttemptRow {
  id: number;
  participantName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds: number;
  completedAt: string;
}

interface ResultsData {
  quiz: {
    shareId: string;
    title: string;
    description?: string;
    questionCount: number;
    createdAt: string;
  };
  stats: {
    totalAttempts: number;
    avgScore: number;
    highScore: number;
    totalQuestions: number;
  };
  attempts: AttemptRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────
function formatTime(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Medal size={14} style={{ color: '#FBBF24' }} />;
  if (rank === 2) return <Medal size={14} style={{ color: '#94A3B8' }} />;
  if (rank === 3) return <Medal size={14} style={{ color: '#CD7C2F' }} />;
  return <span className="text-xs font-bold" style={{ color: '#4B5A7A' }}>#{rank}</span>;
}

function getScoreColor(pct: number) {
  if (pct >= 80) return '#34D399';
  if (pct >= 50) return '#60A5FA';
  return '#F87171';
}

// ─── Stat Card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div
      className="rounded-3xl p-6 border flex flex-col gap-4 backdrop-blur-md transition-transform hover:scale-[1.02] relative overflow-hidden group"
      style={{ background: 'rgba(20, 20, 25, 0.6)', borderColor: 'rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 70%)' }} />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center relative z-10"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Icon size={18} style={{ color: color ?? '#6366F1' }} />
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: color ?? '#FFFFFF' }}>
          {value}
        </p>
        <p className="text-sm font-bold uppercase tracking-wider mt-1" style={{ color: '#64748B' }}>{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color: '#475569' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────
function ScoreBar({ pct }: { pct: number }) {
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' as const, delay: 0.1 }}
        style={{ background: `linear-gradient(90deg, ${getScoreColor(pct)}, ${getScoreColor(pct)}99)` }}
      />
    </div>
  );
}

// ─── Results Page ─────────────────────────────────────────────────────
export default function ResultsPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'date'>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedResults, setCopiedResults] = useState(false);

  const fetchResults = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`/api/quizzes/${shareId}/results?token=${encodeURIComponent(token)}`);
      const json = await res.json() as ResultsData & { error?: string; message?: string };
      if (!res.ok) {
        setError(json.message ?? 'Failed to load results.');
      } else {
        setData(json);
        setError('');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchResults(); }, [shareId, token]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(() => fetchResults(true), 15000);
    return () => clearInterval(interval);
  }, [shareId, token]);

  const handleSort = (col: 'score' | 'time' | 'date') => {
    if (sortBy === col) setSortAsc((v) => !v);
    else { setSortBy(col); setSortAsc(false); }
  };

  const sortedAttempts = data
    ? [...data.attempts].sort((a, b) => {
        let diff = 0;
        if (sortBy === 'score') diff = b.percentage - a.percentage;
        else if (sortBy === 'time') diff = a.timeTakenSeconds - b.timeTakenSeconds;
        else diff = new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        return sortAsc ? -diff : diff;
      })
    : [];

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const quizUrl = `${origin}/quiz/${shareId}`;
  const resultsUrl = `${origin}/results/${shareId}?token=${token}`;

  const copyShare = async () => {
    await navigator.clipboard.writeText(quizUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const copyResults = async () => {
    await navigator.clipboard.writeText(resultsUrl);
    setCopiedResults(true);
    setTimeout(() => setCopiedResults(false), 2500);
  };

  // ── Render ──
  return (
    <>
      <title>{data ? `Results: ${data.quiz.title} — QuizFlow AI` : 'Results — QuizFlow AI'}</title>

      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        {/* Grid bg */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
        }} />

        {/* Top bar */}
        <div className="relative z-10 border-b px-6 py-4 flex items-center justify-between backdrop-blur-xl"
          style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(10,10,15,0.7)' }}>
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #3B82F6)' }}>
              <Zap size={14} className="text-white" fill="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 800 }}>
              QuizFlow <span style={{ background: 'linear-gradient(135deg, #A78BFA, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchResults(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-300 hover:scale-105 disabled:opacity-50"
              style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', color: '#60A5FA' }}
            >
              <motion.div animate={refreshing ? { rotate: 360 } : {}}
                transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' as const }}>
                <RefreshCw size={12} />
              </motion.div>
              Refresh
            </button>
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-24">
              <motion.div className="w-10 h-10 border-2 rounded-full"
                style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3B82F6' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' as const }}
              />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-24">
              <p className="text-lg font-semibold mb-2" style={{ color: '#F87171' }}>Access Denied</p>
              <p className="text-sm mb-6 max-w-sm" style={{ color: '#8B9CC8' }}>{error}</p>
              <Link to="/" className="text-sm font-medium" style={{ color: '#3B82F6' }}>← Create a new quiz</Link>
            </motion.div>
          )}

          {/* Content */}
          {!loading && !error && data && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

                {/* Header */}
                <div className="mb-10">
                  <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={18} style={{ color: '#8B5CF6' }} />
                        <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#8B5CF6' }}>
                          Results Dashboard
                        </span>
                      </div>
                      <h1 className="text-4xl md:text-5xl font-extrabold mb-3" style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF' }}>
                        {data.quiz.title}
                      </h1>
                      <p className="text-base font-medium" style={{ color: '#94A3B8' }}>
                        {data.quiz.questionCount} questions · Created {formatDate(data.quiz.createdAt)}
                      </p>
                    </div>

                    {/* Auto-refresh badge */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399' }}>
                      <motion.div className="w-2 h-2 rounded-full bg-green-400"
                        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }} />
                      Live Updating
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                  <StatCard icon={Users} label="Participants" value={data.stats.totalAttempts} />
                  <StatCard icon={TrendingUp} label="Avg Score" value={`${data.stats.avgScore}%`}
                    color={getScoreColor(data.stats.avgScore)} />
                  <StatCard icon={Trophy} label="High Score"
                    value={`${data.stats.highScore}/${data.stats.totalQuestions}`}
                    color="#FBBF24" />
                  <StatCard icon={BarChart3} label="Questions" value={data.stats.totalQuestions} />
                </div>

                {/* Share links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                  {/* Quiz link */}
                  <div className="rounded-2xl p-4 border"
                    style={{ background: 'rgba(18,18,42,0.85)', borderColor: 'rgba(59,130,246,0.15)' }}>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#8B9CC8' }}>
                      <Share2 size={11} /> Share quiz link
                    </p>
                    <div className="flex gap-2">
                      <input readOnly value={quizUrl}
                        className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ background: 'rgba(10,10,24,0.8)', color: '#8B9CC8', border: '1px solid rgba(59,130,246,0.2)', fontFamily: 'monospace' }} />
                      <button onClick={copyShare}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={{
                          background: copiedShare ? 'rgba(16,185,129,0.15)' : 'rgba(37,99,235,0.15)',
                          color: copiedShare ? '#34D399' : '#60A5FA',
                          border: `1px solid ${copiedShare ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                        }}>
                        {copiedShare ? <Check size={11} /> : <Copy size={11} />}
                        {copiedShare ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Results link */}
                  <div className="rounded-2xl p-4 border"
                    style={{ background: 'rgba(18,18,42,0.85)', borderColor: 'rgba(59,130,246,0.15)' }}>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#8B9CC8' }}>
                      <BarChart3 size={11} /> Your results link (private)
                    </p>
                    <div className="flex gap-2">
                      <input readOnly value={resultsUrl}
                        className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ background: 'rgba(10,10,24,0.8)', color: '#8B9CC8', border: '1px solid rgba(59,130,246,0.2)', fontFamily: 'monospace' }} />
                      <button onClick={copyResults}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={{
                          background: copiedResults ? 'rgba(16,185,129,0.15)' : 'rgba(37,99,235,0.15)',
                          color: copiedResults ? '#34D399' : '#60A5FA',
                          border: `1px solid ${copiedResults ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                        }}>
                        {copiedResults ? <Check size={11} /> : <Copy size={11} />}
                        {copiedResults ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="rounded-2xl border overflow-hidden"
                  style={{ background: 'rgba(18,18,42,0.85)', borderColor: 'rgba(59,130,246,0.15)' }}>

                  {/* Table header */}
                  <div className="px-6 py-4 border-b flex items-center justify-between"
                    style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
                    <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF' }}>
                      Leaderboard
                    </h2>
                    <span className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(37,99,235,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {data.stats.totalAttempts} attempt{data.stats.totalAttempts !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {data.stats.totalAttempts === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center px-6">
                      <Users size={32} style={{ color: '#2D3A5C' }} className="mb-3" />
                      <p className="text-sm font-medium" style={{ color: '#4B5A7A' }}>No attempts yet</p>
                      <p className="text-xs mt-1" style={{ color: '#2D3A5C' }}>Share the quiz link to get started</p>
                    </div>
                  ) : (
                    <>
                      {/* Sort row */}
                      <div className="grid grid-cols-12 px-6 py-2.5 border-b text-xs font-semibold"
                        style={{ borderColor: 'rgba(59,130,246,0.08)', color: '#4B5A7A' }}>
                        <div className="col-span-1">#</div>
                        <div className="col-span-4">Name</div>
                        <div className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('score')}>
                          Score
                          {sortBy === 'score' ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null}
                        </div>
                        <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('time')}>
                          Time
                          {sortBy === 'time' ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null}
                        </div>
                        <div className="col-span-2 hidden md:flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('date')}>
                          When
                          {sortBy === 'date' ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null}
                        </div>
                      </div>

                      {/* Rows */}
                      {sortedAttempts.map((attempt, i) => (
                        <motion.div
                          key={attempt.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.3 }}
                          className="grid grid-cols-12 px-6 py-4 border-b items-center"
                          style={{
                            borderColor: 'rgba(59,130,246,0.06)',
                            background: i === 0 && sortBy === 'score' && !sortAsc
                              ? 'rgba(251,191,36,0.04)' : 'transparent',
                          }}
                        >
                          {/* Rank */}
                          <div className="col-span-1 flex items-center justify-center">
                            {getRankIcon(i + 1)}
                          </div>

                          {/* Name */}
                          <div className="col-span-4">
                            <p className="text-sm font-semibold truncate" style={{ color: '#E8EEFF' }}>
                              {attempt.participantName}
                            </p>
                          </div>

                          {/* Score */}
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold w-10 flex-shrink-0"
                                style={{ color: getScoreColor(attempt.percentage) }}>
                                {attempt.percentage}%
                              </span>
                              <ScoreBar pct={attempt.percentage} />
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: '#4B5A7A' }}>
                              {attempt.score}/{attempt.totalQuestions}
                            </p>
                          </div>

                          {/* Time */}
                          <div className="col-span-2 flex items-center gap-1 text-xs" style={{ color: '#8B9CC8' }}>
                            <Clock size={11} />
                            {formatTime(attempt.timeTakenSeconds)}
                          </div>

                          {/* Date */}
                          <div className="col-span-2 hidden md:block text-xs" style={{ color: '#4B5A7A' }}>
                            {formatDate(attempt.completedAt)}
                          </div>
                        </motion.div>
                      ))}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                  <Link to="/" className="text-xs transition-colors duration-200 hover:text-foreground"
                    style={{ color: '#4B5A7A' }}>
                    ← Create another quiz
                  </Link>
                </div>

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}
