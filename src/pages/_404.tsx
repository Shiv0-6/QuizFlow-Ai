import { Link } from '../router';

/**
 * 404 Not Found page component
 *
 * Displays a user-friendly error page when a route is not found.
 * Includes navigation to available pages and a back button.
 * The layout (header/footer) is handled by RootLayout in App.tsx.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
      }} />

      <div className="container mx-auto px-4 max-w-2xl text-center relative z-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-9xl font-black text-white/10" style={{ fontFamily: 'var(--font-heading)' }}>404</h1>
            <h2 className="text-4xl font-extrabold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              Lost in Space
            </h2>
            <p className="text-xl font-medium text-muted-foreground">
              Sorry, the page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/">
              <button className="w-full sm:w-auto px-8 py-4 bg-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105" style={{ color: '#000000' }}>🏠 Go Home</button>
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 backdrop-blur-md font-bold rounded-2xl border border-white/10 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105" onClick={() => window.history.back()}>← Go Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
