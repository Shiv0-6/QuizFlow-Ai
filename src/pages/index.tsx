import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Zap, AlertCircle, RefreshCw, 
  BookOpen, X, Share2, Check,
  FilePlus, LayoutGrid, Flame, Brain
} from 'lucide-react';
import { getProgress, getXpLevel, recordGuideCreation } from '../lib/progress';

// ─── Question Parser ──────────────────────────────────────────────────
interface ParsedQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

function parseQuestions(text: string): ParsedQuestion[] | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: ParsedQuestion[] = [];

  let i = 0;
  while (i < lines.length) {
    const qMatch = lines[i].match(/^(?:Q(?:uestion)?\s*\d+[\.\:\)]\s*|^\d+[\.\:\)]\s*)(.+)/i);
    if (!qMatch) { i++; continue; }

    const questionText = qMatch[1].trim();
    const options: string[] = [];
    let correct = -1;
    i++;

    while (i < lines.length && options.length < 4) {
      const optMatch = lines[i].match(/^[\(\[]?([A-Da-d])[\)\]\.\:]\s*(.+)/);
      if (optMatch) {
        options.push(optMatch[2].trim());
        i++;
      } else {
        break;
      }
    }

    if (i < lines.length) {
      const ansMatch = lines[i].match(/^(?:answer|ans|correct(?:\s+answer)?)\s*[\:\-]\s*([A-Da-d])/i);
      if (ansMatch) {
        correct = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
        i++;
      }
    }

    if (options.length === 4 && correct >= 0) {
      results.push({ question: questionText, options, correct });
    }
  }

  return results.length >= 1 ? results : null;
}

// ─── Hero Section ─────────────────────────────────────────────────────
function HeroSection() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [mode, setMode] = useState<'quiz' | 'study'>('quiz');
  const [studyGuide, setStudyGuide] = useState<any>(null);
  const [guideShareId, setGuideShareId] = useState<string | null>(null);
  const [isSavingGuide, setIsSavingGuide] = useState(false);
  // Progress state
  const [progress, setProgress] = useState(() => getProgress());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setText(detail);
      setError('');
    };
    window.addEventListener('prefill-topic', handler);
    return () => window.removeEventListener('prefill-topic', handler);
  }, []);

  const trimmed = text.trim();
  const parsed = trimmed.length > 10 ? parseQuestions(trimmed) : null;
  const isStructured = parsed !== null;
  const canSubmit = trimmed.length >= 30;

  const handleGenerate = async () => {
    if (!canSubmit || isCreating) return;
    setError('');
    setIsCreating(true);

    if (mode === 'study') {
      try {
        const res = await fetch('/api/generate-study-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? 'Failed to generate study guide.');
          setIsCreating(false);
          return;
        }
        setStudyGuide(data);
        setIsCreating(false);
        // Record guide creation for XP/streak
        const updated = recordGuideCreation();
        setProgress(updated);
        return;
      } catch (err) {
        setError('Network error. Please try again.');
        setIsCreating(false);
        return;
      }
    }

    try {
      let questions: ParsedQuestion[];
      let title = 'My Quiz';

      if (isStructured && parsed) {
        questions = parsed;
        const firstLine = trimmed.split('\n')[0].trim();
        if (!firstLine.match(/^(?:Q(?:uestion)?\s*\d+|\d+[\.\:\)])/i)) {
          title = firstLine.slice(0, 100);
        }
      } else {
        const res = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, count: questionCount }),
        });
        const data = await res.json() as { questions?: ParsedQuestion[]; error?: string; message?: string };
        if (!res.ok) {
          setError(data.message ?? 'Failed to generate quiz. Please try again.');
          setIsCreating(false);
          return;
        }
        questions = data.questions ?? [];
        title = trimmed.split(/[.\n]/)[0].slice(0, 80) || 'My Quiz';
      }

      if (!questions.length) {
        setError('Could not extract questions. Please check your format.');
        setIsCreating(false);
        return;
      }

      const saveRes = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, questions }),
      });
      const saved = await saveRes.json() as { shareId?: string; creatorToken?: string; error?: string; message?: string };

      if (!saveRes.ok) {
        setError(saved.message ?? 'Failed to save quiz.');
        setIsCreating(false);
        return;
      }

      sessionStorage.setItem(`creator_${saved.shareId}`, saved.creatorToken ?? '');
      navigate('/quiz/created', {
        state: { shareId: saved.shareId, creatorToken: saved.creatorToken, title, questionCount: questions.length },
      });
    } catch {
      setError('Network error. Please try again.');
      setIsCreating(false);
    }
  };

  const handleShareGuide = async () => {
    if (!studyGuide || isSavingGuide) return;
    setIsSavingGuide(true);
    try {
      const res = await fetch('/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: studyGuide.title,
          overview: studyGuide.overview,
          sections: studyGuide.sections,
          keyConcepts: studyGuide.keyConcepts,
          summary: studyGuide.summary,
          readingTime: studyGuide.estimatedReadingTime
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGuideShareId(data.shareId);
      }
    } catch (err) {
      console.error('Failed to share guide:', err);
    } finally {
      setIsSavingGuide(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setIsExtracting(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Failed to extract PDF text.');
      } else {
        setText(data.text);
        textareaRef.current?.focus();
      }
    } catch {
      setError('Failed to upload file. Please try again.');
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const charCount = trimmed.length;
  const charHint = charCount < 30 && charCount > 0
    ? `${30 - charCount} more characters needed`
    : isStructured
    ? `✓ ${parsed!.length} question${parsed!.length !== 1 ? 's' : ''} detected`
    : charCount >= 30
    ? mode === 'study' ? 'AI will craft a study guide' : 'AI will generate questions'
    : '';

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-background overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px]"
          style={{ background: 'rgba(99,102,241,0.08)' }}
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[160px]"
          style={{ background: 'rgba(59,130,246,0.07)' }}
          animate={{ x: [0, -30, 20, 0], y: [0, 20, -30, 0], scale: [1, 0.95, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute top-3/4 left-1/2 w-[300px] h-[300px] rounded-full blur-[120px]"
          style={{ background: 'rgba(139,92,246,0.06)' }}
          animate={{ x: [0, 20, -10, 0], y: [0, -10, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          {/* XP / Streak Badge */}
          {(progress.streak > 0 || progress.xp > 0) && (() => {
            const lvl = getXpLevel(progress.xp);
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-4 mb-6 px-5 py-2.5 rounded-full border"
                style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }}
              >
                {progress.streak > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-black text-orange-400">
                    <Flame size={14} fill="currentColor" /> {progress.streak} day streak
                  </span>
                )}
                {progress.streak > 0 && progress.xp > 0 && <span className="w-px h-4 bg-white/10" />}
                <span className="flex items-center gap-1.5 text-sm font-black text-indigo-300">
                  <Zap size={13} fill="currentColor" /> {progress.xp} XP · {lvl.title}
                </span>
              </motion.div>
            );
          })()}

          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight">
            Learn <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Anything.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Paste notes, topics, or PDFs — get AI study guides, quizzes, flashcards and quick revision blocks in seconds.
          </p>
        </motion.div>

        {/* Input Area */}
        <div className="w-full max-w-3xl space-y-6">
          <div className="relative group">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
             <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(''); }}
                  placeholder="What would you like to study today?"
                  rows={8}
                  className="w-full px-8 py-8 bg-transparent text-lg text-white outline-none resize-none placeholder:text-white/20"
                />
                
                <div className="flex items-center justify-between px-8 py-4 bg-white/5 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExtracting}
                      className="flex items-center gap-2 text-sm font-bold text-white/40 hover:text-white transition-colors"
                    >
                      {isExtracting ? <RefreshCw size={14} className="animate-spin" /> : <FilePlus size={16} />}
                      {isExtracting ? 'Reading PDF...' : 'Upload PDF'}
                    </button>
                    <span className="text-xs font-bold text-white/20 uppercase tracking-widest">{charHint}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                      <button onClick={() => setMode('quiz')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'quiz' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}>Quiz</button>
                      <button onClick={() => setMode('study')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'study' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}>Guide</button>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20">
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}

          {/* Weak Concepts Quick-Recall Chip */}
          {progress.weakConcepts.length > 0 && !text && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-2xl border"
              style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}
            >
              <Brain size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-2">Review Weak Topics</p>
                <div className="flex flex-wrap gap-2">
                  {progress.weakConcepts.slice(0, 8).map((concept) => (
                    <button
                      key={concept}
                      onClick={() => { setText(concept); setMode('study'); }}
                      className="px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105"
                      style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}
                    >{concept}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col md:flex-row items-center gap-6 justify-between pt-4">
            {mode === 'quiz' && !isStructured ? (
              <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs font-black text-white/40 uppercase tracking-widest">Questions</span>
                <input type="range" min="3" max="20" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value))} className="w-32 accent-indigo-500" />
                <span className="text-sm font-bold text-white tabular-nums">{questionCount}</span>
              </div>
            ) : <div />}

            <button
              onClick={handleGenerate}
              disabled={!canSubmit || isCreating}
              className="w-full md:w-auto px-12 py-5 rounded-2xl bg-indigo-600 text-white font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3"
            >
              {isCreating ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <>
                  {mode === 'study' ? <BookOpen size={20} /> : <Zap size={20} fill="white" />}
                  {mode === 'study' ? 'Create Study Guide' : 'Generate Quiz'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {studyGuide && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 backdrop-blur-2xl bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] border border-white/10 flex flex-col bg-background shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
                    <BookOpen size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{studyGuide.title}</h2>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{studyGuide.estimatedReadingTime} Read</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {guideShareId ? (
                    <>
                      <Link 
                        to={`/guide/${guideShareId}/revision`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm font-bold hover:bg-indigo-500/20 transition-all"
                      >
                        <LayoutGrid size={14} /> Revision
                      </Link>
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/guide/${guideShareId}`); alert('Copied!'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-bold">
                        <Check size={14} /> Copied!
                      </button>
                    </>
                  ) : (
                    <button onClick={handleShareGuide} disabled={isSavingGuide} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-all disabled:opacity-50">
                      {isSavingGuide ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />} Share
                    </button>
                  )}
                  <button onClick={() => { setStudyGuide(null); setGuideShareId(null); }} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    <X size={20} className="text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-12 pb-12">
                  <p className="text-2xl text-white/90 leading-relaxed font-medium italic">"{studyGuide.overview}"</p>
                  {studyGuide.sections.map((section: any, i: number) => (
                    <section key={i} className="space-y-6">
                      <h3 className="text-3xl font-black text-white flex items-center gap-4">
                        <span className="text-indigo-500/20 text-5xl">0{i + 1}</span> {section.heading}
                      </h3>
                      <div className="text-lg text-slate-400 leading-relaxed space-y-4 whitespace-pre-wrap">{section.content}</div>
                    </section>
                  ))}
                  <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/5">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Sparkles size={20} className="text-indigo-400" /> Key Concepts</h3>
                    <div className="flex flex-wrap gap-3">
                      {studyGuide.keyConcepts.map((concept: string, i: number) => (
                        <span key={i} className="px-5 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-sm font-bold text-white">{concept}</span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-12 border-t border-white/5 text-center">
                    <h3 className="text-3xl font-black text-white mb-4">Summary</h3>
                    <p className="text-xl text-slate-400 leading-relaxed">{studyGuide.summary}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5">
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Ready to practice?</p>
                <button onClick={() => { setMode('quiz'); setStudyGuide(null); handleGenerate(); }} className="px-10 py-4 rounded-full bg-white text-black font-black flex items-center gap-2 hover:scale-105 transition-transform">
                  <Zap size={18} fill="black" /> Generate Practice Quiz
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function LearnByTopicSection() {
  const topics = [
    { label: 'Science', emoji: '🔬', color: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
    { label: 'History', emoji: '📜', color: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    { label: 'Math', emoji: '📐', color: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
    { label: 'Coding', emoji: '💻', color: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)' },
    { label: 'Literature', emoji: '📚', color: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.2)' },
    { label: 'Business', emoji: '💼', color: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)' },
    { label: 'Biology', emoji: '🧬', color: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
    { label: 'Physics', emoji: '⚛️', color: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
    { label: 'Chemistry', emoji: '🧪', color: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)' },
    { label: 'Geography', emoji: '🌍', color: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.2)' },
    { label: 'Economics', emoji: '📈', color: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.2)' },
    { label: 'Philosophy', emoji: '🤔', color: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  ];
  const handleTopicClick = (topic: string) => {
    window.dispatchEvent(new CustomEvent('prefill-topic', { detail: topic }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-24 px-6" style={{ background: 'rgba(0,0,0,0.2)' }}>
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="h-px flex-1 bg-white/5" />
          <h2 className="text-sm font-black text-white/20 uppercase tracking-[0.3em] whitespace-nowrap">Quick Start Topics</h2>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {topics.map((t, i) => (
            <motion.button
              key={t.label}
              onClick={() => handleTopicClick(t.label)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="group p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all"
              style={{ background: t.color, borderColor: t.border }}
            >
              <div className="text-2xl group-hover:scale-110 transition-transform duration-200">{t.emoji}</div>
              <div className="text-[10px] font-black text-white/50 group-hover:text-white transition-colors tracking-widest uppercase leading-none">{t.label}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: '🧠',
      title: 'AI Study Guides',
      desc: 'Paste any text or PDF and get a structured, comprehensive guide organized by topic instantly.',
      color: 'from-indigo-500/20 to-violet-500/10',
      border: 'border-indigo-500/20',
    },
    {
      icon: '⚡',
      title: 'Practice Quizzes',
      desc: 'Auto-generated MCQs from your material. Leaderboards, timers, shuffling — fully configurable.',
      color: 'from-blue-500/20 to-cyan-500/10',
      border: 'border-blue-500/20',
    },
    {
      icon: '🃏',
      title: 'Flashcard Mode',
      desc: 'Flip through key concepts with 3D flashcards. Mark what you know and review what you don\'t.',
      color: 'from-violet-500/20 to-purple-500/10',
      border: 'border-violet-500/20',
    },
    {
      icon: '⚡',
      title: 'Quick Revision',
      desc: 'See all your topics side-by-side in compact blocks. Perfect for a rapid review before exams.',
      color: 'from-emerald-500/20 to-green-500/10',
      border: 'border-emerald-500/20',
    },
  ];
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-black text-indigo-400/60 uppercase tracking-[0.4em] mb-4">Everything You Need</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">One Platform.<br /><span className="text-indigo-400">Every Learning Mode.</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className={`p-8 rounded-[2rem] bg-gradient-to-br border relative overflow-hidden group ${f.color} ${f.border}`}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.03), transparent 70%)' }} />
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-black text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <title>QuizFlow AI — Personal Learning Platform</title>
      <HeroSection />
      <LearnByTopicSection />
      <FeaturesSection />
      <footer className="py-16 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center">
            <Zap size={13} className="text-white" fill="white" />
          </div>
          <span className="font-black text-white">QuizFlow <span className="text-indigo-400">AI</span></span>
        </div>
        <p className="text-xs text-white/10 font-bold uppercase tracking-[0.4em]">The Future of Personal Learning</p>
      </footer>
    </>
  );
}
