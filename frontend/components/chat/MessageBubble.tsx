'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { MessageSource } from '@/types';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: MessageSource[];
  isNew?: boolean;
}

export default function MessageBubble({
  role,
  content,
  sources,
  isNew,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={`flex ${
        isUser ? 'justify-end' : 'justify-start'
      } mb-4 ${isNew ? 'animate-fade-in' : ''}`}
    >
      <div
        className={`flex gap-3 max-w-[80%] ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5"
          style={{
            background: isUser ? 'var(--accent)' : 'var(--border)',
            color: isUser ? '#fff' : 'var(--foreground)',
          }}
        >
          {isUser ? 'U' : 'AI'}
        </div>

        {/* Content */}
        <div>
          <div
            className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
            style={{
              background: isUser
                ? 'var(--user-bubble)'
                : 'var(--assistant-bg)',
              color: isUser
                ? 'var(--user-text)'
                : 'var(--assistant-text)',
              borderBottomRightRadius: isUser ? '4px' : '16px',
              borderBottomLeftRadius: isUser ? '16px' : '4px',
            }}
          >
            {isUser ? (
              // User message tetap plain text
              <div className="whitespace-pre-wrap">
                {content}
              </div>
            ) : (
              // AI response menggunakan Markdown + LaTeX
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Sources */}
          {sources && sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sources.map((source) => (
                <span
                  key={source.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                  style={{
                    background: 'var(--accent-light)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    opacity: 0.8,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>

                  {source.original_name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}