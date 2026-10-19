import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { isMongoConnected, connectMongoDB } from '../config/mongodb.js';
import { generateChatbotResponse } from '../services/aiChatService.js';

// In-memory conversation fallback when MongoDB is not connected
const inMemoryStore = new Map();

function createInMemConversation(ownerId, isGuest, title) {
  // Use a valid 24-hex-char MongoDB-like ObjectId so clients and endpoints validate it cleanly
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomHex = Math.random().toString(16).substring(2, 18).padEnd(16, '0');
  const id = `${timestamp}${randomHex}`.slice(0, 24);

  const conv = {
    _id: id,
    id,
    ownerUserId: String(ownerId),
    title: title || 'New Clinical Consultation',
    isGuest: Boolean(isGuest),
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: new Date(),
    toClientJSON() {
      return {
        id: this.id,
        ownerUserId: this.ownerUserId,
        title: this.title,
        isGuest: this.isGuest,
        messages: this.messages,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        lastMessageAt: this.lastMessageAt,
      };
    },
    async save() {
      this.updatedAt = new Date();
      inMemoryStore.set(this.id, this);
      return this;
    }
  };
  inMemoryStore.set(id, conv);
  return conv;
}

/**
 * Checks if MongoDB is currently connected or can connect quickly.
 * Does not block if connection fails or is in cooldown.
 */
async function isMongoAvailable() {
  if (isMongoConnected()) return true;
  try {
    await connectMongoDB();
    return isMongoConnected();
  } catch (_) {
    return false;
  }
}

/**
 * Extracts or generates effective user / guest identifier.
 */
function resolveOwnerId(req) {
  if (req.user && req.user.id) {
    return { ownerId: String(req.user.id), isGuest: false };
  }
  const headerUserId = req.headers['x-user-id'];
  if (headerUserId) {
    return { ownerId: String(headerUserId), isGuest: false };
  }
  const guestHeader = req.headers['x-guest-id'] || req.body?.guestId || req.query?.guestId;
  if (guestHeader && typeof guestHeader === 'string' && guestHeader.trim()) {
    return { ownerId: guestHeader.trim(), isGuest: true };
  }
  // Generate random guest ID
  const generated = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return { ownerId: generated, isGuest: true };
}

/**
 * GET /api/v1/chat/status
 * Health and connectivity status for MongoDB chat service
 */
export async function getChatStatus(req, res) {
  const connected = isMongoConnected();
  res.json({
    success: true,
    service: 'MediNest AI Chatbot Service',
    mongoConnected: connected,
    database: 'medinest',
    readyState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/v1/chat/conversations
 * Creates a new conversation (persisted to MongoDB if available, otherwise session memory)
 */
export async function createConversation(req, res) {
  try {
    const { ownerId, isGuest } = resolveOwnerId(req);
    const { title, initialMessage } = req.body || {};

    let convTitle = (title && typeof title === 'string' && title.trim())
      ? title.trim().slice(0, 150)
      : 'New Clinical Consultation';

    const useMongo = await isMongoAvailable();
    let conversation;

    if (useMongo) {
      conversation = new Conversation({
        ownerUserId: ownerId,
        title: convTitle,
        isGuest,
        messages: [],
      });
    } else {
      conversation = createInMemConversation(ownerId, isGuest, convTitle);
    }

    if (initialMessage && typeof initialMessage === 'string' && initialMessage.trim()) {
      const userContent = initialMessage.trim().slice(0, 4000);
      conversation.messages.push({
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      });

      if (convTitle === 'New Clinical Consultation') {
        conversation.title = userContent.slice(0, 60) + (userContent.length > 60 ? '...' : '');
      }

      const aiResponse = await generateChatbotResponse(conversation.messages);
      conversation.messages.push({
        role: 'assistant',
        content: aiResponse.content,
        metadata: aiResponse.metadata,
        timestamp: new Date(),
      });

      conversation.lastMessageAt = new Date();
    }

    await conversation.save();

    res.setHeader('x-owner-id', ownerId);
    return res.status(201).json({
      success: true,
      ownerId,
      isGuest,
      mongoSynced: useMongo,
      data: conversation.toClientJSON(),
    });
  } catch (err) {
    console.error('[ChatController] createConversation error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create conversation: ' + err.message,
    });
  }
}

/**
 * GET /api/v1/chat/conversations
 * Lists all conversations belonging to the caller
 */
export async function getConversations(req, res) {
  try {
    const { ownerId } = resolveOwnerId(req);
    const useMongo = await isMongoAvailable();

    let formatted = [];
    let total = 0;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    if (useMongo) {
      const query = { ownerUserId: ownerId };
      const [dbTotal, docs] = await Promise.all([
        Conversation.countDocuments(query),
        Conversation.find(query)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);
      total = dbTotal;
      formatted = docs.map((doc) => {
        const lastMsg = doc.messages && doc.messages.length > 0
          ? doc.messages[doc.messages.length - 1]
          : null;
        return {
          id: doc._id.toString(),
          ownerUserId: doc.ownerUserId,
          title: doc.title,
          isGuest: doc.isGuest || false,
          messageCount: doc.messages ? doc.messages.length : 0,
          lastMessage: lastMsg ? {
            role: lastMsg.role,
            content: lastMsg.content.slice(0, 100) + (lastMsg.content.length > 100 ? '...' : ''),
            timestamp: lastMsg.timestamp,
          } : null,
          lastMessageAt: doc.lastMessageAt || doc.updatedAt,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      });
    } else {
      const memList = [...inMemoryStore.values()]
        .filter(c => c.ownerUserId === ownerId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      total = memList.length;
      formatted = memList.slice(skip, skip + limit).map(c => {
        const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
        return {
          id: c.id,
          ownerUserId: c.ownerUserId,
          title: c.title,
          isGuest: c.isGuest,
          messageCount: c.messages ? c.messages.length : 0,
          lastMessage: lastMsg ? {
            role: lastMsg.role,
            content: lastMsg.content.slice(0, 100) + (lastMsg.content.length > 100 ? '...' : ''),
            timestamp: lastMsg.timestamp,
          } : null,
          lastMessageAt: c.lastMessageAt || c.updatedAt,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      });
    }

    res.setHeader('x-owner-id', ownerId);
    return res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      mongoSynced: useMongo,
      data: formatted,
    });
  } catch (err) {
    console.error('[ChatController] getConversations error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversations: ' + err.message,
    });
  }
}

/**
 * GET /api/v1/chat/conversations/:id
 * Fetches single conversation and its full message history
 */
export async function getConversationById(req, res) {
  try {
    const { id } = req.params;
    const { ownerId } = resolveOwnerId(req);
    const isAdmin = req.user && req.user.role === 'admin';

    let conversation = null;
    if (await isMongoAvailable()) {
      if (mongoose.isValidObjectId(id)) {
        conversation = await Conversation.findById(id);
      }
    }
    if (!conversation) {
      conversation = inMemoryStore.get(id);
    }

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    if (!isAdmin && conversation.ownerUserId !== ownerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to view this conversation',
      });
    }

    return res.json({
      success: true,
      data: conversation.toClientJSON ? conversation.toClientJSON() : conversation,
    });
  } catch (err) {
    console.error('[ChatController] getConversationById error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation: ' + err.message,
    });
  }
}

/**
 * POST /api/v1/chat/conversations/:id/messages
 * Appends user message, queries AI service, appends assistant reply, saves conversation
 */
export async function sendMessage(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content cannot be empty',
      });
    }

    const trimmed = content.trim();
    if (trimmed.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Message content exceeds maximum limit of 4000 characters',
      });
    }

    const { ownerId } = resolveOwnerId(req);
    const isAdmin = req.user && req.user.role === 'admin';

    let conversation = null;
    let useMongo = false;
    if (await isMongoAvailable()) {
      if (mongoose.isValidObjectId(id)) {
        conversation = await Conversation.findById(id);
        if (conversation) useMongo = true;
      }
    }
    if (!conversation) {
      conversation = inMemoryStore.get(id);
    }

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    if (!isAdmin && conversation.ownerUserId !== ownerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to message in this conversation',
      });
    }

    if (conversation.messages.length >= 150) {
      return res.status(400).json({
        success: false,
        error: 'Conversation has reached the maximum message limit (150). Please start a new consultation.',
      });
    }

    const userMsg = {
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    conversation.messages.push(userMsg);

    if (conversation.title === 'New Clinical Consultation') {
      conversation.title = trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : '');
    }

    const aiResponse = await generateChatbotResponse(conversation.messages);

    const assistantMsg = {
      role: 'assistant',
      content: aiResponse.content,
      metadata: aiResponse.metadata,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMsg);
    conversation.lastMessageAt = new Date();

    await conversation.save();

    return res.json({
      success: true,
      reply: assistantMsg,
      mongoSynced: useMongo,
      data: conversation.toClientJSON ? conversation.toClientJSON() : conversation,
    });
  } catch (err) {
    console.error('[ChatController] sendMessage error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to send message: ' + err.message,
    });
  }
}

/**
 * POST /api/v1/chat/message
 * Quick unified chat endpoint: auto-creates or appends message
 */
export async function quickChat(req, res) {
  try {
    const { conversationId, message, title } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content cannot be empty',
      });
    }

    const { ownerId, isGuest } = resolveOwnerId(req);
    const trimmed = message.trim().slice(0, 4000);
    const useMongo = await isMongoAvailable();

    let conversation;

    if (conversationId) {
      if (useMongo && mongoose.isValidObjectId(conversationId)) {
        conversation = await Conversation.findById(conversationId);
      }
      if (!conversation) {
        conversation = inMemoryStore.get(conversationId);
      }
      if (conversation && conversation.ownerUserId !== ownerId && (!req.user || req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not own this conversation',
        });
      }
    }

    if (!conversation) {
      let convTitle = title && typeof title === 'string' && title.trim()
        ? title.trim().slice(0, 150)
        : trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : '');

      if (useMongo) {
        conversation = new Conversation({
          ownerUserId: ownerId,
          title: convTitle,
          isGuest,
          messages: [],
        });
      } else {
        conversation = createInMemConversation(ownerId, isGuest, convTitle);
      }
    }

    if (conversation.messages.length >= 150) {
      return res.status(400).json({
        success: false,
        error: 'Conversation limit reached. Please start a new consultation.',
      });
    }

    conversation.messages.push({
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    });

    const aiResponse = await generateChatbotResponse(conversation.messages);

    const assistantMsg = {
      role: 'assistant',
      content: aiResponse.content,
      metadata: aiResponse.metadata,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMsg);
    conversation.lastMessageAt = new Date();

    await conversation.save();

    res.setHeader('x-owner-id', ownerId);
    return res.json({
      success: true,
      conversationId: conversation._id.toString(),
      ownerId,
      mongoSynced: useMongo,
      reply: assistantMsg,
      data: conversation.toClientJSON ? conversation.toClientJSON() : conversation,
    });
  } catch (err) {
    console.error('[ChatController] quickChat error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process chat message: ' + err.message,
    });
  }
}

/**
 * DELETE /api/v1/chat/conversations/:id
 * Deletes a conversation if caller is the owner or admin
 */
export async function deleteConversation(req, res) {
  try {
    const { id } = req.params;
    const { ownerId } = resolveOwnerId(req);
    const isAdmin = req.user && req.user.role === 'admin';

    let conversation = null;
    if (await isMongoAvailable()) {
      if (mongoose.isValidObjectId(id)) {
        conversation = await Conversation.findById(id);
      }
    }
    if (!conversation) {
      conversation = inMemoryStore.get(id);
    }

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    if (!isAdmin && conversation.ownerUserId !== ownerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to delete this conversation',
      });
    }

    if (isMongoConnected() && mongoose.isValidObjectId(id)) {
      await Conversation.findByIdAndDelete(id).catch(() => {});
    }
    inMemoryStore.delete(id);

    return res.json({
      success: true,
      message: 'Conversation deleted successfully',
      deletedId: id,
    });
  } catch (err) {
    console.error('[ChatController] deleteConversation error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete conversation: ' + err.message,
    });
  }
}

export default {
  getChatStatus,
  createConversation,
  getConversations,
  getConversationById,
  sendMessage,
  quickChat,
  deleteConversation,
};
