// [Task]: T005 [From]: specs/phase3-chatbot/chat-ui/spec.md §Chat Page
// Chat page — wraps ChatWindow component.
'use client';

import { ChatWindow } from '@/components/chat/ChatWindow';

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-56px-82px)] md:h-[calc(100vh-56px)]">
      <ChatWindow />
    </div>
  );
}
