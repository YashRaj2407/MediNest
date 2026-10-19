import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { isMongoConnected, connectMongoDB } from '../config/mongodb.js';
import { generateChatbotResponse } from '../services/aiChatService.js';

/**
 * Helper to ensure MongoDB is ready before processing request.
 * If not connected, attempts a fast connection; otherwise returns 503.
 */
async function ensureMongoReady(res) {
  if (isMongoConnected()) {
    return true;
  }
  try {
    await connectMongoDB();
    return isMongoConnected();
  } catch (err) {
    res.status(503).json({
      success: false,
      error: 'MongoDB service is currently unavailable. Please try again later.',
      status: 'service_unavailable',
    });
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
 * Creates a new conversation
 */
export async function createConversation(req, res) {
  if (!(await ensureMongoReady(res))) return;

  try {
    const { ownerId, isGuest } = resolveOwnerId(req);
    const { title, initialMessage } = req.body || {};

    let convTitle = (title && typeof title === 'string' && title.trim())
      ? title.trim().slice(0, 150)
      : 'New Clinical Consultation';

    const conversation = new Conversation({
      ownerUserId: ownerId,
      title: convTitle,
      isGuest,
      messages: [],
    });

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
  if (!(await ensureMongoReady(res))) return;

  try {
    const { ownerId } = resolveOwnerId(req);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const query = { ownerUserId: ownerId };

    const [total, docs] = await Promise.all([
      Conversation.countDocuments(query),
      Conversation.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const formatted = docs.map((doc) => {
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

    res.setHeader('x-owner-id', ownerId);
    return res.json({
      success: true,
      count: formatted.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
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
  if (!(await ensureMongoReady(res))) return;

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID format',
      });
    }

    const { ownerId } = resolveOwnerId(req);
    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    // Authorization check: User must own the conversation (unless admin)
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && conversation.ownerUserId !== ownerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to view this conversation',
      });
    }

    return res.json({
      success: true,
      data: conversation.toClientJSON(),
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
  if (!(await ensureMongoReady(res))) return;

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID format',
      });
    }

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
    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    // Ownership check
    const isAdmin = req.user && req.user.role === 'admin';
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

    // Append user message
    const userMsg = {
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    conversation.messages.push(userMsg);

    // Auto-update default title if first message
    if (conversation.title === 'New Clinical Consultation') {
      conversation.title = trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : '');
    }

    // Generate AI response
    const aiResponse = await generateChatbotResponse(conversation.messages);

    // Append assistant message
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
      data: conversation.toClientJSON(),
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
 * Quick unified chat endpoint: if conversationId is supplied, appends to it;
 * if not, creates a new conversation and returns both conversationId and reply.
 */
export async function quickChat(req, res) {
  if (!(await ensureMongoReady(res))) return;

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

    let conversation;

    if (conversationId && mongoose.isValidObjectId(conversationId)) {
      conversation = await Conversation.findById(conversationId);
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

      conversation = new Conversation({
        ownerUserId: ownerId,
        title: convTitle,
        isGuest,
        messages: [],
      });
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
      reply: assistantMsg,
      data: conversation.toClientJSON(),
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
  if (!(await ensureMongoReady(res))) return;

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID format',
      });
    }

    const { ownerId } = resolveOwnerId(req);
    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && conversation.ownerUserId !== ownerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to delete this conversation',
      });
    }

    await Conversation.findByIdAndDelete(id);

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
