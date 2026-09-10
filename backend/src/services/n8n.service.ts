import pool from '../config/database';

export interface N8nResponse {
  answer: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  sources?: Array<{
    knowledge_file_id: string;
    relevance_score?: number;
  }>;
}

export async function sendToN8n(
  message: string,
  conversationId: string,
  userId: string
): Promise<N8nResponse> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️  N8N_WEBHOOK_URL not set, using mock response');
    return getMockResponse(message);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId,
        userId,
      }),
    });

    if (!response.ok) {
      console.error('n8n request failed:', response.status, response.statusText);
      return getMockResponse(message);
    }

    // Parse n8n response (could be object, array, or text)
    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { answer: rawText };
    }

    console.log('🤖 n8n webhook response payload:', JSON.stringify(data, null, 2));

    // Handle if n8n returns an array of items (e.g. [{ output: "..." }])
    const item = Array.isArray(data) ? data[0] : data;
    const resolvedItem = item?.json ? item.json : item;

    const answer =
      (typeof resolvedItem === 'string' ? resolvedItem : null) ||
      resolvedItem?.output ||
      resolvedItem?.response ||
      resolvedItem?.answer ||
      resolvedItem?.text ||
      resolvedItem?.result ||
      resolvedItem?.content ||
      resolvedItem?.message ||
      'No response text returned from AI';

    return {
      answer: String(answer),
      model: resolvedItem?.model || 'n8n-ai',
      input_tokens: resolvedItem?.input_tokens,
      output_tokens: resolvedItem?.output_tokens,
      sources: resolvedItem?.sources || [],
    };
  } catch (error) {
    console.error('n8n request error:', error);
    return getMockResponse(message);
  }
}

function getMockResponse(message: string): N8nResponse {
  return {
    answer: `Saya menerima pesan Anda: "${message}". Saat ini AI belum terhubung melalui n8n. Silakan konfigurasi N8N_WEBHOOK_URL untuk mengaktifkan respons AI.`,
    model: 'mock',
    sources: [],
  };
}

export async function generateTitle(message: string): Promise<string> {
  // Simple title generation: take first 50 chars of message
  const cleaned = message.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.substring(0, 47) + '...';
}
