// [Task]: T005 [From]: specs/phase3-chatbot/chat-ui/spec.md §Chat Window
// [Task]: T001-T008 [From]: specs/phase3-chatbot/voice-input/spec.md §Voice Input (Bonus 1)
// [Task]: T005-T006 [From]: specs/phase3-chatbot/conversation-memory/spec.md §History + New Chat
// OpenAI ChatKit integration — uses @openai/chatkit-react to render
// the ChatKit web component connected to our chatkit-python backend.
// Falls back to custom chat if ChatKit fails (domain verification etc).
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { sendChatMessage, getChatHistory } from '@/lib/api';
import { useTaskContext } from '@/context/TaskContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CHATKIT_DOMAIN_KEY = 'domain_pk_699f4531a0208194866da6aa1f550e6909be80cabf9b93f1';

/** Fetch JWT from the /api/token bridge endpoint. */
async function getToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/token', { credentials: 'include' });
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ChatKit mode — uses the official @openai/chatkit-react component
// ---------------------------------------------------------------------------
function ChatKitView({ onFail }: { onFail: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const { refreshTasks } = useTaskContext();

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let cancelled = false;

    async function mount() {
      // 1. Wait for CDN to define the custom element (max 8s)
      if (!customElements.get('openai-chatkit')) {
        try {
          await Promise.race([
            customElements.whenDefined('openai-chatkit'),
            new Promise((_, rej) => setTimeout(() => rej('timeout'), 8000)),
          ]);
        } catch {
          onFail();
          return;
        }
      }
      if (cancelled || !containerRef.current) return;

      // 2. Dynamically import the React bindings (avoids SSR issues)
      let ChatKitReact: typeof import('@openai/chatkit-react');
      try {
        ChatKitReact = await import('@openai/chatkit-react');
      } catch {
        onFail();
        return;
      }
      if (cancelled || !containerRef.current) return;

      // 3. Get auth token
      const token = await getToken();

      // 4. Create the element and configure it
      const el = document.createElement('openai-chatkit') as any;
      el.style.cssText = 'width:100%;height:100%;display:block;border:none';
      containerRef.current.appendChild(el);

      // Wait for the element to connect to DOM
      await new Promise(r => requestAnimationFrame(r));

      // Listen for errors (domain verification failure etc)
      el.addEventListener('chatkit.error', (evt: any) => {
        console.warn('[ChatKit] Error:', evt?.detail || evt);
        onFail();
      });

      // Refresh tasks when AI finishes a response
      el.addEventListener('chatkit.response.end', () => {
        refreshTasks();
      });

      // Wait for custom element internal ready state
      if (typeof el.setOptions === 'function') {
        try {
          el.setOptions({
            api: {
              url: `${API_URL}/chatkit`,
              domainKey: CHATKIT_DOMAIN_KEY,
              fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
                const headers = new Headers(init?.headers);
                if (token) headers.set('Authorization', `Bearer ${token}`);
                return fetch(input, { ...init, headers });
              },
            },
            theme: { colorScheme: 'light' as const },
            startScreen: {
              greeting: "Hi! I'm your TaskFlow AI assistant.",
              prompts: [
                { label: 'Add a task', prompt: 'Add a task called "Review PR"', icon: 'bolt' as const },
                { label: 'List tasks', prompt: 'List all my tasks', icon: 'search' as const },
                { label: 'Complete task', prompt: 'Complete task 1', icon: 'agent' as const },
                { label: 'What tasks?', prompt: 'What tasks do I have?', icon: 'sparkle' as const },
              ],
            },
            composer: { placeholder: 'Ask me to manage your tasks...' },
          });
        } catch (err) {
          console.warn('[ChatKit] setOptions failed:', err);
          onFail();
          return;
        }
      } else {
        console.warn('[ChatKit] setOptions not available on element');
        onFail();
        return;
      }

      // 5. Watchdog — if after 5s the element has no visible content, fail
      setTimeout(() => {
        if (cancelled) return;
        const rect = el.getBoundingClientRect();
        const shadow = el.shadowRoot;
        const hasIframe = shadow?.querySelector('iframe');
        if (rect.height < 20 && !hasIframe) {
          console.warn('[ChatKit] Element did not render (domain verification may have failed)');
          onFail();
        }
      }, 5000);
    }

    mount();

    return () => {
      cancelled = true;
    };
  }, [onFail, refreshTasks]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Fallback chat — always works, uses existing POST /api/{user_id}/chat
// ---------------------------------------------------------------------------
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const SUGGESTIONS = [
  { label: 'Add a task', prompt: 'Add a task called "Review PR"' },
  { label: 'List tasks', prompt: 'List all my tasks' },
  { label: 'Complete task', prompt: 'Complete task 1' },
  { label: 'What tasks?', prompt: 'What tasks do I have?' },
];

// [Task]: T002 [From]: specs/phase3-chatbot/multi-language/spec.md §FR-003
/** Detect RTL scripts: Arabic, Hebrew, Urdu, Farsi */
function isRtl(text: string): boolean {
  const rtlRegex = /[\u0591-\u07FF\u0860-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  // Check first non-whitespace characters
  const trimmed = text.trimStart();
  return rtlRegex.test(trimmed.charAt(0)) || rtlRegex.test(trimmed.charAt(1));
}

function FallbackChat() {
  const { data: session } = useSession();
  const { refreshTasks } = useTaskContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isNewChat, setIsNewChat] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const userId = session?.user?.id;
  const userName = session?.user?.name?.split(' ')[0] || 'there';

  // Load conversation history on mount (FR-004)
  useEffect(() => {
    if (!userId || historyLoaded) return;
    setHistoryLoaded(true);

    getChatHistory(userId)
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m, i) => ({
              id: `history-${i}`,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: new Date(m.timestamp || Date.now()),
            }))
          );
        }
      })
      .catch(() => {
        // Silently fail — show empty state (FR-007)
      });
  }, [userId, historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for speech recognition support on component mount
  useEffect(() => {
    const isSpeechSupported =
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

    setSpeechSupported(isSpeechSupported);

    if (isSpeechSupported) {
      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || !userId || loading) return;

    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() },
    ]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await sendChatMessage(userId, msg, isNewChat);
      if (isNewChat) setIsNewChat(false);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.response,
          timestamp: new Date(),
          suggestions: res.suggestions,
        },
      ]);
      refreshTasks();
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, something went wrong. ${err instanceof Error ? err.message : 'Please try again.'}`,
          timestamp: new Date(),
        },
      ]);
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

  function handleVoiceInput() {
    if (!speechSupported || loading || !userId) return;

    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      // Start listening
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  }

  function handleNewChat() {
    setMessages([]);
    setIsNewChat(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* New Chat button — visible only when messages exist */}
      {messages.length > 0 && (
        <div className="flex justify-end px-4 md:px-6 pt-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-600 dark:text-[#9CA3C8] bg-gray-100 dark:bg-[#1C1D30] hover:bg-gray-200 dark:hover:bg-[#252742] border border-gray-200 dark:border-[#252742] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Hi {userName}!</h2>
            <p className="text-[14px] text-gray-500 dark:text-[#9CA3C8] mb-1 max-w-sm">
              I&apos;m your TaskFlow AI assistant. I can add, list, complete, update, and delete your tasks using natural language.
            </p>
            <div className="flex items-center gap-1.5 mb-5">
              <span className="text-[11px] text-indigo-500 font-medium">Powered by OpenAI ChatKit</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map(s => (
                <button key={s.prompt} onClick={() => handleSend(s.prompt)} className="text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-[#252742] bg-white dark:bg-[#1C1D30] hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-[13px] text-gray-700 dark:text-[#9CA3C8] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200">
                  <span className="text-indigo-500 mr-1.5">&rarr;</span>{s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && idx === messages.length - 1;
            const showSuggestions = isLastAssistant && msg.suggestions && msg.suggestions.length > 0 && !loading;
            const rtl = isRtl(msg.content);
            return (
              <div key={msg.id}>
                <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-gray-200 dark:bg-[#252742]' : 'bg-gradient-to-br from-indigo-600 to-violet-600'}`}>
                    {isUser ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-600 dark:text-[#9CA3C8]"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                    )}
                  </div>
                  <div className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5 ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-100 dark:bg-[#1C1D30] text-gray-900 dark:text-white rounded-tl-sm'}`}>
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap" dir={rtl ? 'rtl' : undefined}>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isUser ? 'text-indigo-200' : 'text-gray-400 dark:text-[#5B6180]'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {/* Smart suggestion chips — shown below latest AI message */}
                {showSuggestions && (
                  <div className={`flex flex-wrap gap-2 mt-2 ${rtl ? 'mr-11 justify-end' : 'ml-11'}`} dir={rtl ? 'rtl' : undefined}>
                    {msg.suggestions!.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-[#1C1D30] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-500 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
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

      <div className="border-t border-gray-200 dark:border-[#252742] px-4 md:px-6 py-3 bg-white dark:bg-[#151628]">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 w-full">
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
            {/* [Task]: T005 [From]: specs/phase3-chatbot/voice-input/spec.md §FR-002,FR-008 */}
            {/* Microphone Button — hidden on unsupported browsers (FR-002) */}
            {speechSupported && (
              <button
                onClick={handleVoiceInput}
                disabled={loading || !userId}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-[#252742] dark:hover:bg-[#2D2F4A] text-gray-700 dark:text-gray-300'
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <path d="M12 19v4" />
                    <path d="M8 23h8" />
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading || !userId}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all duration-200 flex-shrink-0 active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4z" /></svg>
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-gray-400 dark:text-[#5B6180] mt-2">
          Powered by OpenAI ChatKit &middot; TaskFlow AI manages your tasks
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export — tries ChatKit first, falls back gracefully
// ---------------------------------------------------------------------------
export function ChatWindow() {
  // Skip ChatKit on localhost — domain key only works on deployed Vercel domain
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const [mode, setMode] = useState<'chatkit' | 'fallback'>(isLocalhost ? 'fallback' : 'chatkit');

  const handleFail = useCallback(() => {
    console.warn('[ChatKit] Falling back to custom chat UI');
    setMode('fallback');
  }, []);

  if (mode === 'fallback') {
    return <FallbackChat />;
  }

  return <ChatKitView onFail={handleFail} />;
}
