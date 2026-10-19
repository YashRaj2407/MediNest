/**
 * MediNest AI Chat Client Library
 * Handles communication with MongoDB-backed AI Chatbot endpoints.
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | Date;
  metadata?: {
    urgency?: 'routine' | 'soon' | 'emergency';
    suggestedSpecialty?: string;
    specialtyId?: string;
    model?: string;
    [key: string]: any;
  };
}

export interface ConversationItem {
  id: string;
  ownerUserId: string;
  title: string;
  isGuest?: boolean;
  messageCount: number;
  lastMessage?: {
    role: string;
    content: string;
    timestamp: string;
  } | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FullConversation {
  id: string;
  ownerUserId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

/**
 * Retrieves or initializes a consistent guest ID for anonymous visitors.
 */
export function getGuestId(): string {
  const STORAGE_KEY = 'medinest_guest_chat_id';
  let guestId = localStorage.getItem(STORAGE_KEY);
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEY, guestId);
  }
  return guestId;
}

/**
 * Builds standard request headers with auth token or guest ID.
 */
function getHeaders(token?: string | null, userId?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (userId) {
    headers['x-user-id'] = userId;
  } else {
    headers['x-guest-id'] = getGuestId();
  }

  return headers;
}

/**
 * Checks connection status of MongoDB Chat service.
 */
export async function checkChatStatus(): Promise<{ mongoConnected: boolean; database: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/status`);
    if (!res.ok) return { mongoConnected: false, database: 'medinest' };
    const data = await res.json();
    return {
      mongoConnected: !!data.mongoConnected,
      database: data.database || 'medinest',
    };
  } catch (_) {
    return { mongoConnected: false, database: 'medinest' };
  }
}

/**
 * Lists conversations for current user or guest.
 */
export async function fetchConversations(
  token?: string | null,
  userId?: string | null
): Promise<ConversationItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
      headers: getHeaders(token, userId),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.error('[Chat API] Failed to fetch conversations:', err);
    return [];
  }
}

/**
 * Fetches a single conversation with full message history.
 */
export async function fetchConversationById(
  id: string,
  token?: string | null,
  userId?: string | null
): Promise<FullConversation | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${id}`, {
      headers: getHeaders(token, userId),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('[Chat API] Failed to fetch conversation by ID:', err);
    return null;
  }
}

/**
 * Creates a new conversation in MongoDB.
 */
export async function createConversation(
  title?: string,
  initialMessage?: string,
  token?: string | null,
  userId?: string | null
): Promise<FullConversation | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: 'POST',
      headers: getHeaders(token, userId),
      body: JSON.stringify({ title, initialMessage }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('[Chat API] Failed to create conversation:', err);
    return null;
  }
}

/**
 * Appends a message to an existing conversation in MongoDB and receives AI reply.
 */
export async function sendMessageToConversation(
  conversationId: string,
  content: string,
  token?: string | null,
  userId?: string | null
): Promise<{ reply: ChatMessage; conversation: FullConversation } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getHeaders(token, userId),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success) {
      return {
        reply: json.reply,
        conversation: json.data,
      };
    }
    return null;
  } catch (err) {
    console.error('[Chat API] Failed to send message:', err);
    return null;
  }
}

/**
 * Unified Quick Chat: sends a message, auto-creating a conversation if one doesn't exist.
 */
export async function sendQuickChatMessage(
  message: string,
  conversationId?: string | null,
  token?: string | null,
  userId?: string | null
): Promise<{ conversationId: string; reply: ChatMessage; conversation: FullConversation } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: getHeaders(token, userId),
      body: JSON.stringify({ message, conversationId }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success) {
      return {
        conversationId: json.conversationId,
        reply: json.reply,
        conversation: json.data,
      };
    }
    return null;
  } catch (err) {
    console.error('[Chat API] Failed to send quick chat message:', err);
    return null;
  }
}

/**
 * Deletes a conversation from MongoDB.
 */
export async function deleteConversation(
  conversationId: string,
  token?: string | null,
  userId?: string | null
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: getHeaders(token, userId),
    });
    return res.ok;
  } catch (err) {
    console.error('[Chat API] Failed to delete conversation:', err);
    return false;
  }
}
