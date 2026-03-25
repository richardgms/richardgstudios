"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-root text-text-primary px-6 text-center">
      {/* Ícone */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-bg-surface border border-border-subtle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M9.172 14.828a5 5 0 010-7.072M12 12h.01"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold font-display mb-2">
        Sem conexão
      </h1>

      <p className="text-text-secondary max-w-xs leading-relaxed mb-6">
        O{" "}
        <span className="text-indigo-400 font-medium">Richard G Studios</span>{" "}
        precisa de conexão com o servidor para gerar imagens e acessar seu
        workspace.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors px-5 py-2.5 text-sm font-medium text-white"
      >
        Tentar novamente
      </button>
    </div>
  );
}
