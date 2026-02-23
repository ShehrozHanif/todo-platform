// [Task]: T005 [From]: specs/phase3-chatbot/chat-ui/spec.md §Chat Window
// OpenAI ChatKit integration — renders the ChatKit web component
// connected to our FastAPI ChatKit backend endpoint.
'use client';

import { useEffect, useState } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useSession } from '@/lib/auth-client';
import { useTaskContext } from '@/context/TaskContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Fetch an HS256 JWT from the /api/token bridge endpoint. */
async function getToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/token', { credentials: 'include' });
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

/** Custom fetch that injects JWT auth header into ChatKit requests. */
function createAuthFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  };
}

export function ChatWindow() {
  const { data: session } = useSession();
  const { refreshTasks } = useTaskContext();
  const [ready, setReady] = useState(false);
  const userName = session?.user?.name?.split(' ')[0] || 'there';

  // Wait for the ChatKit web component to load from CDN
  useEffect(() => {
    if (customElements.get('openai-chatkit')) {
      setReady(true);
      return;
    }
    customElements.whenDefined('openai-chatkit').then(() => setReady(true));
  }, []);

  const chatkit = useChatKit({
    api: {
      url: `${API_URL}/chatkit`,
      fetch: createAuthFetch(),
      domainKey: 'local-dev',
    },
    theme: {
      colorScheme: 'light',
    },
    startScreen: {
      greeting: `Hi ${userName}! I'm your TaskFlow AI assistant.`,
      prompts: [
        { label: 'Add a task', prompt: 'Add a task called "Review PR"', icon: 'bolt' },
        { label: 'List tasks', prompt: 'List all my tasks', icon: 'search' },
        { label: 'Complete task', prompt: 'Complete task 1', icon: 'agent' },
        { label: 'What tasks?', prompt: 'What tasks do I have?', icon: 'sparkle' },
      ],
    },
    composer: {
      placeholder: 'Ask me to manage your tasks...',
    },
    // Refresh task list when the AI finishes responding (may have modified tasks)
    onResponseEnd: () => {
      refreshTasks();
    },
  });

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatKit
      control={chatkit.control}
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
}
