'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore, ChatMessage } from '@/store/useAppStore';
import { aiApi } from '@/lib/api';
import { formatInrShort, calcEmiRatio } from '@/lib/mock-bureau';

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ChatWidget() {
  const {
    chatOpen,
    setChatOpen,
    chatMessages,
    addChatMessage,
    auth,
    bureau,
    profile,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emiRatio = calcEmiRatio(bureau.loans, profile.income);

  // Proactive greeting
  useEffect(() => {
    if (chatOpen && chatMessages.length === 0 && auth.user) {
      const greeting: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Hi ${auth.user.name.split(' ')[0]}! 👋 I see your EMI-to-income ratio is ${emiRatio}%${emiRatio > 50 ? ' — that\'s quite high' : ''}. ${
          bureau.loans.length > 0
            ? `You have ${bureau.loans.length} active loans totalling ${formatInrShort(bureau.loans.reduce((s, l) => s + l.outstanding, 0))} in debt.`
            : ''
        } Want me to explain your best optimization strategy?`,
        timestamp: new Date(),
      };
      addChatMessage(greeting);
    }
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen, chatMessages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    addChatMessage(userMsg);
    setLoading(true);

    try {
      const context = {
        userName: auth.user?.name,
        cibilScore: bureau.cibilScore,
        totalDebt: bureau.loans.reduce((s, l) => s + l.outstanding, 0),
        monthlyEmi: bureau.loans.reduce((s, l) => s + l.emi, 0),
        emiRatio,
        income: profile.income,
        loanCount: bureau.loans.length,
      };

      const res = await aiApi.chat({ message: msg, context });

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: res.message || 'I can help you optimize your loan portfolio. What would you like to know?',
        timestamp: new Date(),
      };
      addChatMessage(assistantMsg);
    } catch {
      addChatMessage({
        id: generateId(),
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'What\'s my best strategy?',
    'How can I reduce my EMI?',
    'Explain balance transfer',
    'What\'s my credit score impact?',
  ];

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setChatOpen(!chatOpen)}
        className={clsx(
          'fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl',
          'flex items-center justify-center shadow-mint-glow-lg',
          'transition-all duration-300',
          chatOpen ? 'bg-card border border-mint/30' : 'bg-mint'
        )}
      >
        <AnimatePresence mode="wait">
          {chatOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-mint" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquare className="w-6 h-6 text-black" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 rounded-3xl border border-border shadow-card-hover overflow-hidden"
            style={{ background: '#0c1f1a', maxHeight: '520px' }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b border-border flex items-center gap-3"
              style={{ background: 'rgba(19,39,35,0.9)' }}
            >
              <div className="w-8 h-8 rounded-xl bg-mint/15 flex items-center justify-center">
                <Bot className="w-4 h-4 text-mint" />
              </div>
              <div>
                <div className="font-semibold text-text text-sm">Finfinity AI Advisor</div>
                <div className="text-[10px] text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                  Online · Powered by Finfinity BRE
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              className="overflow-y-auto p-4 flex flex-col gap-3"
              style={{ height: '300px' }}
            >
              {chatMessages.length === 0 && (
                <div className="text-center text-muted text-xs pt-8">
                  <Bot className="w-8 h-8 text-muted/30 mx-auto mb-3" />
                  Ask me anything about your finances
                </div>
              )}

              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'self-end bg-mint text-black font-medium rounded-tr-sm'
                      : 'self-start bg-card border border-border text-text rounded-tl-sm'
                  )}
                >
                  {msg.content}
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="self-start bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2"
                >
                  <Loader2 className="w-3.5 h-3.5 text-mint animate-spin" />
                  <span className="text-xs text-muted">Thinking...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            {chatMessages.length <= 1 && (
              <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setInput(p);
                      setTimeout(() => handleSend(), 50);
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-mint/20 text-mint/70 hover:text-mint hover:border-mint/50 transition-all bg-mint/5"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2 items-center bg-faint rounded-2xl px-3 py-2 border border-border focus-within:border-mint/30 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Ask about your finances..."
                  className="flex-1 bg-transparent text-sm text-text placeholder-muted/60 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className={clsx(
                    'w-7 h-7 rounded-xl flex items-center justify-center transition-all',
                    input.trim() && !loading
                      ? 'bg-mint text-black'
                      : 'bg-faint text-muted cursor-not-allowed'
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
