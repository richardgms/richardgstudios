"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Copy, Check, Plus, ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { LabelPicker } from "./LabelPicker";
import { ChecklistProgress } from "./ChecklistProgress";

interface ChecklistItem {
    id: string;
    text: string;
    isChecked: boolean;
    sortOrder: number;
}

interface Label {
    id: string;
    name: string;
    color: string;
}

interface KbColumn {
    id: string;
    name: string;
}

const COLORS = [
    { value: "bg-red-500", hex: "#ef4444" },
    { value: "bg-orange-500", hex: "#f97316" },
    { value: "bg-amber-500", hex: "#f59e0b" },
    { value: "bg-emerald-500", hex: "#10b981" },
    { value: "bg-teal-500", hex: "#14b8a6" },
    { value: "bg-cyan-500", hex: "#06b6d4" },
    { value: "bg-blue-500", hex: "#3b82f6" },
    { value: "bg-indigo-500", hex: "#6366f1" },
    { value: "bg-purple-500", hex: "#a855f7" },
    { value: "bg-pink-500", hex: "#ec4899" },
    { value: "bg-gray-500", hex: "#6b7280" },
];

const PRIORITIES = [
    { value: "none", label: "Nenhuma" },
    { value: "low", label: "Baixa" },
    { value: "medium", label: "Média" },
    { value: "high", label: "Alta" },
    { value: "urgent", label: "Urgente" },
];

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAY_NAMES = ["D","S","T","Q","Q","S","S"];

function CustomDatePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const today = new Date();
    const parsed = value ? new Date(value + "T00:00:00") : null;
    const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

    useEffect(() => {
        if (isOpen) {
            const cur = value ? new Date(value + "T00:00:00") : today;
            setViewYear(cur.getFullYear());
            setViewMonth(cur.getMonth());
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    const displayValue = parsed
        ? parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : null;

    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDayOfMonth).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

    const selectDay = (day: number) => {
        const d = new Date(viewYear, viewMonth, day);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        onChange(iso);
        setIsOpen(false);
    };

    const isSelected = (day: number) => {
        if (!parsed) return false;
        return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
    };

    const isToday = (day: number) =>
        today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 rounded-lg bg-bg-glass border text-sm focus:outline-none flex justify-between items-center transition-colors gap-2 ${
                    isOpen ? 'border-amber-500 text-text-primary' : 'border-border-default hover:border-amber-500/50'
                }`}
            >
                <span className={displayValue ? 'text-text-primary' : 'text-text-muted'}>
                    {displayValue ?? 'Selecionar data...'}
                </span>
                <Calendar className={`w-4 h-4 shrink-0 ${isOpen ? 'text-amber-500' : 'text-text-muted'}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-72 mt-1 right-0 bg-bg-surface border border-border-default rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden p-3"
                    >
                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-3">
                            <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-bg-glass-hover text-text-muted hover:text-text-primary transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-semibold text-text-primary">
                                {MONTH_NAMES[viewMonth]} {viewYear}
                            </span>
                            <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-bg-glass-hover text-text-muted hover:text-text-primary transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Day names */}
                        <div className="grid grid-cols-7 mb-1">
                            {DAY_NAMES.map((d, i) => (
                                <div key={i} className="text-center text-xs font-medium text-text-muted py-1">{d}</div>
                            ))}
                        </div>
                        {/* Days grid */}
                        <div className="grid grid-cols-7 gap-y-0.5">
                            {cells.map((day, i) => day === null ? (
                                <div key={i} />
                            ) : (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => selectDay(day)}
                                    className={`w-full aspect-square rounded-lg text-xs flex items-center justify-center transition-all font-medium ${
                                        isSelected(day)
                                            ? 'bg-amber-500 text-white'
                                            : isToday(day)
                                            ? 'border border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                                            : 'text-text-primary hover:bg-bg-glass-hover'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        {/* Footer */}
                        <div className="flex justify-between mt-3 pt-2 border-t border-border-default">
                            <button type="button" onClick={() => { onChange(""); setIsOpen(false); }} className="text-xs text-text-muted hover:text-text-primary transition-colors">Limpar</button>
                            <button type="button" onClick={() => { const t = today; selectDay(t.getDate()); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); }} className="text-xs text-amber-500 hover:text-amber-400 transition-colors">Hoje</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CustomSelect({
    value,
    onChange,
    options,
    placeholder
}: {
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-3 py-2 rounded-lg bg-bg-glass border text-sm focus:outline-none flex justify-between items-center transition-colors ${isOpen ? 'border-amber-500 text-text-primary' : 'border-border-default hover:border-amber-500/50 text-text-primary'}`}
            >
                <span className="truncate">{selected ? selected.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-default rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden"
                    >
                        <div className="max-h-60 py-1 custom-scrollbar">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${value === opt.value ? 'bg-amber-500/10 text-amber-500 font-medium' : 'text-text-primary hover:bg-bg-glass-hover'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface CardDetailModalProps {
    cardId: string;
    boardId: string;
    columns: KbColumn[];
    labels: Label[];
    onClose: () => void;
    onRefresh: () => void;
}

export function CardDetailModal({ cardId, boardId, columns, labels, onClose, onRefresh }: CardDetailModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState<string | null>(null);
    const [priority, setPriority] = useState("none");
    const [dueDate, setDueDate] = useState("");
    const [isCompleted, setIsCompleted] = useState(false);
    const [columnId, setColumnId] = useState("");
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [activeLabels, setActiveLabels] = useState<string[]>([]);
    const [newCheckText, setNewCheckText] = useState("");

    const fetchCard = useCallback(async () => {
        const res = await fetch(`/api/kanboard/cards/${cardId}`);
        const data = await res.json();
        if (data.id) {
            setTitle(data.title);
            setDescription(data.description || "");
            setColor(data.color);
            setPriority(data.priority || "none");
            setDueDate(data.dueDate || "");
            setIsCompleted(data.isCompleted);
            setColumnId(data.columnId);
            setChecklist(data.checklist || []);
            setActiveLabels(data.labels?.map((l: Label) => l.id) || []);
        }
    }, [cardId]);

    useEffect(() => { fetchCard(); }, [fetchCard]);

    const save = async (updates: Record<string, string | boolean | null | undefined>) => {
        await fetch("/api/kanboard/cards", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: cardId, ...updates }),
        });
        onRefresh();
    };

    const handleTitleBlur = () => save({ title });
    const handleDescBlur = () => save({ description });
    const handleColorChange = (c: string | null) => { setColor(c); save({ color: c }); };
    const handlePriorityChange = (p: string) => { setPriority(p); save({ priority: p }); };
    const handleDueDateChange = (d: string) => { setDueDate(d); save({ dueDate: d || null }); };
    const handleColumnChange = (cId: string) => { setColumnId(cId); save({ columnId: cId }); };
    const handleToggleComplete = () => {
        setIsCompleted(!isCompleted);
        save({ isCompleted: !isCompleted });
    };

    const handleToggleLabel = async (labelId: string) => {
        await fetch("/api/kanboard/labels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggle", cardId, labelId }),
        });
        setActiveLabels(prev =>
            prev.includes(labelId) ? prev.filter(id => id !== labelId) : [...prev, labelId]
        );
        onRefresh();
    };

    const handleAddCheckItem = async () => {
        if (!newCheckText.trim()) return;
        const res = await fetch("/api/kanboard/checklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId, text: newCheckText }),
        });
        const data = await res.json();
        setChecklist(prev => [...prev, { id: data.id, text: newCheckText, isChecked: false, sortOrder: prev.length }]);
        setNewCheckText("");
    };

    const handleToggleCheck = async (itemId: string) => {
        await fetch("/api/kanboard/checklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggle", id: itemId }),
        });
        setChecklist(prev => prev.map(c => c.id === itemId ? { ...c, isChecked: !c.isChecked } : c));
    };

    const handleDeleteCheck = async (itemId: string) => {
        await fetch(`/api/kanboard/checklist?id=${itemId}`, { method: "DELETE" });
        setChecklist(prev => prev.filter(c => c.id !== itemId));
    };

    const handleDelete = async () => {
        await fetch(`/api/kanboard/cards?id=${cardId}`, { method: "DELETE" });
        onRefresh();
        onClose();
    };

    const handleDuplicate = async () => {
        await fetch("/api/kanboard/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ columnId, boardId, title: `${title} (cópia)`, description, color, priority }),
        });
        onRefresh();
    };

    const checkedCount = checklist.filter(c => c.isChecked).length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-bg-surface border border-border-default rounded-2xl shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                        <div className="flex items-center gap-3 flex-1">
                            <button
                                onClick={handleToggleComplete}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isCompleted
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "border-border-hover hover:border-amber-500"
                                    }`}
                            >
                                {isCompleted && <Check className="w-4 h-4 text-white" />}
                            </button>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                className="flex-1 bg-transparent text-lg font-bold text-text-primary focus:outline-none"
                                placeholder="Título do card"
                            />
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-glass-hover text-text-muted">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-6 pb-6 space-y-5">
                        {/* Move to column */}
                        <div>
                            <label className="block text-xs font-medium text-text-muted mb-1.5">Coluna</label>
                            <CustomSelect
                                value={columnId}
                                onChange={handleColumnChange}
                                options={columns.map(c => ({ value: c.id, label: c.name }))}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-text-muted mb-1.5">Descrição</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={handleDescBlur}
                                placeholder="Adicionar descrição..."
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent resize-none"
                            />
                        </div>

                        {/* Labels */}
                        <div>
                            <label className="block text-xs font-medium text-text-muted mb-1.5">Labels</label>
                            <LabelPicker labels={labels} activeIds={activeLabels} onToggle={handleToggleLabel} />
                        </div>

                        {/* Priority + Due Date row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-text-muted mb-1.5">Prioridade</label>
                                <CustomSelect
                                    value={priority}
                                    onChange={handlePriorityChange}
                                    options={PRIORITIES}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-muted mb-1.5">Prazo</label>
                                <CustomDatePicker
                                    value={dueDate}
                                    onChange={handleDueDateChange}
                                />
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <label className="block text-xs font-medium text-text-muted mb-1.5">Cor</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleColorChange(null)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${!color ? "ring-2 ring-white ring-offset-1 ring-offset-bg-surface" : "border-border-default"}`}
                                    title="Sem cor"
                                >
                                    <X className="w-3 h-3 mx-auto text-text-muted" />
                                </button>
                                {COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => handleColorChange(c.value)}
                                        className={`w-6 h-6 rounded-full transition-all ${color === c.value ? "ring-2 ring-white ring-offset-1 ring-offset-bg-surface scale-110" : "hover:scale-110"}`}
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Checklist */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-text-muted">Checklist</label>
                                {checklist.length > 0 && (
                                    <ChecklistProgress total={checklist.length} checked={checkedCount} />
                                )}
                            </div>
                            <div className="space-y-1.5">
                                {checklist.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 group">
                                        <button
                                            onClick={() => handleToggleCheck(item.id)}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${item.isChecked
                                                ? "bg-emerald-500 border-emerald-500"
                                                : "border-border-hover hover:border-amber-500"
                                                }`}
                                        >
                                            {item.isChecked && <Check className="w-3 h-3 text-white" />}
                                        </button>
                                        <span className={`text-sm flex-1 ${item.isChecked ? "line-through text-text-muted" : "text-text-primary"}`}>
                                            {item.text}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteCheck(item.id)}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <input
                                    type="text"
                                    value={newCheckText}
                                    onChange={(e) => setNewCheckText(e.target.value)}
                                    placeholder="Novo item..."
                                    className="flex-1 px-3 py-1.5 rounded-lg bg-bg-glass border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none kb-focus-accent"
                                    onKeyDown={(e) => { if (e.key === "Enter") handleAddCheckItem(); }}
                                />
                                <button
                                    onClick={handleAddCheckItem}
                                    disabled={!newCheckText.trim()}
                                    className="p-1.5 rounded-lg kb-accent-gradient disabled:opacity-40"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-3 border-t border-border-default">
                            <button
                                onClick={handleDuplicate}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-bg-glass-hover transition-colors border border-border-default"
                            >
                                <Copy className="w-3.5 h-3.5" /> Duplicar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20 ml-auto"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
