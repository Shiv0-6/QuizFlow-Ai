import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, X, Zap, ArrowLeft, Clock, Share2, Check } from 'lucide-react';

interface GuideData {
  title: string;
  overview: string;
  sections: { heading: string; content: string }[];
  keyConcepts: string[];
  summary: string;
  readingTime: string;
}

export default function GuideViewPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b backdrop-blur-xl px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(10,10,15,0.7)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-500">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="font-black text-xl">QuizFlow <span className="text-indigo-400">AI</span></span>
        </Link>

        <div className="flex items-center gap-2">
          <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            <span className="text-sm font-bold">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} /> {guide.readingTime} Read
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={12} /> AI Study Guide
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight">{guide.title}</h1>
          
          <div className="p-8 rounded-[2rem] border bg-white/5 border-white/10 mb-16">
            <p className="text-xl text-slate-300 leading-relaxed italic">"{guide.overview}"</p>
          </div>

          <div className="space-y-20">
            {guide.sections.map((section, i) => (
              <section key={i} className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-4">
                  <span className="text- indigo-500/20 text-5xl font-black">0{i + 1}</span>
                  {section.heading}
                </h2>
                <div className="text-lg text-slate-400 leading-relaxed space-y-4 whitespace-pre-wrap">
                  {section.content}
                </div>
              </section>
            ))}

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

            <section className="text-center py-20 border-t border-white/5">
              <h3 className="text-3xl font-bold mb-6">Mastered the material?</h3>
              <p className="text-slate-400 mb-10 max-w-lg mx-auto">Take a quick quiz generated from this study guide to test your understanding and lock in the knowledge.</p>
              <Link to="/" className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white text-black font-black text-lg hover:scale-105 transition-all">
                <Zap size={20} fill="black" /> Generate Quiz Now
              </Link>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function RefreshCw({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
