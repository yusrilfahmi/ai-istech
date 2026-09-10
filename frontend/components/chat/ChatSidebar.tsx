'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Conversation, User } from '@/types';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  user: User;
}

export default function ChatSidebar({
  conversations,
  activeId,
  onNewChat,
  onDelete,
  isOpen,
  onToggle,
  user,
}: ChatSidebarProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isAdminOrMaster = user.role === 'admin' || user.role === 'master';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex flex-col h-full min-h-full z-30 shrink-0
          fixed md:relative
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'}
        `}
        style={{
          width: '280px',
          minWidth: '280px',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="p-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
            id="new-chat-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg cursor-pointer md:hidden"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Recent Chat
          </p>
          {conversations.length === 0 ? (
            <p className="px-3 py-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer mb-0.5 animate-slide-in"
                style={{
                  background: activeId === conv.id ? 'var(--sidebar-hover)' : 'transparent',
                  color: activeId === conv.id ? 'var(--foreground)' : 'var(--muted)',
                }}
                onClick={() => router.push(`/chat/${conv.id}`)}
                onMouseOver={(e) => {
                  if (activeId !== conv.id) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeId !== conv.id) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="flex-1 text-sm truncate">
                  {conv.title || 'New Chat'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded cursor-pointer"
                  style={{ color: 'var(--danger)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bottom section */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Admin link */}
          {isAdminOrMaster && (
            <button
              onClick={() => router.push('/admin')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-2 cursor-pointer"
              style={{ color: 'var(--muted)' }}
              onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)')}
              onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Admin Panel
            </button>
          )}

          {/* User profile */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                {user.name}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg cursor-pointer"
              style={{ color: 'var(--muted)' }}
              title="Logout"
              id="logout-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
