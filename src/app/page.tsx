"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Banana, BookmarkCheck, Columns3, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import React from "react";

const HeroGeometricBackground = dynamic(
  () => import("@/components/ui/svg-animations/HeroBackground").then(mod => mod.HeroGeometricBackground),
  { ssr: false }
);

const StudioModuleIcon = dynamic(
  () => import("@/components/ui/svg-animations/ModuleCardIcons").then(mod => mod.StudioModuleIcon),
  { ssr: false, loading: () => <Banana className="w-6 h-6 text-white" /> }
);

const modules = [
  {
    id: "studio",
    name: "NanoBanana Studio",
    description: "Explore prompts profissionais e gere imagens e vídeos com IA.",
    href: "/browse",
    icon: StudioModuleIcon,
    iconGradient: "from-accent to-purple-500",
    accentColor: "text-accent-light",
    hoverShadow: "hover:shadow-accent/15",
    hoverBorder: "hover:border-accent/30",
    stats: [
      { label: "Prompts", value: "12k+" },
      { label: "Modelos", value: "Flash · Pro" },
    ],
  },
  {
    id: "promptsave",
    name: "PromptSave",
    description: "Salve, organize e reutilize seus prompts pessoais com IA.",
    href: "/vault",
    icon: BookmarkCheck,
    iconGradient: "from-emerald-500 to-teal-600",
    accentColor: "text-emerald-400",
    hoverShadow: "",
    hoverBorder: "hover:border-emerald-500/30",
    stats: [
      { label: "Pastas", value: "∞" },
      { label: "Motor", value: "Gemini" },
    ],
  },
  {
    id: "kanboard",
    name: "KanBoard",
    description: "Quadros Kanban para organizar tarefas e projetos com drag-and-drop.",
    href: "/boards",
    icon: Columns3,
    iconGradient: "from-amber-500 to-orange-500",
    accentColor: "text-amber-400",
    hoverShadow: "hover:shadow-amber-500/15",
    hoverBorder: "hover:border-amber-500/30",
    stats: [
      { label: "Quadros", value: "∞" },
      { label: "Colunas", value: "Multi" },
    ],
  },
];

function ModuleCard({
  mod,
  delay,
  className = "",
}: {
  mod: (typeof modules)[number];
  delay: number;
  className?: string;
}) {
  const Icon = mod.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: "easeOut" }}
      className={className}
    >
      <Link
        href={mod.href}
        className={`
          group relative flex flex-col h-full overflow-hidden rounded-2xl
          bg-white/[0.03] backdrop-blur-sm
          border border-white/[0.08] ${mod.hoverBorder}
          p-5 md:p-6
          cursor-pointer
          transition-all duration-200 ease-out
          hover:shadow-lg hover:shadow-black/40 ${mod.hoverShadow} hover:-translate-y-0.5
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          focus-visible:ring-offset-bg-root focus-visible:ring-current
        `}
      >
        {/* Header: ícone + título */}
        <div className="flex flex-col" style={{ gap: "12px" }}>
          <div className={`
            w-10 h-10 rounded-xl bg-gradient-to-br ${mod.iconGradient}
            flex items-center justify-center shrink-0
            group-hover:scale-110 transition-transform duration-200 ease-out
          `}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-display font-bold text-base md:text-[17px] text-text-primary leading-tight">
            {mod.name}
          </h2>
        </div>

        {/* Body: descrição + stats */}
        <div className="flex flex-col flex-1" style={{ marginTop: "20px" }}>
          <p className="text-text-secondary text-xs md:text-sm leading-relaxed flex-1">
            {mod.description}
          </p>

          {/* Stats */}
          <div className="flex gap-5 mt-5 pt-5 border-t border-white/[0.06]">
            {mod.stats.map((stat) => (
              <div key={stat.label}>
                <p className={`text-xs font-semibold font-mono leading-none ${mod.accentColor}`}>
                  {stat.value}
                </p>
                <p className="text-[10px] text-text-muted mt-1 leading-none">
                  {stat.label}
                </p>
              </div>
            ))}

            {/* CTA alinhado à direita */}
            <div className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${mod.accentColor} opacity-60 group-hover:opacity-100 transition-opacity duration-200`}>
              <span>Abrir</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HubPage() {
  return (
    /* flex-1 + overflow-y-auto + flex col justify-center no mesmo elemento:
       garante que justify-center tem height definida (flex-1) e que o scroll funciona */
    <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 md:px-8 relative">
      <HeroGeometricBackground color="#0050e6" opacity={0.55} />

      <div className="w-full max-w-3xl flex-1 flex flex-col justify-center gap-10 md:gap-16 py-12 md:py-16 pb-24 md:pb-16 relative z-10">

          {/* ── Hero ── */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: "easeOut" }}
            className="text-center shrink-0"
          >
            {/* Logo mark */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl overflow-hidden">
                <Image src="/icon.png" alt="Richard G Studios" width={56} height={56} className="w-full h-full object-cover" />
              </div>
            </div>

            <h1 className="font-display font-bold text-3xl md:text-4xl text-text-primary tracking-tight">
              Richard G Studios
            </h1>
            <p className="text-text-secondary mt-3 text-sm md:text-base leading-relaxed max-w-[240px] md:max-w-xs mx-auto">
              Seu ambiente de trabalho com IA
            </p>
          </motion.section>

          {/* ── Cards ── */}
          <section className="flex flex-col gap-3 md:gap-4 shrink-0 w-full">
            <div className="flex gap-3 md:gap-4">
              <ModuleCard mod={modules[0]} delay={0.14} className="flex-1 min-w-0" />
              <ModuleCard mod={modules[1]} delay={0.22} className="flex-1 min-w-0" />
            </div>
            <ModuleCard mod={modules[2]} delay={0.30} />
          </section>

        </div>
      </div>
  );
}
