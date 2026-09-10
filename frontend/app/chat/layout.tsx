'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatSidebar from '@/components/chat/ChatSidebar';
import type { Conversation } from '@/types';
import { conversationApi } from '@/lib/api';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeConversationId = pathname?.split('/chat/')[1] || null;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await conversationApi.list();
      setConversations(res.data as Conversation[]);
    } catch {
      // ignore — user might not be authed yet
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  const handleNewChat = async () => {
    try {
      const res = await conversationApi.create();
      const conv = res.data as Conversation;
      await fetchConversations();
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await conversationApi.delete(id);
      await fetchConversations();
      if (activeConversationId === id) {
        router.push('/chat');
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-screen w-full overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        user={user}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">
        {/* Mobile top navigation */}
        <header
          className="flex items-center justify-between px-4 py-3 border-b md:hidden shrink-0"
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg cursor-pointer"
            style={{ color: 'var(--foreground)', border: '1px solid var(--border)' }}
            aria-label="Open Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            ISE Chatbot
          </span>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg cursor-pointer text-indigo-400"
            aria-label="New Chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </header>

        {children}
      </main>
    </div>
  );
}
