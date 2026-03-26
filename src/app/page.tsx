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
  { ssr: false, loading: () => <Banana className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" /> }
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: "easeOut" }}
      className={className}
    >
      <Link
        href={mod.href}
        className={`
          group relative flex h-full overflow-hidden rounded-xl md:rounded-2xl
          bg-white/[0.03] backdrop-blur-sm
          border border-white/[0.08] ${mod.hoverBorder}
          transition-all duration-200 ease-out
          hover:shadow-lg hover:shadow-black/40 ${mod.hoverShadow} hover:-translate-y-0.5
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          focus-visible:ring-offset-bg-root focus-visible:ring-current

          flex-row items-center gap-2.5 px-3 py-2.5
          md:flex-col md:p-6
        `}
      >
        {/* Ícone */}
        <div className={`
          rounded-xl bg-gradient-to-br ${mod.iconGradient}
          flex items-center justify-center shrink-0
          group-hover:scale-110 transition-transform duration-200 ease-out
          w-7 h-7
          md:w-10 md:h-10
        `}>
          <Icon className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
        </div>

        {/* Nome + descrição (desktop) */}
        <div className="flex-1 min-w-0 md:flex md:flex-col md:flex-1 md:mt-3">
          <h2 className="font-display font-bold text-xs md:text-[17px] text-text-primary leading-tight truncate md:whitespace-normal">
            {mod.name}
          </h2>
          <p className="hidden md:block text-text-secondary text-sm leading-relaxed mt-3 flex-1">
            {mod.description}
          </p>
        </div>

        {/* Stats + CTA */}
        <div className={`
          flex items-center gap-3 shrink-0
          md:w-full md:gap-5 md:mt-5 md:pt-5 md:border-t md:border-white/[0.06]
        `}>
          {mod.stats.map((stat) => (
            <div key={stat.label} className="text-right md:text-left">
              <p className={`text-[10px] md:text-xs font-semibold font-mono leading-none ${mod.accentColor}`}>
                {stat.value}
              </p>
              <p className="hidden md:block text-[10px] text-text-muted mt-1 leading-none">
                {stat.label}
              </p>
            </div>
          ))}

          {/* CTA */}
          <div className={`ml-auto flex items-center gap-1 md:gap-1.5 text-xs font-medium ${mod.accentColor} opacity-60 group-hover:opacity-100 transition-opacity duration-200`}>
            <span className="hidden md:inline">Abrir</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HubPage() {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 md:px-8 relative">
      <HeroGeometricBackground color="#0050e6" opacity={0.55} />

      <div className="w-full max-w-3xl flex-1 flex flex-col justify-center gap-4 md:gap-16 py-6 md:py-16 pb-24 md:pb-16 relative z-10">

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: "easeOut" }}
          className="text-center shrink-0"
        >
          {/* Logo mark */}
          <div className="flex justify-center mb-2 md:mb-6">
            <div className="w-8 h-8 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden">
              <Image src="/icon.png" alt="Richard G Studios" width={56} height={56} className="w-full h-full object-cover" />
            </div>
          </div>

          <h1 className="font-display font-bold text-xl md:text-4xl text-text-primary tracking-tight">
            Richard G Studios
          </h1>
          <p className="text-text-secondary mt-1 md:mt-3 text-xs md:text-base leading-relaxed max-w-[240px] md:max-w-xs mx-auto">
            Seu ambiente de trabalho com IA
          </p>
        </motion.section>

        {/* ── Cards ── */}
        <section className="flex flex-col gap-1.5 md:gap-4 shrink-0 w-full">
          {/* Top row: 2 cards — stacked on mobile, side-by-side on desktop */}
          <div className="flex flex-col gap-1.5 md:flex-row md:gap-4">
            <ModuleCard mod={modules[0]} delay={0.14} className="md:flex-1 md:min-w-0" />
            <ModuleCard mod={modules[1]} delay={0.20} className="md:flex-1 md:min-w-0" />
          </div>
          {/* Bottom card: full width */}
          <ModuleCard mod={modules[2]} delay={0.26} />
        </section>

      </div>
    </div>
  );
}
