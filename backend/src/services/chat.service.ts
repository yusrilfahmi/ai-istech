import pool from '../config/database';
import { sendToN8n, generateTitle } from './n8n.service';

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  sources?: Array<{
    id: string;
    knowledge_file_id: string;
    original_name: string;
    relevance_score: number;
  }>;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const result = await pool.query(
    `SELECT m.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'id', ms.id,
            'knowledge_file_id', ms.knowledge_file_id,
            'original_name', kf.original_name,
            'relevance_score', ms.relevance_score
          )
        ) FILTER (WHERE ms.id IS NOT NULL),
        '[]'
      ) as sources
    FROM messages m
    LEFT JOIN message_sources ms ON ms.message_id = m.id
    LEFT JOIN knowledge_files kf ON kf.id = ms.knowledge_file_id
    WHERE m.conversation_id = $1
    GROUP BY m.id
    ORDER BY m.created_at ASC, 
      CASE 
        WHEN m.role = 'user' THEN 0 
        WHEN m.role = 'system' THEN 1 
        ELSE 2 
      END ASC,
      m.id ASC`,
    [conversationId]
  );
  return result.rows;
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  content: string
): Promise<{ userMessage: Message; assistantMessage: Message }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Store user message with clock_timestamp
    const userMsgResult = await client.query(
      `INSERT INTO messages (conversation_id, role, content, created_at)
       VALUES ($1, 'user', $2, clock_timestamp())
       RETURNING *`,
      [conversationId, content]
    );
    const userMessage = userMsgResult.rows[0];

    // Check if this is the first message — auto-generate title
    const msgCount = await client.query(
      `SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1`,
      [conversationId]
    );

    if (parseInt(msgCount.rows[0].count) === 1) {
      const title = await generateTitle(content);
      await client.query(
        `UPDATE conversations SET title = $1 WHERE id = $2`,
        [title, conversationId]
      );
    }

    // Send to n8n / AI
    const aiResponse = await sendToN8n(content, conversationId, userId);

    // Store assistant message with clock_timestamp
    const assistantMsgResult = await client.query(
      `INSERT INTO messages (conversation_id, role, content, model, input_tokens, output_tokens, created_at)
       VALUES ($1, 'assistant', $2, $3, $4, $5, clock_timestamp())
       RETURNING *`,
      [
        conversationId,
        aiResponse.answer,
        aiResponse.model || null,
        aiResponse.input_tokens || null,
        aiResponse.output_tokens || null,
      ]
    );
    const assistantMessage = assistantMsgResult.rows[0];

    // Store message sources if provided
    if (aiResponse.sources && aiResponse.sources.length > 0) {
      for (const source of aiResponse.sources) {
        await client.query(
          `INSERT INTO message_sources (message_id, knowledge_file_id, relevance_score)
           VALUES ($1, $2, $3)`,
          [assistantMessage.id, source.knowledge_file_id, source.relevance_score || null]
        );
      }
    }

    // Update conversation updated_at
    await client.query(
      `UPDATE conversations SET updated_at = now() WHERE id = $1`,
      [conversationId]
    );

    await client.query('COMMIT');

    // Fetch assistant message with sources
    const finalMsg = await pool.query(
      `SELECT m.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', ms.id,
              'knowledge_file_id', ms.knowledge_file_id,
              'original_name', kf.original_name,
              'relevance_score', ms.relevance_score
            )
          ) FILTER (WHERE ms.id IS NOT NULL),
          '[]'
        ) as sources
      FROM messages m
      LEFT JOIN message_sources ms ON ms.message_id = m.id
      LEFT JOIN knowledge_files kf ON kf.id = ms.knowledge_file_id
      WHERE m.id = $1
      GROUP BY m.id`,
      [assistantMessage.id]
    );

    return {
      userMessage: { ...userMessage, sources: [] },
      assistantMessage: finalMsg.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
