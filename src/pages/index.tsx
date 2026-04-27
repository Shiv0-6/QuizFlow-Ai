import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Zap, AlertCircle, RefreshCw, 
  BookOpen, X, ArrowRight, Share2, Check,
  FilePlus
} from 'lucide-react';

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
  const [isFocused, setIsFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [mode, setMode] = useState<'quiz' | 'study'>('quiz');
  const [studyGuide, setStudyGuide] = useState<any>(null);
  const [guideShareId, setGuideShareId] = useState<string | null>(null);
  const [isSavingGuide, setIsSavingGuide] = useState(false);
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
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight">
            Learn <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Anything.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Paste notes, topics, or PDFs to transform them into interactive study guides and quizzes instantly.
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
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/guide/${guideShareId}`); alert('Copied!'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-bold">
                      <Check size={14} /> Copied!
                    </button>
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
    { label: 'Science', emoji: '🔬' },
    { label: 'History', emoji: '📜' },
    { label: 'Math', emoji: '📐' },
    { label: 'Coding', emoji: '💻' },
    { label: 'Literature', emoji: '📚' },
    { label: 'Business', emoji: '💼' },
  ];
  const handleTopicClick = (topic: string) => {
    window.dispatchEvent(new CustomEvent('prefill-topic', { detail: topic }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-24 px-6 bg-black/20">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center gap-4 mb-16 overflow-hidden">
           <div className="h-px flex-1 bg-white/5" />
           <h2 className="text-sm font-black text-white/20 uppercase tracking-[0.3em] whitespace-nowrap">Popular Topics</h2>
           <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {topics.map((t) => (
            <button 
              key={t.label} 
              onClick={() => handleTopicClick(t.label)} 
              className="group p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all flex flex-col items-center gap-4"
            >
              <div className="text-3xl group-hover:scale-125 transition-transform">{t.emoji}</div>
              <div className="text-xs font-black text-white/40 group-hover:text-white transition-colors tracking-widest uppercase">{t.label}</div>
            </button>
          ))}
        </div>
        <p className="mt-12 text-center text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">
          Choose a topic to generate a custom study guide or practice quiz
        </p>
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
      <div className="py-24 text-center">
        <p className="text-xs font-bold text-white/10 uppercase tracking-[0.5em]">The Future of Personal Learning</p>
      </div>
    </>
  );
}
