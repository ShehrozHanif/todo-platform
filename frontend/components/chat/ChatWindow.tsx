// [Task]: T005 [From]: specs/phase3-chatbot/chat-ui/spec.md §Chat Window
// AI Chat window — sends messages to POST /api/{user_id}/chat and displays responses.
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { sendChatMessage } from '@/lib/api';
import { useTaskContext } from '@/context/TaskContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Add a task called "Review PR"',
  'List all my tasks',
  'Complete task 1',
  'What tasks do I have?',
];

export function ChatWindow() {
  const { data: session } = useSession();
  const { refreshTasks } = useTaskContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userId = session?.user?.id;
  const userName = session?.user?.name?.split(' ')[0] || 'there';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || !userId || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await sendChatMessage(userId, msg);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Refresh task list after AI operations (add/delete/complete/update)
      refreshTasks();
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, something went wrong. ${err instanceof Error ? err.message : 'Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState userName={userName} onSuggestion={handleSend} />
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div className="bg-gray-100 dark:bg-[#1C1D30] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-[#5B6180] animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-[#5B6180] animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-[#5B6180] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-[#252742] px-4 md:px-6 py-3 bg-white dark:bg-[#151628]">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-xl px-4 py-2.5 focus-within:border-indigo-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to manage your tasks..."
              rows={1}
              disabled={loading || !userId}
              className="w-full bg-transparent border-none outline-none text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#5B6180] resize-none leading-relaxed"
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading || !userId}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all duration-200 flex-shrink-0 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[11px] text-gray-400 dark:text-[#5B6180] mt-2">
          TaskFlow AI can manage your tasks. Try &ldquo;Add a task&rdquo; or &ldquo;List my tasks&rdquo;.
        </p>
      </div>
    </div>
  );
}

function EmptyState({ userName, onSuggestion }: { userName: string; onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
        Hi {userName}!
      </h2>
      <p className="text-[14px] text-gray-500 dark:text-[#9CA3C8] mb-6 max-w-sm">
        I&apos;m your TaskFlow AI assistant. I can add, list, complete, update, and delete your tasks using natural language.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-[#252742] bg-white dark:bg-[#1C1D30] hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-[13px] text-gray-700 dark:text-[#9CA3C8] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
          >
            <span className="text-indigo-500 mr-1.5">&rarr;</span>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-gray-200 dark:bg-[#252742]'
          : 'bg-gradient-to-br from-indigo-600 to-violet-600'
      }`}>
        {isUser ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-600 dark:text-[#9CA3C8]">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5 ${
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-gray-100 dark:bg-[#1C1D30] text-gray-900 dark:text-white rounded-tl-sm'
      }`}>
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p className={`text-[10px] mt-1 ${
          isUser ? 'text-indigo-200' : 'text-gray-400 dark:text-[#5B6180]'
        }`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
