import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Zap, ArrowLeft, Clock, BookOpen,
  Check, LayoutGrid, List, ChevronDown, ChevronUp,
  BookMarked, Eye,
} from 'lucide-react';

interface Section {
  heading: string;
  content: string;
}

interface GuideData {
  title: string;
  overview: string;
  sections: Section[];
  keyConcepts: string[];
  summary: string;
  readingTime: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the first N characters of text, cut at a word boundary. */
function shortPreview(text: string, maxChars = 160): string {
  const clean = text.replace(/\n+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

/** Find the first sentence in any section that mentions this concept. */
function findConceptExplanation(concept: string, sections: Section[]): string {
  for (const section of sections) {
    if (section.content.toLowerCase().includes(concept.toLowerCase())) {
      const sentences = section.content.split(/(?<=[.!?])\s+/);
      const hit = sentences.find((s) =>
        s.toLowerCase().includes(concept.toLowerCase())
      );
      if (hit && hit.trim().length > 20) {
        return hit.trim().length > 300 ? hit.trim().slice(0, 300) + '…' : hit.trim();
      }
    }
  }
  return '';
}

// ─── Section Card (expandable) ────────────────────────────────────────────────
// SectionCardControlled is used instead (supports forceExpanded from parent)

// ─── Concept Row (expandable) ─────────────────────────────────────────────────
function ConceptRow({
  concept,
  index,
  sections,
}: {
  concept: string;
  index: number;
  sections: Section[];
}) {
  const [open, setOpen] = useState(false);
  const explanation = findConceptExplanation(concept, sections);

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        borderColor: open ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)',
        background: open ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.03)',
      }}
    >
      <button
        onClick={() => explanation && setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left focus:outline-none"
        style={{ cursor: explanation ? 'pointer' : 'default' }}
      >
        {/* Check / number badge */}
        <div
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all"
          style={{
            background: open ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.12)',
            color: open ? '#a5b4fc' : '#6366f1',
          }}
        >
          {open ? <Check size={11} /> : index + 1}
        </div>

        <span
          className="text-sm font-bold flex-1 transition-colors"
          style={{ color: open ? '#c7d2fe' : '#e2e8f0' }}
        >
          {concept}
        </span>

        {explanation && (
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={13} className="text-indigo-400/40 shrink-0" />
          </motion.div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && explanation && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1 text-[13px] text-slate-400 leading-relaxed border-t"
              style={{ borderColor: 'rgba(99,102,241,0.12)' }}
            >
              {explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RevisionPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const res = await fetch(`/api/guides/${shareId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? 'Guide not found.');
        } else {
          setGuide(data);
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchGuide();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <RefreshCw size={40} className="text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Revision Material Not Found</h1>
        <p className="text-slate-400 mb-8 max-w-md">{error}</p>
        <Link to="/" className="px-8 py-3 rounded-full bg-indigo-600 font-bold hover:scale-105 transition-all">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      {/* Top Bar */}
      <div
        className="sticky top-0 z-50 border-b backdrop-blur-xl px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,15,0.7)', borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            to={`/guide/${shareId}`}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]">
              <LayoutGrid size={14} className="text-white" fill="white" />
            </div>
            <span className="font-black text-xl hidden md:block">
              Quick <span className="text-indigo-400">Revision</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Expand all toggle */}
          <button
            onClick={() => setAllExpanded((v) => !v)}
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all"
            style={{
              background: allExpanded ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
              borderColor: allExpanded ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)',
              color: allExpanded ? '#a5b4fc' : '#64748b',
            }}
          >
            {allExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
            <Clock size={10} /> {guide.readingTime}
          </div>
          <Link
            to={`/guide/${shareId}`}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-bold"
          >
            <List size={14} />
            <span className="hidden sm:inline">Full Guide</span>
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tight">{guide.title}</h1>
            <p className="text-slate-400 text-lg max-w-3xl leading-relaxed">{guide.overview}</p>
            <p className="text-xs font-bold text-indigo-400/40 uppercase tracking-widest mt-4">
              {guide.sections.length} topics · tap any card to read in depth
            </p>
          </div>

          {/* ── Topic grid (expandable cards) ── */}
          <ExpandController expanded={allExpanded}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {guide.sections.map((section, i) => (
                <SectionCardControlled
                  key={i}
                  section={section}
                  index={i}
                  forceExpanded={allExpanded}
                />
              ))}
            </div>
          </ExpandController>

          {/* ── Essentials — expandable concepts ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: guide.sections.length * 0.05 }}
            className="rounded-[2.5rem] border p-8 mb-8 relative overflow-hidden"
            style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.18)' }}
          >
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/10 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <Sparkles size={20} className="text-indigo-400" />
              <h3 className="text-xl font-bold">Essentials</h3>
              <span className="ml-auto text-[10px] font-black text-indigo-400/40 uppercase tracking-widest hidden sm:block">
                Click any concept to expand its explanation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative z-10">
              {guide.keyConcepts.map((concept, i) => (
                <ConceptRow key={i} concept={concept} index={i} sections={guide.sections} />
              ))}
            </div>
          </motion.div>

          {/* ── Summary block ── */}
          {guide.summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (guide.sections.length + 1) * 0.05 }}
              className="rounded-[2rem] border p-8 mb-16"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-300">
                <BookMarked size={18} className="text-slate-500" /> Chapter Summary
              </h3>
              <p className="text-slate-400 leading-relaxed">{guide.summary}</p>
            </motion.div>
          )}

          {/* ── CTA ── */}
          <div className="rounded-[3rem] bg-gradient-to-br from-indigo-600 to-blue-700 p-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <Zap size={200} fill="white" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-4xl font-black mb-4">Revision Complete?</h2>
              <p className="text-indigo-100 text-lg mb-10 font-medium">
                Test your knowledge with a quiz, or drill concepts with flashcards. Combining revision with active recall is the best way to master material.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to={`/guide/${shareId}/flashcards`}
                  className="px-8 py-4 rounded-full bg-white/20 border border-white/30 text-white font-black text-base hover:bg-white/30 transition-all flex items-center gap-3"
                >
                  <BookOpen size={18} /> Flashcard Session
                </Link>
                <Link
                  to="/"
                  className="px-8 py-4 rounded-full bg-white text-black font-black text-base hover:scale-105 transition-all shadow-xl flex items-center gap-3"
                >
                  <Zap size={18} fill="black" /> Take Practice Quiz
                </Link>
              </div>
            </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}

// ─── Controlled wrapper that passes forceExpanded to children ─────────────────
// We use a simple context-free approach: just pass forceExpanded as a prop.
function ExpandController({ children, expanded: _ }: { children: React.ReactNode; expanded: boolean }) {
  return <>{children}</>;
}

// ─── Section card with external force-expand support ─────────────────────────
function SectionCardControlled({
  section,
  index,
  forceExpanded,
}: {
  section: Section;
  index: number;
  forceExpanded: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpanded || localExpanded;
  const preview = shortPreview(section.content);
  const hasMore = section.content.replace(/\n+/g, ' ').trim().length > 160;

  // When forceExpanded turns false, collapse local state too
  useEffect(() => {
    if (!forceExpanded) setLocalExpanded(false);
  }, [forceExpanded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] blur opacity-0 group-hover:opacity-20 transition duration-500" />

      <div
        className="relative rounded-[2rem] border transition-all flex flex-col overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: expanded ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)',
          boxShadow: expanded ? '0 0 30px rgba(99,102,241,0.08)' : 'none',
        }}
      >
        {/* Always-visible header */}
        <button
          onClick={() => setLocalExpanded((e) => !e)}
          className="w-full text-left p-7 focus:outline-none"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-indigo-500/30 text-3xl font-black tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: expanded ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)',
                border: `1px solid ${expanded ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)'}`,
              }}
            >
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
                <ChevronDown size={14} className="text-indigo-400" />
              </motion.div>
            </div>
          </div>

          <h3
            className="text-lg font-bold mb-3 leading-snug transition-colors"
            style={{ color: expanded ? '#a5b4fc' : '#f1f5f9' }}
          >
            {section.heading}
          </h3>

          {/* Short preview — always visible */}
          <p className="text-slate-400 text-sm leading-relaxed">{preview}</p>

          {hasMore && !expanded && (
            <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold text-indigo-400/50 uppercase tracking-widest">
              <Eye size={10} /> Read full explanation
            </span>
          )}
        </button>

        {/* Full content on expand */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div
                className="px-7 pb-6 pt-2 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap border-t"
                style={{ borderColor: 'rgba(99,102,241,0.1)' }}
              >
                {section.content}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setLocalExpanded(false); }}
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-indigo-400/40 hover:text-indigo-400 transition-colors border-t"
                style={{ borderColor: 'rgba(99,102,241,0.08)' }}
              >
                <ChevronUp size={12} /> Collapse
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Inline SVG RefreshCw ─────────────────────────────────────────────────────
function RefreshCw({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
