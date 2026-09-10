'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import { messageApi } from '@/lib/api';
import type { Message } from '@/types';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const res = await messageApi.list(conversationId);
      setMessages(res.data as Message[]);
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSend = async (content: string) => {
    if (!content.trim() || sending) return;

    // Optimistic: add user message immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);
    setError('');

    try {
      const res = await messageApi.send(conversationId, content.trim());
      const data = res.data as { userMessage: Message; assistantMessage: Message };

      // Replace temp message with real ones
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, data.userMessage, data.assistantMessage];
      });
    } catch (err) {
      setError('Failed to send message. Please try again.');
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
      {/* Messages area */}
      <MessageList messages={messages} isLoading={sending} />

      {/* Error banner */}
      {error && (
        <div
          className="mx-4 mb-2 px-4 py-2 rounded-lg text-sm animate-fade-in"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 font-medium underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input area */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
