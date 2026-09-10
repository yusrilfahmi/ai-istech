'use client';

export default function ChatPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="text-center animate-fade-in max-w-md">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
          ISE Chatbot
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          Start a new conversation or select an existing one from the sidebar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {[
            { icon: '🔧', text: 'How do I maintain compressor E_AC01?' },
            { icon: '📋', text: 'Show me the SOP for maintenance' },
            { icon: '📊', text: 'Analyze energy consumption data' },
            { icon: '⚡', text: 'Troubleshoot equipment issues' },
          ].map((item, i) => (
            <div
              key={i}
              className="px-4 py-3 rounded-xl text-sm cursor-default"
              style={{
                background: 'var(--sidebar-bg)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <span className="mr-2">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
