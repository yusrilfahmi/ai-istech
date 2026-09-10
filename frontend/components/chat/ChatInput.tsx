'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Check for speech recognition support
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID'; // Indonesian; will also work for English input

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setMessage(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    onSend(message);
    setMessage('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl px-4 py-3"
        style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Text input */}
        <textarea
          ref={textareaRef}
          id="chat-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed placeholder:opacity-50"
          style={{
            color: 'var(--foreground)',
            maxHeight: '160px',
            minHeight: '24px',
          }}
        />

        {/* Voice button */}
        {speechSupported && (
          <button
            onClick={toggleVoice}
            disabled={disabled}
            className={`p-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
              isListening ? 'voice-active' : ''
            }`}
            style={{
              background: isListening ? 'var(--danger)' : 'transparent',
              color: isListening ? '#fff' : 'var(--muted)',
            }}
            title={isListening ? 'Stop recording' : 'Start voice input'}
            id="voice-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}

        {!speechSupported && (
          <span className="text-xs px-2 py-1 rounded" style={{ color: 'var(--muted)', opacity: 0.5 }}>
            🎙️ Not supported
          </span>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="p-2 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          style={{
            background: canSend ? 'var(--accent)' : 'transparent',
            color: canSend ? '#fff' : 'var(--muted)',
          }}
          title="Send message"
          id="send-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-xs mt-2" style={{ color: 'var(--muted)', opacity: 0.6 }}>
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
