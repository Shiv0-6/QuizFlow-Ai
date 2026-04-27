import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/10">
      <div className="container mx-auto px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-transform">
            <Zap size={20} className="text-white" fill="white" />
          </div>
          <span className="text-2xl font-black text-white tracking-tighter">
            QuizFlow <span className="text-indigo-400">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
           <Link to="/" className="text-xs font-black text-white/20 hover:text-white transition-colors uppercase tracking-[0.2em]">Learning Hub</Link>
           <button className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest">Connect</button>
        </div>
      </div>
    </header>
  );
}
