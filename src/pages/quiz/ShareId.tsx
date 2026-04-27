import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, ArrowRight, Zap, Clock,
  Trophy, Copy, Check, AlertCircle, Medal, Timer,
  Lightbulb, BarChart3, Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
interface QuizSettings {
  showLeaderboard: boolean;
  showAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  timeLimitSeconds: number;
  allowRetake: boolean;
  requireName: boolean;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

interface QuizData {
  shareId: string;
  title: string;
  description?: string;
  questionCount: number;
  questions: QuizQuestion[];
  settings: QuizSettings;
}

interface ReviewItem {
  questionId: number;
  questionText: string;
  options: string[];
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  explanation?: string | null;
}

interface LeaderboardEntry {
  rank: number;
  participantName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds: number;
}

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'correct-unselected';

const LABELS = ['A', 'B', 'C', 'D'];
const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ─── Progress Bar ─────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.1)' }}>
      <motion.div className="h-full rounded-full"
        style={{ background: 'linear-gradient(90deg, #2563EB, #60A5FA)' }}
        initial={false}
        animate={{ width: `${(current / total) * 100}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' as const }}
      />
    </div>
  );
}

// ─── Countdown Ring ───────────────────────────────────────────────────
function CountdownRing({ timeLeft, total, warning }: { timeLeft: number; total: number; warning: boolean }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const color = warning ? '#EF4444' : timeLeft / total < 0.5 ? '#FBBF24' : '#6366F1';

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg width="56" height="56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
        <motion.circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 0.5, ease: 'linear' as const }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold tabular-nums leading-none" style={{ color, fontFamily: 'var(--font-heading)' }}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}

// ─── Option Button ────────────────────────────────────────────────────
function OptionButton({ label, text, state, onClick, disabled, index }: {
  label: string; text: string; state: OptionState;
  onClick: () => void; disabled: boolean; index: number;
}) {
  const isSelected = state === 'selected';
  const isCorrect = state === 'correct';
  const isWrong = state === 'wrong';
  const isNeutral = state === 'idle';

  return (
    <motion.button onClick={onClick} disabled={disabled}
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isSelected ? 1.02 : 1,
        x: isWrong ? [0, -4, 4, -4, 4, 0] : 0
      }}
      transition={{ 
        opacity: { delay: index * 0.05 },
        y: { delay: index * 0.05 },
        x: { duration: 0.4 },
        scale: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      whileHover={!disabled ? { x: 4, background: 'rgba(255,255,255,0.05)' } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
      style={{
        background: isCorrect ? 'rgba(16,185,129,0.1)' : isWrong ? 'rgba(239,68,68,0.1)' : isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
        borderColor: isCorrect ? '#10B981' : isWrong ? '#EF4444' : isSelected ? '#6366F1' : 'rgba(255,255,255,0.08)',
        boxShadow: isSelected ? '0 0 20px rgba(99,102,241,0.2)' : 'none'
      }}
    >
      <span className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold border transition-colors duration-300`}
        style={{ 
          background: isCorrect ? '#10B981' : isWrong ? '#EF4444' : isSelected ? '#6366F1' : 'rgba(255,255,255,0.05)',
          borderColor: isCorrect || isWrong || isSelected ? 'transparent' : 'rgba(255,255,255,0.1)',
          color: isNeutral ? '#94A3B8' : '#FFFFFF'
        }}>
        {isCorrect ? <Check size={14} strokeWidth={3} /> : isWrong ? <XCircle size={14} /> : label}
      </span>
      <span className={`text-base font-medium flex-1 leading-snug ${isNeutral ? 'text-[#CBD5E1]' : 'text-white'}`}>{text}</span>
      
      {isCorrect && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#10B981]"><CheckCircle2 size={20} /></motion.div>}
      {isWrong && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#EF4444]"><XCircle size={20} /></motion.div>}
    </motion.button>
  );
}

// ─── Feedback Banner ──────────────────────────────────────────────────
function FeedbackBanner({ isCorrect, explanation }: { isCorrect: boolean; explanation?: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl px-5 py-4 border"
      style={{
        background: isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.07)',
        borderColor: isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {isCorrect
          ? <CheckCircle2 size={15} style={{ color: '#10B981' }} />
          : <XCircle size={15} style={{ color: '#EF4444' }} />}
        <span className="text-sm font-semibold" style={{ color: isCorrect ? '#34D399' : '#F87171' }}>
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </span>
      </div>
      {explanation && (
        <div className="flex items-start gap-2 mt-2">
          <Lightbulb size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#8B9CC8' }}>{explanation}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Name Entry Screen ────────────────────────────────────────────────
function NameEntry({ quiz, onStart }: { quiz: QuizData; onStart: (name: string) => void }) {
  const [name, setName] = useState('');
  const settings = quiz.settings;

  const badges = [
    settings.timeLimitSeconds > 0 && `${settings.timeLimitSeconds}s / question`,
    settings.showAnswers && 'Answers revealed',
    settings.showLeaderboard && 'Leaderboard',
  ].filter(Boolean) as string[];

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as const }}
      className="flex flex-col items-center text-center max-w-md mx-auto py-8"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.05, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(99,102,241,0.15))',
          border: '1px solid rgba(59,130,246,0.35)',
          boxShadow: '0 0 40px rgba(37,99,235,0.2)',
        }}>
        <Zap size={32} style={{ color: '#60A5FA' }} fill="#60A5FA" />
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="text-3xl font-bold mb-2 leading-tight" style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF' }}>
        {quiz.title}
      </motion.h1>

      {quiz.description && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="text-sm mb-3 max-w-xs" style={{ color: '#8B9CC8' }}>
          {quiz.description}
        </motion.p>
      )}

      {/* Meta badges */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center justify-center gap-2 mb-8">
        <span className="text-xs px-3 py-1.5 rounded-full font-medium"
          style={{ background: 'rgba(37,99,235,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)' }}>
          {quiz.questionCount} question{quiz.questionCount !== 1 ? 's' : ''}
        </span>
        {badges.map((b) => (
          <span key={b} className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.2)' }}>
            {b}
          </span>
        ))}
      </motion.div>

      {/* Name input */}
      {settings.requireName ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="w-full mb-5">
          <label className="block text-sm font-medium mb-2 text-left" style={{ color: '#C8D5F0' }}>
            Your name
          </label>
          <input
            type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onStart(name.trim())}
            placeholder="Enter your name to begin"
            className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all duration-200"
            style={{
              background: 'rgba(15,15,30,0.9)', color: '#E8EEFF',
              border: '1px solid rgba(59,130,246,0.3)', caretColor: '#3B82F6',
            }}
            autoFocus
          />
        </motion.div>
      ) : null}

      <motion.button
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        onClick={() => {
          const n = settings.requireName ? name.trim() : 'Anonymous';
          if (n) onStart(n);
        }}
        disabled={settings.requireName && !name.trim()}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', boxShadow: '0 0 28px rgba(37,99,235,0.4)' }}
      >
        Start Quiz <ArrowRight size={16} />
      </motion.button>
    </motion.div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────
function Leaderboard({ shareId, myName, myScore, myTotal, myTime }: {
  shareId: string; myName: string; myScore: number; myTotal: number; myTime: number;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quizzes/${shareId}/leaderboard`)
      .then((r) => r.json())
      .then((d: { enabled: boolean; entries: LeaderboardEntry[] }) => {
        if (d.enabled) setEntries(d.entries);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [shareId]);

  const rankColors = ['#FBBF24', '#94A3B8', '#CD7C2F'];
  const rankIcons = [
    <Trophy size={14} key="1" style={{ color: '#FBBF24' }} />,
    <Medal size={14} key="2" style={{ color: '#94A3B8' }} />,
    <Medal size={14} key="3" style={{ color: '#CD7C2F' }} />,
  ];

  if (loading) return (
    <div className="flex justify-center py-8">
      <motion.div className="w-6 h-6 border-2 rounded-full"
        style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3B82F6' }}
        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' as const }} />
    </div>
  );

  if (!entries.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
      className="w-full max-w-sm mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} style={{ color: '#FBBF24' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8B9CC8' }}>Leaderboard</span>
      </div>
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'rgba(15,15,30,0.85)', borderColor: 'rgba(59,130,246,0.15)' }}>
        {entries.map((e, i) => {
          const isMe = e.participantName === myName && e.score === myScore;
          return (
            <motion.div key={i}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors duration-150"
              style={{
                borderColor: 'rgba(59,130,246,0.08)',
                background: isMe ? 'rgba(37,99,235,0.08)' : 'transparent',
              }}>
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                {i < 3 ? rankIcons[i] : <span className="text-xs font-bold" style={{ color: '#4B5A7A' }}>{i + 1}</span>}
              </div>
              <span className="flex-1 text-sm font-medium truncate" style={{ color: isMe ? '#93C5FD' : '#C8D5F0' }}>
                {e.participantName} {isMe && <span className="text-xs opacity-60">(you)</span>}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold tabular-nums" style={{ color: rankColors[i] ?? '#8B9CC8' }}>
                  {e.percentage}%
                </span>
                <span className="text-xs" style={{ color: '#4B5A7A' }}>{formatTime(e.timeTakenSeconds)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Answer Review ────────────────────────────────────────────────────
function AnswerReview({ review }: { review: ReviewItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="w-full max-w-sm mb-5">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-200 hover:bg-white/[0.02]"
        style={{ background: 'rgba(15,15,30,0.8)', borderColor: 'rgba(59,130,246,0.15)' }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={14} style={{ color: '#60A5FA' }} />
          <span className="text-sm font-medium" style={{ color: '#C8D5F0' }}>Review answers</span>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="text-xs" style={{ color: '#4B5A7A' }}>▼</motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden">
            <div className="mt-2 flex flex-col gap-2">
              {review.map((item, i) => (
                <div key={item.questionId}
                  className="rounded-2xl border p-4"
                  style={{
                    background: item.isCorrect ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                    borderColor: item.isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  }}>
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: '#4B5A7A' }}>Q{i + 1}</span>
                    <p className="text-sm font-medium leading-snug" style={{ color: '#E8EEFF' }}>{item.questionText}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {item.options.map((opt, oi) => {
                      const isCorrect = oi === item.correctOption;
                      const isSelected = oi === item.selectedOption;
                      return (
                        <div key={oi} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                          style={{
                            background: isCorrect ? 'rgba(16,185,129,0.1)' : isSelected ? 'rgba(239,68,68,0.08)' : 'transparent',
                            border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.25)' : isSelected ? 'rgba(239,68,68,0.2)' : 'transparent'}`,
                            color: isCorrect ? '#34D399' : isSelected ? '#F87171' : '#6B7FA8',
                          }}>
                          <span className="font-bold w-4 flex-shrink-0">{LABELS[oi]}</span>
                          <span className="flex-1">{opt}</span>
                          {isCorrect && <Check size={11} strokeWidth={3} />}
                          {isSelected && !isCorrect && <XCircle size={11} />}
                        </div>
                      );
                    })}
                  </div>
                  {item.explanation && (
                    <div className="flex items-start gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
                      <Lightbulb size={11} className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                      <p className="text-xs leading-relaxed" style={{ color: '#8B9CC8' }}>{item.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────
function ResultsScreen({ score, total, elapsed, shareId, participantName, review, showLeaderboard, showAnswers }: {
  score: number; total: number; elapsed: number; shareId: string;
  participantName: string; review: ReviewItem[];
  showLeaderboard: boolean; showAnswers: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const pct = Math.round((score / total) * 100);
  const isGreat = pct >= 80;
  const isOk = pct >= 50;
  const shareUrl = `${window.location.origin}/quiz/${shareId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMessage = () => {
    if (pct === 100) return { title: 'Perfect Score!', sub: 'Absolutely flawless.' };
    if (pct >= 80) return { title: 'Outstanding!', sub: 'You nailed it.' };
    if (pct >= 60) return { title: 'Great Job!', sub: 'Solid performance.' };
    if (pct >= 40) return { title: 'Good Effort!', sub: 'Keep practicing.' };
    return { title: 'Keep Going!', sub: 'You\'ll get there.' };
  };
  const msg = getMessage();

  useEffect(() => {
    if (isGreat) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#8B5CF6', '#3B82F6', '#10B981']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#8B5CF6', '#3B82F6', '#10B981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isGreat]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center text-center"
    >
      {/* Trophy */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.55, delay: 0.05, type: 'spring', stiffness: 180 }}
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
        style={{
          background: isGreat
            ? 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(245,158,11,0.1))'
            : isOk
              ? 'linear-gradient(135deg, rgba(37,99,235,0.22), rgba(99,102,241,0.1))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
          border: `1px solid ${isGreat ? 'rgba(251,191,36,0.4)' : 'rgba(59,130,246,0.3)'}`,
          boxShadow: isGreat ? '0 0 40px rgba(251,191,36,0.18)' : '0 0 40px rgba(37,99,235,0.18)',
        }}>
        {pct === 100
          ? <Star size={40} style={{ color: '#FBBF24' }} fill="#FBBF24" />
          : <Trophy size={40} style={{ color: isGreat ? '#FBBF24' : '#60A5FA' }} />}
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="text-4xl md:text-5xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF' }}>
        {msg.title}
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-base mb-8 font-medium" style={{ color: '#94A3B8' }}>
        {participantName} · {msg.sub}
      </motion.p>

      {/* Score ring + stats */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}
        className="flex items-stretch gap-0 mb-8 rounded-3xl border w-full max-w-sm overflow-hidden backdrop-blur-md relative"
        style={{ background: 'rgba(20, 20, 25, 0.6)', borderColor: 'rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(circle at top, rgba(139, 92, 246, 0.4) 0%, transparent 80%)' }} />
        {[
          { label: 'Score', value: `${score}/${total}`, color: '#FFFFFF' },
          { label: 'Accuracy', value: `${pct}%`, color: isGreat ? '#10B981' : isOk ? '#3B82F6' : '#EF4444' },
          { label: 'Time', value: formatTime(elapsed), color: '#A78BFA' },
        ].map((stat, i) => (
          <div key={stat.label} className="flex-1 flex flex-col items-center py-6 relative z-10">
            {i > 0 && <div className="absolute left-0 top-6 bottom-6 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />}
            <span className="text-3xl font-extrabold tabular-nums mb-1" style={{ fontFamily: 'var(--font-heading)', color: stat.color }}>
              {stat.value}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Leaderboard */}
      {showLeaderboard && (
        <Leaderboard shareId={shareId} myName={participantName}
          myScore={score} myTotal={total} myTime={elapsed} />
      )}

      {/* Answer review */}
      {showAnswers && review.length > 0 && <AnswerReview review={review} />}

      {/* Share */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="w-full max-w-sm mb-5 rounded-2xl p-4 border"
        style={{ background: 'rgba(15,15,30,0.8)', borderColor: 'rgba(59,130,246,0.12)' }}>
        <p className="text-xs font-semibold mb-2 text-left" style={{ color: '#4B5A7A' }}>Challenge your friends</p>
        <div className="flex gap-2">
          <input readOnly value={shareUrl} className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: 'rgba(10,10,24,0.8)', color: '#8B9CC8', border: '1px solid rgba(59,130,246,0.15)', fontFamily: 'monospace' }} />
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(37,99,235,0.15)',
              color: copied ? '#34D399' : '#60A5FA',
              border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.25)'}`,
            }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <Link to="/" className="text-xs transition-colors duration-200 hover:text-foreground" style={{ color: '#4B5A7A' }}>
          ← Create your own quiz
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Quiz Page ───────────────────────────────────────────────────
export default function QuizSharePage() {
  const { shareId } = useParams<{ shareId: string }>();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [participantName, setParticipantName] = useState('');
  const [phase, setPhase] = useState<'name' | 'playing' | 'results'>('name');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [currentExplanation, setCurrentExplanation] = useState<string | null>(null);
  const answersRef = useRef<{ questionId: number; selectedOption: number }[]>([]);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Per-question countdown
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load quiz
  useEffect(() => {
    if (!shareId) return;
    fetch(`/api/quizzes/${shareId}`)
      .then((r) => r.json())
      .then((data: QuizData & { error?: string; message?: string }) => {
        if (data.error) setError(data.message ?? 'Quiz not found.');
        else setQuiz(data);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load quiz.'); setLoading(false); });
  }, [shareId]);

  // Per-question timer
  const startQuestionTimer = useCallback((limit: number) => {
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    setQuestionTimeLeft(limit);
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(questionTimerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  // Auto-submit when question timer hits 0
  useEffect(() => {
    if (phase !== 'playing' || answered || !quiz) return;
    if (questionTimeLeft === 0 && quiz.settings.timeLimitSeconds > 0) {
      const q = quiz.questions[currentIndex];
      setSelectedOption(-1);
      setAnswered(true);
      const entry = { questionId: q.id, selectedOption: -1 };
      answersRef.current = [...answersRef.current, entry];

      // Reveal correct answer on timeout too (if showAnswers is on)
      if (quiz.settings.showAnswers) {
        fetch(`/api/quizzes/${shareId}/questions/${q.id}/check`)
          .then((r) => r.ok ? r.json() : null)
          .then((data: { correctOption: number; explanation: string | null } | null) => {
            if (data) {
              setCorrectOption(data.correctOption);
              setCurrentExplanation(data.explanation);
            }
          })
          .catch(() => { /* ignore */ });
      }
    }
  }, [questionTimeLeft, phase, answered, quiz, currentIndex, shareId]);

  const startQuiz = (name: string) => {
    setParticipantName(name);
    setPhase('playing');
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    if (quiz?.settings.timeLimitSeconds) startQuestionTimer(quiz.settings.timeLimitSeconds);
  };

  const [revealLoading, setRevealLoading] = useState(false);

  const handleSelect = async (idx: number) => {
    if (answered || !quiz) return;
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    setSelectedOption(idx);
    setAnswered(true);
    const q = quiz.questions[currentIndex];
    const entry = { questionId: q.id, selectedOption: idx };
    answersRef.current = [...answersRef.current, entry];

    // If showAnswers is enabled, immediately fetch the correct answer from the server
    if (quiz.settings.showAnswers) {
      setRevealLoading(true);
      try {
        const res = await fetch(`/api/quizzes/${shareId}/questions/${q.id}/check`);
        if (res.ok) {
          const data = await res.json() as { correctOption: number; explanation: string | null };
          setCorrectOption(data.correctOption);
          setCurrentExplanation(data.explanation);
        }
      } catch { /* silently fail — options stay in neutral selected state */ }
      setRevealLoading(false);
    }
  };

  const handleNext = async () => {
    if (!quiz) return;
    const isLast = currentIndex === quiz.questions.length - 1;

    if (isLast) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      setSubmitting(true);
      try {
        const res = await fetch(`/api/quizzes/${shareId}/attempts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantName, answers: answersRef.current, timeTakenSeconds: elapsed }),
        });
        const data = await res.json() as {
          score?: number; review?: ReviewItem[]; error?: string;
        };
        if (res.ok) {
          setScore(data.score ?? 0);
          setReview(data.review ?? []);
        }
      } catch { /* show results anyway */ }
      setSubmitting(false);
      setPhase('results');
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
      setCorrectOption(null);
      setCurrentExplanation(null);
      setRevealLoading(false);
      if (quiz.settings.timeLimitSeconds) startQuestionTimer(quiz.settings.timeLimitSeconds);
    }
  };

  const getOptionState = (idx: number): OptionState => {
    if (!answered) return idx === selectedOption ? 'selected' : 'idle';

    // Waiting for server response — keep selected option highlighted, others idle
    if (revealLoading || correctOption === null) {
      return idx === selectedOption ? 'selected' : 'idle';
    }

    // We have the correct answer from the server — full reveal
    if (idx === correctOption && idx === selectedOption) return 'correct';           // picked right
    if (idx === correctOption && idx !== selectedOption) return 'correct-unselected'; // show the right one
    if (idx === selectedOption && idx !== correctOption) return 'wrong';              // picked wrong
    return 'idle';
  };

  const settings = quiz?.settings;
  const timeLimitTotal = settings?.timeLimitSeconds ?? 0;
  const isTimerWarning = timeLimitTotal > 0 && questionTimeLeft <= Math.min(5, timeLimitTotal * 0.2);

  // ── Render ──
  return (
    <>
      <title>{quiz ? `${quiz.title} — QuizFlow AI` : 'Quiz — QuizFlow AI'}</title>

      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #080814 0%, #0F0F1A 60%, #0A0A18 100%)' }}>
        {/* Grid bg */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(37,99,235,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.025) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        {/* Glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center top, rgba(37,99,235,0.08) 0%, transparent 70%)' }} />

        {/* Top bar */}
        <div className="relative z-10 border-b px-6 py-3.5 flex items-center justify-between"
          style={{ borderColor: 'rgba(59,130,246,0.1)', background: 'rgba(8,8,20,0.9)', backdropFilter: 'blur(16px)' }}>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}>
              <Zap size={11} className="text-white" fill="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 700 }}>
              QuizFlow <span style={{ color: '#60A5FA' }}>AI</span>
            </span>
          </Link>

          {phase === 'playing' && quiz && (
            <div className="flex items-center gap-3">
              {/* Per-question countdown */}
              {timeLimitTotal > 0 && (
                <CountdownRing timeLeft={questionTimeLeft} total={timeLimitTotal} warning={isTimerWarning} />
              )}
              {/* Elapsed */}
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#4B5A7A' }}>
                <Timer size={12} />
                <span style={{ fontFamily: 'var(--font-heading)' }}>{formatTime(elapsed)}</span>
              </div>
              {/* Q counter */}
              <div className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: 'rgba(37,99,235,0.1)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.18)' }}>
                {currentIndex + 1} / {quiz.questions.length}
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="relative z-10 flex-1 flex items-start justify-center px-4 sm:px-6 py-10">
          <div className="w-full max-w-xl">

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <motion.div className="w-10 h-10 border-2 rounded-full"
                  style={{ borderColor: 'rgba(59,130,246,0.15)', borderTopColor: '#3B82F6' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' as const }}
                />
                <p className="text-sm" style={{ color: '#4B5A7A' }}>Loading quiz…</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center py-20">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertCircle size={26} style={{ color: '#EF4444' }} />
                </div>
                <p className="text-lg font-semibold mb-2" style={{ color: '#F87171' }}>Quiz not found</p>
                <p className="text-sm mb-6" style={{ color: '#8B9CC8' }}>{error}</p>
                <Link to="/" className="text-sm font-medium" style={{ color: '#3B82F6' }}>← Create a new quiz</Link>
              </motion.div>
            )}

            {/* Quiz phases */}
            {!loading && !error && quiz && (
              <AnimatePresence mode="wait">

                {/* Name entry */}
                {phase === 'name' && (
                  <motion.div key="name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                    <NameEntry quiz={quiz} onStart={startQuiz} />
                  </motion.div>
                )}

                {/* Playing */}
                {phase === 'playing' && (
                  <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                    {/* Progress */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs mb-2" style={{ color: '#4B5A7A' }}>
                        <span style={{ color: '#6B7FA8' }}>Question {currentIndex + 1} of {quiz.questions.length}</span>
                        <span>{Math.round((currentIndex / quiz.questions.length) * 100)}% complete</span>
                      </div>
                      <ProgressBar current={currentIndex} total={quiz.questions.length} />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={currentIndex}
                        initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.28, ease: 'easeOut' as const }}
                      >
                        {/* Question card */}
                        <div className="rounded-3xl p-8 sm:p-10 mb-8 border backdrop-blur-xl relative overflow-hidden group"
                          style={{
                            background: 'rgba(20, 20, 25, 0.6)',
                            borderColor: 'rgba(255,255,255,0.05)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                          }}>
                          {/* Animated background accent */}
                          <div className="absolute -top-24 -right-24 w-48 h-48 pointer-events-none opacity-10 blur-3xl rounded-full"
                            style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />
                          
                          <h2 className="text-xl sm:text-2xl font-extrabold leading-tight tracking-tight"
                            style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF' }}>
                            {quiz.questions[currentIndex].question}
                          </h2>
                        </div>

                        {/* Options */}
                        <div className="flex flex-col gap-2.5 mb-4">
                          {quiz.questions[currentIndex].options.map((opt, idx) => (
                            <OptionButton key={idx} label={LABELS[idx]} text={opt} index={idx}
                              state={getOptionState(idx)}
                              onClick={() => handleSelect(idx)}
                              disabled={answered} />
                          ))}
                        </div>

                        {/* Feedback banner (shown when answered + showAnswers) */}
                        <AnimatePresence>
                          {answered && settings?.showAnswers && !revealLoading && correctOption !== null && (
                            <FeedbackBanner
                              isCorrect={selectedOption === correctOption}
                              explanation={currentExplanation}
                            />
                          )}
                          {answered && settings?.showAnswers && revealLoading && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="rounded-2xl px-5 py-4 border flex items-center gap-3"
                              style={{ background: 'rgba(37,99,235,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}
                            >
                              <motion.div className="w-4 h-4 border-2 rounded-full flex-shrink-0"
                                style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3B82F6' }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' as const }}
                              />
                              <span className="text-sm" style={{ color: '#6B7FA8' }}>Checking answer…</span>
                            </motion.div>
                          )}
                          {answered && !settings?.showAnswers && questionTimeLeft === 0 && timeLimitTotal > 0 && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="rounded-2xl px-5 py-3 border text-sm font-medium"
                              style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: '#FCD34D' }}>
                              <Clock size={13} className="inline mr-2" />
                              Time's up!
                            </motion.div>
                          )}
                          {answered && !settings?.showAnswers && (selectedOption !== null && selectedOption >= 0) && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              className="rounded-2xl px-5 py-3 border text-sm font-medium"
                              style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)', color: '#93C5FD' }}>
                              Answer recorded — results revealed at the end.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </AnimatePresence>

                    {/* Next button */}
                    <AnimatePresence>
                      {answered && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.22, delay: 0.08 }}
                          className="mt-5 flex justify-end"
                        >
                          <button onClick={handleNext} disabled={submitting}
                            className="relative overflow-hidden group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', boxShadow: '0 0 28px rgba(37,99,235,0.38)' }}
                          >
                            <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                            {submitting ? 'Submitting…' : currentIndex === quiz.questions.length - 1 ? 'See Results' : 'Next Question'}
                            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Results */}
                {phase === 'results' && (
                  <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ResultsScreen
                      score={score} total={quiz.questions.length}
                      elapsed={elapsed} shareId={shareId!}
                      participantName={participantName}
                      review={review}
                      showLeaderboard={settings?.showLeaderboard ?? true}
                      showAnswers={settings?.showAnswers ?? true}
                    />
                  </motion.div>
                )}

              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
