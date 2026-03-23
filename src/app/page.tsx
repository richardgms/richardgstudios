"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Banana, BookmarkCheck, Columns3, ArrowRight, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import React from "react";

// Use next/dynamic to avoid adding the SVG to the initial JS bundle and avoid SSR blocking
const HeroGeometricBackground = dynamic(
  () => import("@/components/ui/svg-animations/HeroBackground").then(mod => mod.HeroGeometricBackground),
  { ssr: false }
);

const StudioModuleIcon = dynamic(
  () => import("@/components/ui/svg-animations/ModuleCardIcons").then(mod => mod.StudioModuleIcon),
  { ssr: false, loading: () => <Banana className="w-7 h-7 text-white" /> }
);

const modules = [
  {
    id: "studio",
    name: "NanoBanana Studio",
    description: "Explore mais de 12.000 prompts profissionais e gere imagens com IA diretamente no seu computador.",
    href: "/browse",
    icon: StudioModuleIcon, // Switched to the dynamic animated SVG 
    gradient: "from-accent/20 via-purple-500/10 to-transparent",
    iconGradient: "from-accent to-purple-500",
    accentColor: "text-accent-light",
    stats: [
      { label: "Prompts", value: "12.000+" },
      { label: "Modelos IA", value: "Flash + Pro" },
    ],
  },
  {
    id: "promptsave",
    name: "PromptSave",
    description: "Salve, organize e reutilize seus prompts pessoais — de código, imagem, texto e muito mais.",
    href: "/vault",
    icon: BookmarkCheck,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    iconGradient: "from-emerald-500 to-teal-600",
    accentColor: "text-emerald-400",
    stats: [
      { label: "Bibliotecas", value: "∞" },
      { label: "Com IA", value: "Gemini" },
    ],
  },
  {
    id: "kanboard",
    name: "KanBoard",
    description: "Organize suas tarefas e projetos com quadros Kanban — arraste, priorize e acompanhe o progresso.",
    href: "/boards",
    icon: Columns3,
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    iconGradient: "from-amber-500 to-orange-600",
    accentColor: "text-amber-400",
    stats: [
      { label: "Quadros", value: "∞" },
      { label: "Drag & Drop", value: "Multi" },
    ],
  },
];

export default function HubPage() {
  return (
    <div className="flex-1 overflow-y-auto relative">
      {/* 
        Ação QA: SVG pesado carregado nativamente com Lazy-loading (next/dynamic) para não obstruir o FP (First Paint).
        A classe text-accent garante que o SVG herde as cores da marca.
      */}
      <HeroGeometricBackground className="text-accent/80" opacity={0.25} />

      <div className="p-8 max-w-4xl mx-auto space-y-10 relative z-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-8 pb-4"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="font-display font-bold text-4xl text-text-primary">
            Richard G Studios
          </h1>
          <p className="text-text-secondary mt-3 max-w-md mx-auto text-lg">
            Seu ambiente de trabalho com IA
          </p>
        </motion.section>

        {/* Module Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
              >
                <Link
                  href={mod.href}
                  className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br ${mod.gradient} border border-border-default hover:border-border-hover p-6 transition-all duration-300 hover:shadow-lg`}
                >
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.iconGradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <h2 className="font-display font-bold text-xl text-text-primary mb-2">
                    {mod.name}
                  </h2>
                  <p className="text-text-secondary text-sm leading-relaxed mb-5">
                    {mod.description}
                  </p>

                  {/* Stats */}
                  <div className="flex gap-4 mb-5">
                    {mod.stats.map((stat) => (
                      <div key={stat.label} className="glass-card px-3 py-2 text-center flex-1">
                        <p className={`text-xs font-mono ${mod.accentColor}`}>
                          {stat.value}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className={`flex items-center gap-1 text-sm font-medium ${mod.accentColor} group-hover:gap-2 transition-all`}>
                    Abrir
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  {/* Decorative glow */}
                  <div className={`absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br ${mod.iconGradient} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`} />
                </Link>
              </motion.div>
            );
          })}
        </section>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-text-muted pb-8"
        >
          Selecione um módulo para começar · Use a barra lateral para trocar rapidamente
        </motion.p>
      </div>
    </div>
  );
}
