export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-white/5 bg-background">
      <div className="container mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-xs font-bold text-white/20 uppercase tracking-[0.2em]">
          © {currentYear} QuizFlow AI · Personalized Learning Engine
        </p>
        <div className="flex items-center gap-8">
           <a href="#" className="text-xs font-bold text-white/20 hover:text-white transition-colors uppercase tracking-widest">Privacy</a>
           <a href="#" className="text-xs font-bold text-white/20 hover:text-white transition-colors uppercase tracking-widest">Terms</a>
           <a href="#" className="text-xs font-bold text-white/20 hover:text-white transition-colors uppercase tracking-widest">Contact</a>
        </div>
      </div>
    </footer>
  );
}
