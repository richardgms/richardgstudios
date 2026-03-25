"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { sendMessageAction } from "@/app/actions/chatActions";
import { Send, X, Bot, Sparkles, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ChatPanel() {
  const { isOpen, messages, addMessage, toggleChat, isLoading, setIsLoading, clearMessages } = useChatStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();
    setInput("");
    addMessage({ role: "user", content: userContent });
    setIsLoading(true);

    const history = [...messages, { role: "user", content: userContent }];
    const result = await sendMessageAction(history.map(m => ({ role: m.role, content: m.content })));

    if (result.success && result.text) {
      addMessage({ role: "assistant", content: result.text });
    } else {
      addMessage({ role: "assistant", content: "Erro ao processar mensagem: " + (result.error || "Desconhecido") });
    }
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile or focus */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleChat}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
          
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="fixed right-0 top-0 w-full sm:w-[400px] h-dvh bg-bg-surface/95 backdrop-blur-xl border-l border-border-default shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shadow-inner">
                  <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-text-primary tracking-tight">Nano Intel</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Gemini 2.0 Flash</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearMessages}
                  title="Limpar chat"
                  className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={toggleChat} 
                  className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-accent/5 flex items-center justify-center border border-accent/10">
                    <Bot className="w-8 h-8 text-accent/40" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-text-primary font-medium">Chat de Inteligência Nano</p>
                    <p className="text-xs text-text-muted max-w-[200px] leading-relaxed">
                      Pergunte sobre seus prompts, peça ajuda com código ou explore novas ideias criativas.
                    </p>
                  </div>
                </div>
              )}
              
              {messages.map((m, index) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`group relative max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === "user" 
                      ? "bg-accent text-white rounded-tr-none font-medium ml-4 shadow-accent/20" 
                      : "bg-bg-glass border border-white/10 text-text-primary rounded-tl-none mr-4 backdrop-blur-md"
                  }`}>
                    {m.content}
                    <span className={`absolute top-full mt-1 text-[9px] opacity-0 group-hover:opacity-40 transition-opacity ${
                      m.role === "user" ? "right-0" : "left-0"
                    }`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-bg-glass border border-white/5 p-4 rounded-2xl rounded-tl-none backdrop-blur-md">
                    <div className="flex gap-1.5">
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }} 
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                        className="w-1.5 h-1.5 rounded-full bg-accent" 
                      />
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }} 
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-accent" 
                      />
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }} 
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                        className="w-1.5 h-1.5 rounded-full bg-accent" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Container */}
            <div className="px-6 pt-6 border-t border-border-default bg-bg-surface/30 backdrop-blur-sm pb-mobile-nav-chat">
              <div className="relative group flex items-end gap-2 bg-bg-glass-hover/20 border border-white/5 rounded-2xl p-2 transition-all focus-within:border-accent/30 focus-within:bg-bg-glass-hover/40 shadow-inner">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Mensagem para Nano Intel..."
                  className="w-full bg-transparent border-none rounded-xl pl-3 pr-2 py-2.5 text-sm text-text-primary focus:outline-none resize-none max-h-32"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-accent hover:bg-accent-hover disabled:opacity-20 disabled:grayscale text-white rounded-xl transition-all shadow-lg active:scale-95"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
              <p className="text-[10px] text-center mt-3 text-text-muted">
                Nano Intel pode cometer erros. Verifique informações importantes.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
