"use client";

import { Columns3, Plus } from "lucide-react";
import { motion } from "framer-motion";

export function BoardEmptyState({ onCreateBoard }: { onCreateBoard: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-8"
        >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
                <Columns3 className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="font-display font-bold text-xl text-text-primary mb-2">
                Nenhum quadro ainda
            </h2>
            <p className="text-text-secondary text-sm max-w-sm mb-6">
                Crie seu primeiro quadro Kanban para organizar tarefas, projetos e ideias.
            </p>
            <button
                onClick={onCreateBoard}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl kb-accent-gradient font-medium text-sm transition-all hover:scale-105"
            >
                <Plus className="w-4 h-4" />
                Criar Quadro
            </button>
        </motion.div>
    );
}
