import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
      <div className="w-full max-w-lg mx-4 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/20 rounded-full animate-pulse pointer-events-none" />
            <AlertCircle className="relative h-16 w-16 text-violet-400" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-zinc-300 mb-4">
          Page Not Found
        </h2>
        <p className="text-zinc-500 mb-8 leading-relaxed">
          Sorry, the page you are looking for doesn't exist.
          <br />
          It may have been moved or deleted.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </a>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white px-6 py-2.5 rounded-lg transition-all duration-200 font-medium bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
