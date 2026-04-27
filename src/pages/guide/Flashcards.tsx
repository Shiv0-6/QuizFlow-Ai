import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, ArrowLeft, RotateCcw, Check, X,
  Layers, BookOpen, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface GuideData {
  title: string;
  overview: string;
  sections: { heading: string; content: string }[];
  keyConcepts: string[];
  summary: string;
  readingTime: string;
}

interface Flashcard {
  id: number;
  front: string;
  back: string;
  status: 'unreviewed' | 'know' | 'review';
}

function buildFlashcards(guide: GuideData): Flashcard[] {
  const cards: Flashcard[] = [];

  // Cards from key concepts — find matching content from sections
  guide.keyConcepts.forEach((concept, i) => {
    // Try to find the section that mentions this concept
    let back = '';
    for (const section of guide.sections) {
      if (section.content.toLowerCase().includes(concept.toLowerCase())) {
        // Extract the most relevant sentence
        const sentences = section.content.split(/[.!?]/).filter(Boolean);
        const relevant = sentences.find((s) =>
          s.toLowerCase().includes(concept.toLowerCase())
        );
        if (relevant) {
          back = relevant.trim() + '.';
          break;
        }
      }
    }
    if (!back) {
      // Fallback: use the overview
      back = guide.overview;
    }
    cards.push({ id: i, front: concept, back, status: 'unreviewed' });
  });

  // Also add section-heading cards
  guide.sections.forEach((section, i) => {
    const firstSentence = section.content.split(/[.!?\n]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 20) {
      cards.push({
        id: guide.keyConcepts.length + i,
        front: section.heading,
        back: firstSentence.length > 200 ? firstSentence.slice(0, 200) + '…' : firstSentence,
        status: 'unreviewed',
      });
    }
  });

  return cards;
}

export default function FlashcardsPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [filter, setFilter] = useState<'all' | 'review'>('all');

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const res = await fetch(`/api/guides/${shareId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? 'Guide not found.');
        } else {
          setGuide(data);
          setCards(buildFlashcards(data));
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchGuide();
  }, [shareId]);

  const displayCards = filter === 'review'
    ? cards.filter((c) => c.status === 'review')
    : cards;

  const currentCard = displayCards[currentIdx];

  const markCard = useCallback((status: 'know' | 'review') => {
    setCards((prev) =>
      prev.map((c) => (c.id === currentCard?.id ? { ...c, status } : c))
    );
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIdx < displayCards.length - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        setSessionComplete(true);
      }
    }, 250);
  }, [currentCard, currentIdx, displayCards.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setIsFlipped((f) => !f); }
    if (e.key === 'ArrowRight' && isFlipped) markCard('know');
    if (e.key === 'ArrowLeft' && isFlipped) markCard('review');
  }, [isFlipped, markCard]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const restart = () => {
    setCurrentIdx(0);
    setIsFlipped(false);
    setSessionComplete(false);
    if (filter === 'review') {
      // Only restart cards marked for review
    } else {
      setCards((prev) => prev.map((c) => ({ ...c, status: 'unreviewed' })));
    }
  };

  const knowCount = cards.filter((c) => c.status === 'know').length;
  const reviewCount = cards.filter((c) => c.status === 'review').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Zap size={36} className="text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Flashcards Not Found</h1>
        <p className="text-slate-400 mb-8">{error}</p>
        <Link to="/" className="px-8 py-3 rounded-full bg-indigo-600 font-bold hover:scale-105 transition-all">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col" style={{ background: 'linear-gradient(160deg, #080814 0%, #0F0F1A 60%, #0A0A18 100%)' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 sticky top-0 border-b backdrop-blur-xl px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(10,10,15,0.7)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-4">
          <Link to={`/guide/${shareId}`} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-500">
              <Layers size={14} className="text-white" />
            </div>
            <span className="font-black text-lg hidden sm:block">Flashcards</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
            <button
              onClick={() => { setFilter('all'); setCurrentIdx(0); setIsFlipped(false); setSessionComplete(false); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white text-black shadow' : 'text-white/40 hover:text-white'}`}
            >All ({cards.length})</button>
            <button
              onClick={() => { setFilter('review'); setCurrentIdx(0); setIsFlipped(false); setSessionComplete(false); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filter === 'review' ? 'bg-amber-500 text-black shadow' : 'text-white/40 hover:text-white'}`}
            >Review Again ({reviewCount})</button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="relative z-10 px-6 pt-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>{currentIdx + 1} / {displayCards.length} cards</span>
          <div className="flex items-center gap-3">
            <span className="text-green-400 font-bold flex items-center gap-1"><Check size={11} /> {knowCount} Know</span>
            <span className="text-amber-400 font-bold flex items-center gap-1"><RotateCcw size={11} /> {reviewCount} Review</span>
          </div>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            animate={{ width: displayCards.length > 0 ? `${((currentIdx) / displayCards.length) * 100}%` : '0%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10">
        {sessionComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-indigo-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
              <Sparkles size={40} className="text-green-400" />
            </div>
            <h2 className="text-4xl font-black mb-4">Session Complete!</h2>
            <p className="text-slate-400 mb-2 text-lg">
              <span className="text-green-400 font-bold">{knowCount}</span> know it &nbsp;·&nbsp; <span className="text-amber-400 font-bold">{reviewCount}</span> need review
            </p>
            <p className="text-slate-500 mb-10 text-sm">
              {reviewCount > 0 ? 'Switch to "Review Again" mode to focus on the ones you missed.' : 'Perfect! You know all the cards.'}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={restart}
                className="px-8 py-4 rounded-full bg-white text-black font-black hover:scale-105 transition-all flex items-center gap-2"
              >
                <RotateCcw size={18} /> Restart
              </button>
              <Link
                to={`/guide/${shareId}`}
                className="px-8 py-4 rounded-full border border-white/10 bg-white/5 font-bold hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <BookOpen size={18} /> Back to Guide
              </Link>
            </div>
          </motion.div>
        ) : displayCards.length === 0 ? (
          <div className="text-center">
            <p className="text-slate-400 text-lg mb-6">No cards to review in this mode.</p>
            <button onClick={() => setFilter('all')} className="px-6 py-3 rounded-full bg-indigo-600 font-bold hover:scale-105 transition-all">
              Show All Cards
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            {/* Flashcard */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx + '-' + filter}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                {/* Card */}
                <div
                  className="relative w-full cursor-pointer select-none"
                  style={{ perspective: '1200px', minHeight: '320px' }}
                  onClick={() => setIsFlipped((f) => !f)}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '320px' }}
                  >
                    {/* Front */}
                    <div
                      className="absolute inset-0 rounded-[2.5rem] border flex flex-col items-center justify-center p-10 text-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        background: 'rgba(20,20,35,0.9)',
                        borderColor: 'rgba(99,102,241,0.3)',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
                      }}
                    >
                      <div className="absolute top-6 right-6 text-xs font-bold text-indigo-500/40 uppercase tracking-widest">Concept</div>
                      <p className="text-2xl md:text-3xl font-black text-white leading-tight">{currentCard?.front}</p>
                      <p className="text-slate-500 text-sm mt-6">Click to reveal definition</p>
                    </div>

                    {/* Back */}
                    <div
                      className="absolute inset-0 rounded-[2.5rem] border flex flex-col items-center justify-center p-10 text-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(135deg, rgba(20,20,50,0.95), rgba(15,15,40,0.95))',
                        borderColor: 'rgba(99,102,241,0.5)',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.2), inset 0 0 60px rgba(99,102,241,0.05)',
                      }}
                    >
                      <div className="absolute top-6 right-6 text-xs font-bold text-indigo-400/60 uppercase tracking-widest">Definition</div>
                      <p className="text-lg md:text-xl font-medium text-slate-200 leading-relaxed">{currentCard?.back}</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <AnimatePresence>
              {isFlipped ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="flex items-center justify-center gap-6 mt-8"
                >
                  <button
                    onClick={() => markCard('review')}
                    className="flex flex-col items-center gap-2 px-8 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold hover:bg-amber-500/20 transition-all hover:scale-105"
                  >
                    <X size={22} />
                    <span className="text-xs">Review Again</span>
                    <span className="text-[10px] opacity-50">← Arrow</span>
                  </button>

                  <button
                    onClick={() => setIsFlipped(false)}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <RotateCcw size={18} />
                  </button>

                  <button
                    onClick={() => markCard('know')}
                    className="flex flex-col items-center gap-2 px-8 py-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/20 transition-all hover:scale-105"
                  >
                    <Check size={22} />
                    <span className="text-xs">Know It!</span>
                    <span className="text-[10px] opacity-50">→ Arrow</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-4 mt-8"
                >
                  <button
                    onClick={() => { setCurrentIdx((i) => Math.max(0, i - 1)); setIsFlipped(false); }}
                    disabled={currentIdx === 0}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <p className="text-slate-500 text-sm">Press Space to flip</p>
                  <button
                    onClick={() => { setCurrentIdx((i) => Math.min(displayCards.length - 1, i + 1)); setIsFlipped(false); }}
                    disabled={currentIdx === displayCards.length - 1}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                  >
                    <ChevronRight size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
