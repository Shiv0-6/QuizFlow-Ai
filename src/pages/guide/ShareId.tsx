import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, Zap, Clock, Share2, Check, LayoutGrid, Layers } from 'lucide-react';

interface GuideData {
  title: string;
  overview: string;
  sections: { heading: string; content: string }[];
  keyConcepts: string[];
  summary: string;
  readingTime: string;
}

// Simple inline markdown renderer — handles **bold**, *italic*, and - bullet lists
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, li) => {
    // Bullet list
    if (line.match(/^[-*•]\s+/)) {
      const content = line.replace(/^[-*•]\s+/, '');
      nodes.push(
        <div key={li} className="flex items-start gap-2 my-1">
          <span className="text-indigo-400 mt-1.5 shrink-0">•</span>
          <span>{inlineMarkdown(content)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={li} className="my-2" />);
    } else {
      nodes.push(<p key={li} className="my-1">{inlineMarkdown(line)}</p>);
    }
  });
  return nodes;
}

function inlineMarkdown(text: string): React.ReactNode {
  // Handle **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-indigo-300">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function GuideViewPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

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

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setReadingProgress(progress);

      // Active section detection
      if (sectionRefs.current.length > 0) {
        let active = 0;
        sectionRefs.current.forEach((ref, i) => {
          if (ref && ref.getBoundingClientRect().top < 200) {
            active = i;
          }
        });
        setActiveSection(active);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToSection = (i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <RefreshCw size={40} className="text-primary" />
        </motion.div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-6">
        <h1 className="text-4xl font-bold mb-4">Guide not found</h1>
        <p className="text-slate-400 mb-8">{error}</p>
        <Link to="/" className="px-6 py-3 rounded-full bg-indigo-600 font-bold hover:scale-105 transition-all">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500"
          style={{ width: `${readingProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b backdrop-blur-xl px-4 sm:px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(10,10,15,0.7)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-500">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="font-black text-xl hidden sm:block">QuizFlow <span className="text-indigo-400">AI</span></span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to={`/guide/${shareId}/flashcards`} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all text-xs sm:text-sm font-bold">
            <Layers size={13} />
            <span className="hidden sm:inline">Flashcards</span>
          </Link>
          <Link to={`/guide/${shareId}/revision`} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs sm:text-sm font-bold">
            <LayoutGrid size={13} />
            <span className="hidden sm:inline">Quick Revision</span>
          </Link>
          <button onClick={copyLink} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-xs sm:text-sm font-bold">
            {copied ? <Check size={13} /> : <Share2 size={13} />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Layout: Sidebar + Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 flex gap-10">

        {/* Table of Contents — Desktop Sticky Sidebar */}
        {guide.sections.length > 1 && (
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Contents</p>
              {guide.sections.map((section, i) => (
                <button
                  key={i}
                  onClick={() => scrollToSection(i)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all leading-snug ${
                    activeSection === i
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-indigo-500/40 mr-1">0{i + 1}</span> {section.heading}
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Meta badges */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> {guide.readingTime} Read
              </div>
              <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} /> AI Study Guide
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-black uppercase tracking-widest">
                {guide.sections.length} Topics
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-black mb-8 leading-tight">{guide.title}</h1>

            {/* Overview */}
            <div className="p-8 rounded-[2rem] border bg-white/5 border-white/10 mb-16">
              <p className="text-xl text-slate-300 leading-relaxed italic">"{guide.overview}"</p>
            </div>

            {/* Mobile Table of Contents Chips */}
            {guide.sections.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-12 lg:hidden">
                {guide.sections.map((section, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToSection(i)}
                    className="shrink-0 px-4 py-2 rounded-full border text-xs font-bold transition-all"
                    style={{
                      background: activeSection === i ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: activeSection === i ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                      color: activeSection === i ? '#a5b4fc' : '#64748b',
                    }}
                  >
                    {section.heading}
                  </button>
                ))}
              </div>
            )}

            {/* Sections */}
            <div className="space-y-20">
              {guide.sections.map((section, i) => (
                <section
                  key={i}
                  ref={(el) => { sectionRefs.current[i] = el; }}
                  className="space-y-6 scroll-mt-28"
                  id={`section-${i}`}
                >
                  <h2 className="text-3xl font-bold flex items-center gap-4">
                    <span className="text-indigo-500/20 text-5xl font-black">0{i + 1}</span>
                    {section.heading}
                  </h2>
                  <div className="text-lg text-slate-400 leading-relaxed space-y-1">
                    {renderMarkdown(section.content)}
                  </div>
                </section>
              ))}

              {/* Key Concepts */}
              <section className="p-10 rounded-[2.5rem] bg-indigo-600/5 border border-indigo-600/20 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/10 blur-3xl rounded-full" />
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
                  <Sparkles size={24} className="text-indigo-400" /> Key Concepts to Remember
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guide.keyConcepts.map((concept, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} className="text-indigo-400" />
                      </div>
                      <span className="font-bold text-slate-200">{concept}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Summary */}
              {guide.summary && (
                <section className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <BookOpen size={22} className="text-slate-400" /> Summary
                  </h3>
                  <p className="text-slate-400 text-lg leading-relaxed">{guide.summary}</p>
                </section>
              )}

              {/* Practice CTA */}
              <section className="text-center py-20 border-t border-white/5">
                <h3 className="text-3xl font-bold mb-6">Mastered the material?</h3>
                <p className="text-slate-400 mb-10 max-w-lg mx-auto">Take a quiz, do flashcards, or do a quick revision. The best learning combines reading, recall, and testing.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to={`/guide/${shareId}/flashcards`} className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-violet-600 text-white font-black text-base hover:scale-105 transition-all">
                    <Layers size={18} /> Flashcard Session
                  </Link>
                  <Link to={`/guide/${shareId}/revision`} className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-white/10 bg-white/5 text-white font-black text-base hover:bg-white/10 transition-all">
                    <LayoutGrid size={18} /> Quick Revision
                  </Link>
                  <Link to="/" className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-black text-base hover:scale-105 transition-all">
                    <Zap size={18} fill="black" /> Generate Quiz
                  </Link>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function RefreshCw({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
