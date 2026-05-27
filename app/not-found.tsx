import Link from 'next/link';
import { Shield, ChevronRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-slate-900"
    >
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
          >
            <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <div className="font-bold text-xl tracking-tight">MVAutoAssist</div>
            <div className="text-xs text-stone-500 tracking-[0.15em] uppercase">Certificate Portal</div>
          </div>
        </div>

        {/* Error number */}
        <div
          style={{ fontFamily: "'Instrument Serif', serif" }}
          className="text-8xl tracking-tight text-stone-200 mb-4 leading-none"
        >
          404
        </div>

        <h1
          style={{ fontFamily: "'Instrument Serif', serif" }}
          className="text-3xl tracking-tight mb-3"
        >
          Page not found.
        </h1>
        <p className="text-stone-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)' }}
        >
          Go to Dashboard
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
