import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy, Check, Share2, BarChart3,
  Zap, ExternalLink, Users, ChevronRight,
  Settings, Eye, Trophy, Shuffle, Clock, RotateCcw, UserCheck, ChevronDown,
} from 'lucide-react';

interface QuizSettings {
  showLeaderboard: boolean;
  showAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  timeLimitSeconds: number;
  allowRetake: boolean;
  requireName: boolean;
}

interface CreatedState {
  shareId: string;
  creatorToken: string;
  title: string;
  questionCount: number;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex-shrink-0"
      style={{
        background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(37,99,235,0.15)',
        color: copied ? '#34D399' : '#60A5FA',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
      }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─── Toggle Row ────────────────────────────────────────────────────────
function SettingToggle({
  icon: Icon, label, description, value, onChange, color = '#3B82F6',
}: {
  icon: React.ElementType; label: string; description: string;
  value: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b last:border-b-0"
      style={{ borderColor: 'rgba(59,130,246,0.08)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium" style={{ color: '#E8EEFF' }}>{label}</div>
          <div className="text-xs" style={{ color: '#4B5A7A' }}>{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0"
        style={{ background: value ? color : 'rgba(59,130,246,0.12)', border: `1px solid ${value ? color : 'rgba(59,130,246,0.2)'}` }}
      >
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

// ─── Time Limit Selector ───────────────────────────────────────────────
function TimeLimitSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options = [
    { label: 'No limit', value: 0 },
    { label: '15 sec / question', value: 15 },
    { label: '30 sec / question', value: 30 },
    { label: '45 sec / question', value: 45 },
    { label: '60 sec / question', value: 60 },
    { label: '90 sec / question', value: 90 },
  ];
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Clock size={14} style={{ color: '#F59E0B' }} />
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: '#E8EEFF' }}>Time limit</div>
          <div className="text-xs" style={{ color: '#4B5A7A' }}>Per-question countdown timer</div>
        </div>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium outline-none cursor-pointer"
          style={{
            background: 'rgba(18,18,42,0.9)', color: '#C8D5F0',
            border: '1px solid rgba(59,130,246,0.25)',
          }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#4B5A7A' }} />
      </div>
    </div>
  );
}

export default function QuizCreatedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CreatedState | null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState<QuizSettings>({
    showLeaderboard: true,
    showAnswers: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    timeLimitSeconds: 0,
    allowRetake: true,
    requireName: true,
  });

  useEffect(() => {
    if (!state?.shareId) {
      navigate('/', { replace: true });
    } else {
      // Trigger confetti on successful quiz creation
      const duration = 2000;
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
  }, [state, navigate]);

  if (!state?.shareId) return null;

  const { shareId, creatorToken, title, questionCount } = state;
  const origin = window.location.origin;
  const quizUrl = `${origin}/quiz/${shareId}`;
  const resultsUrl = `${origin}/results/${shareId}?token=${creatorToken}`;

  const set = <K extends keyof QuizSettings>(key: K, val: QuizSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: val }));

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch(`/api/quizzes/${shareId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, creatorToken }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* silent */ }
    setSaving(false);
  };

  return (
    <>
      <title>Quiz Created — QuizFlow AI</title>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
        }} />

        {/* Top bar */}
        <div className="relative z-10 border-b px-6 py-4 flex items-center backdrop-blur-xl"
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
        </div>

        <div className="relative z-10 flex-1 flex items-start justify-center px-6 py-12">
          <div className="w-full max-w-lg">

            {/* Success header */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' as const }}
              className="flex flex-col items-center text-center mb-10">
              <motion.div
                initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 220 }}
                className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))', border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 0 50px rgba(16,185,129,0.3)' }}>
                <div className="absolute inset-0 rounded-full pointer-events-none animate-ping" style={{ background: 'rgba(16,185,129,0.2)', animationDuration: '3s' }} />
                <Check size={40} style={{ color: '#34D399' }} strokeWidth={2.5} />
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-extrabold mb-3" style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF' }}>
                Quiz Created!
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="text-base" style={{ color: '#94A3B8' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{title}</span>
                {' '}· {questionCount} question{questionCount !== 1 ? 's' : ''}
              </motion.p>
            </motion.div>

            {/* ── Quiz Settings Panel ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="rounded-2xl border mb-4 overflow-hidden"
              style={{ background: 'rgba(18,18,42,0.9)', borderColor: 'rgba(59,130,246,0.2)' }}>

              {/* Header toggle */}
              <button
                onClick={() => setSettingsOpen((o) => !o)}
                className="w-full flex items-center justify-between px-6 py-4 transition-colors duration-200 hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                    <Settings size={13} style={{ color: '#8B5CF6' }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Quiz Settings</p>
                    <p className="text-xs" style={{ color: '#8B9CC8' }}>Leaderboard, answers, timer &amp; more</p>
                  </div>
                </div>
                <motion.div animate={{ rotate: settingsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} style={{ color: '#4B5A7A' }} />
                </motion.div>
              </button>

              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' as const }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-2 border-t" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
                      <SettingToggle icon={Trophy} label="Show leaderboard" color="#F59E0B"
                        description="Display rankings after quiz completion"
                        value={settings.showLeaderboard} onChange={(v) => set('showLeaderboard', v)} />
                      <SettingToggle icon={Eye} label="Show correct answers" color="#10B981"
                        description="Reveal answer & explanation after each question"
                        value={settings.showAnswers} onChange={(v) => set('showAnswers', v)} />
                      <SettingToggle icon={Shuffle} label="Shuffle questions" color="#3B82F6"
                        description="Randomise question order for each participant"
                        value={settings.shuffleQuestions} onChange={(v) => set('shuffleQuestions', v)} />
                      <SettingToggle icon={Shuffle} label="Shuffle options" color="#6366F1"
                        description="Randomise answer option order"
                        value={settings.shuffleOptions} onChange={(v) => set('shuffleOptions', v)} />
                      <SettingToggle icon={RotateCcw} label="Allow retakes" color="#06B6D4"
                        description="Participants can take the quiz multiple times"
                        value={settings.allowRetake} onChange={(v) => set('allowRetake', v)} />
                      <SettingToggle icon={UserCheck} label="Require name" color="#EC4899"
                        description="Ask participants to enter their name before starting"
                        value={settings.requireName} onChange={(v) => set('requireName', v)} />
                      <TimeLimitSelect value={settings.timeLimitSeconds} onChange={(v) => set('timeLimitSeconds', v)} />
                    </div>

                    <div className="px-6 pb-5">
                      <button onClick={saveSettings} disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-60"
                        style={{
                          background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
                          color: saved ? '#34D399' : '#A78BFA',
                          border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`,
                        }}>
                        {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : <><Settings size={14} /> Save Settings</>}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Share link card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="rounded-3xl p-8 border mb-6 backdrop-blur-md relative overflow-hidden group"
              style={{ background: 'rgba(20, 20, 25, 0.6)', borderColor: 'rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
              <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none transition-opacity duration-500 opacity-20 group-hover:opacity-40"
                style={{ background: 'radial-gradient(circle at top right, rgba(139,92,246,0.3) 0%, transparent 70%)' }} />
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))', border: '1px solid rgba(139,92,246,0.4)' }}>
                  <Users size={18} style={{ color: '#A78BFA' }} />
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: '#FFFFFF' }}>Share with participants</p>
                  <p className="text-sm" style={{ color: '#94A3B8' }}>Anyone with this link can take the quiz</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6 relative z-10">
                <input readOnly value={quizUrl}
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(10,10,15,0.8)', color: '#E8EEFF', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace' }} />
                <CopyButton value={quizUrl} label="Copy" />
              </div>
              <div className="flex gap-3 mt-4 relative z-10">
                <a href={quizUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #3B82F6)', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                  <ExternalLink size={16} /> Preview Quiz
                </a>
                <button
                  onClick={async () => {
                    if (navigator.share) await navigator.share({ title, url: quizUrl });
                    else await navigator.clipboard.writeText(quizUrl);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', color: '#60A5FA' }}>
                  <Share2 size={16} /> Share
                </button>
              </div>
            </motion.div>

            {/* Results dashboard card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="rounded-3xl p-8 border mb-6 backdrop-blur-md relative overflow-hidden group"
              style={{ background: 'rgba(20, 20, 25, 0.6)', borderColor: 'rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(167,139,250,0.2))', border: '1px solid rgba(59,130,246,0.4)' }}>
                  <BarChart3 size={18} style={{ color: '#60A5FA' }} />
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: '#FFFFFF' }}>Your results dashboard</p>
                  <p className="text-sm" style={{ color: '#94A3B8' }}>Save this link — it's the only way to see scores</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6 relative z-10">
                <input readOnly value={resultsUrl}
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(10,10,15,0.8)', color: '#E8EEFF', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace' }} />
                <CopyButton value={resultsUrl} label="Copy" />
              </div>
              <Link to={`/results/${shareId}?token=${creatorToken}`}
                className="mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border transition-all duration-300 hover:scale-[1.02] w-full relative z-10"
                style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', color: '#60A5FA' }}>
                <BarChart3 size={16} /> Open Results Dashboard <ChevronRight size={16} className="ml-auto" />
              </Link>
            </motion.div>

            {/* Warning */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="rounded-2xl px-5 py-4 mb-8 text-sm leading-relaxed backdrop-blur-md border"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', color: '#FCD34D' }}>
              <span className="font-bold">Save your results link.</span> There's no account system — if you lose this link, you won't be able to view scores. Bookmark it or copy it somewhere safe.
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 hover:text-white" style={{ color: '#94A3B8' }}>
                ← Create another quiz
              </Link>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
}
