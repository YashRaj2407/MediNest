import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: [true, 'Message role is required'],
      enum: {
        values: ['user', 'assistant', 'system'],
        message: 'Message role must be user, assistant, or system',
      },
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true,
      maxlength: [4000, 'Message content exceeds maximum limit of 4000 characters'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  { _id: true }
);

const ConversationSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: String,
      required: [true, 'ownerUserId is required'],
      trim: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [150, 'Conversation title cannot exceed 150 characters'],
      default: 'New Clinical Consultation',
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    messages: {
      type: [MessageSchema],
      default: [],
      validate: [
        {
          validator: (val) => Array.isArray(val) && val.length <= 150,
          message: 'Conversation cannot exceed maximum limit of 150 messages',
        },
      ],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

// Compound index for quickly fetching a user's conversations by most recently updated
ConversationSchema.index({ ownerUserId: 1, updatedAt: -1 });

// Helper to sanitize conversation document for API responses
ConversationSchema.methods.toClientJSON = function () {
  return {
    id: this._id.toString(),
    ownerUserId: this.ownerUserId,
    title: this.title,
    messages: (this.messages || []).map((m) => ({
      id: m._id ? m._id.toString() : undefined,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      metadata: m.metadata,
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastMessageAt: this.lastMessageAt || this.updatedAt,
  };
};

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);

export default Conversation;
