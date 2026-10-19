import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Star, 
  MapPin, 
  ShieldAlert,
  Calendar,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  History,
  Bot,
  User as UserIcon,
  ChevronLeft
} from 'lucide-react';
import { COMMON_SYMPTOM_TAGS, analyzeSymptomsEngine, SymptomTag } from '../data/symptomsKnowledge';
import { Doctor } from '../types';
import { 
  fetchConversations, 
  fetchConversationById, 
  createConversation, 
  sendMessageToConversation, 
  deleteConversation,
  ConversationItem,
  FullConversation,
  ChatMessage
} from '../lib/chat';

interface SymptomCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  onSelectDoctorForBooking: (doctor: Doctor) => void;
  onFilterSpecialty: (specialtyId: string) => void;
  userId?: string;
  userToken?: string | null;
}

export const SymptomCheckerModal: React.FC<SymptomCheckerModalProps> = ({
  isOpen,
  onClose,
  doctors,
  onSelectDoctorForBooking,
  onFilterSpecialty,
  userId,
  userToken
}) => {
  // Mode: 'chat' (AI Health Assistant with MongoDB persistence) vs 'matrix' (classic tag-based analyzer)
  const [activeMode, setActiveMode] = useState<'chat' | 'matrix'>('chat');

  // --- Tag Matrix State ---
  const [selectedTags, setSelectedTags] = useState<string[]>(['Fever & Chills']);
  const [customText, setCustomText] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [duration, setDuration] = useState<string>('2-3 days');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof analyzeSymptomsEngine> | null>(null);

  // --- Chat Assistant State (MongoDB-backed) ---
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<FullConversation | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeMode === 'chat') {
      scrollToBottom();
    }
  }, [activeConversation?.messages, activeMode]);

  // Load conversations list on mount
  useEffect(() => {
    if (isOpen) {
      loadUserConversations();
    }
  }, [isOpen, userId, userToken]);

  const loadUserConversations = async () => {
    setIsLoadingHistory(true);
    try {
      const list = await fetchConversations(userToken, userId);
      setConversations(list);
      if (list.length > 0 && !activeConversation) {
        // Load the most recent conversation
        const full = await fetchConversationById(list[0].id, userToken, userId);
        if (full) setActiveConversation(full);
      }
    } catch (err) {
      console.warn('[SymptomCheckerModal] Error loading conversations:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleStartNewConsultation = async () => {
    setShowHistoryDrawer(false);
    setActiveConversation(null);
    setChatInput('');
  };

  const handleSelectConversation = async (convId: string) => {
    setShowHistoryDrawer(false);
    setIsLoadingHistory(true);
    try {
      const full = await fetchConversationById(convId, userToken, userId);
      if (full) {
        setActiveConversation(full);
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this clinical consultation history?')) return;
    const ok = await deleteConversation(convId, userToken, userId);
    if (ok) {
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversation?.id === convId) {
        setActiveConversation(null);
      }
    }
  };

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || chatInput.trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    setChatInput('');

    try {
      if (!activeConversation) {
        // Create new conversation in MongoDB
        const created = await createConversation(
          textToSend.slice(0, 50) + (textToSend.length > 50 ? '...' : ''),
          textToSend,
          userToken,
          userId
        );
        if (created) {
          setActiveConversation(created);
          // Refresh conversation list
          const list = await fetchConversations(userToken, userId);
          setConversations(list);
        }
      } else {
        // Optimistically add user message to local state
        const tempUserMsg: ChatMessage = {
          role: 'user',
          content: textToSend,
          timestamp: new Date()
        };
        setActiveConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, tempUserMsg]
        } : null);

        // Send to MongoDB API
        const result = await sendMessageToConversation(activeConversation.id, textToSend, userToken, userId);
        if (result) {
          setActiveConversation(result.conversation);
          // Update conversation in list
          setConversations(prev => prev.map(c => 
            c.id === result.conversation.id 
              ? { ...c, lastMessageAt: result.conversation.lastMessageAt, messageCount: result.conversation.messages.length }
              : c
          ));
        }
      }
    } catch (err) {
      console.error('[SymptomCheckerModal] Chat send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Helper to extract matching doctors for specialty
  const getDoctorsForSpecialty = (specIdOrName?: string) => {
    if (!specIdOrName) return [];
    const target = specIdOrName.toLowerCase().replace(/[^a-z]/g, '');
    return doctors.filter(d => {
      const dSpecId = (d.specialtyId || '').toLowerCase().replace(/[^a-z]/g, '');
      const dSpec = (d.specialty || '').toLowerCase();
      return (
        dSpecId === target ||
        dSpec.includes(target) ||
        target.includes(dSpec) ||
        (target.includes('general') && dSpecId.includes('general')) ||
        (target.includes('cardio') && dSpecId.includes('cardio')) ||
        (target.includes('derma') && dSpecId.includes('derma')) ||
        (target.includes('ortho') && dSpecId.includes('ortho')) ||
        (target.includes('gyn') && dSpecId.includes('gyn')) ||
        (target.includes('dent') && dSpecId.includes('dent')) ||
        (target.includes('ent') && dSpecId.includes('ent')) ||
        (target.includes('pediat') && dSpecId.includes('pediat')) ||
        (target.includes('psych') && dSpecId.includes('psych'))
      );
    });
  };

  // Find matching doctors for classic tag matrix
  const matchingDoctors = React.useMemo(() => {
    if (!analysisResult) return [];
    return getDoctorsForSpecialty(analysisResult.specialtyId || analysisResult.primarySpecialty);
  }, [analysisResult, doctors]);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzeSymptomsEngine(selectedTags, customText, severity);
      setAnalysisResult(result);
      setIsAnalyzing(false);
    }, 600);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setSelectedTags(['Fever & Chills']);
    setCustomText('');
    setSeverity('moderate');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 animate-fadeIn pt-4 sm:pt-8">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0C182B] text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            AI Clinical Assistant • MongoDB Synced
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-medium">
            MediNest AI Health & Doctor Guide
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Consult the AI health assistant for symptoms, medical education, and direct specialist booking.
          </p>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => setActiveMode('chat')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeMode === 'chat'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Interactive AI Consultation
            </button>
            <button
              onClick={() => setActiveMode('matrix')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeMode === 'matrix'
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Symptom Matrix
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeMode === 'chat' ? (
            /* ───────────────────────────────────────────────────────────
               MODE 1: INTERACTIVE AI CHAT (MONGODB PERSISTENT CONVERSATION)
               ─────────────────────────────────────────────────────────── */
            <div className="relative flex flex-col h-full min-h-[460px]">
              {/* Top Controls: Consultation Title & History Button */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#0C182B] line-clamp-1">
                      {activeConversation?.title || 'New Consultation Session'}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {activeConversation ? `${activeConversation.messages.length} messages saved in MongoDB` : 'Ask anything to begin session'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                    title="View saved consultation history"
                  >
                    <History className="w-3.5 h-3.5 text-teal-600" />
                    <span className="hidden sm:inline">Past Chats</span>
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                      {conversations.length}
                    </span>
                  </button>

                  <button
                    onClick={handleStartNewConsultation}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Chat</span>
                  </button>
                </div>
              </div>

              {/* History Drawer Overlay */}
              {showHistoryDrawer && (
                <div className="absolute inset-x-0 top-12 bottom-0 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-4 overflow-y-auto animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-teal-700" />
                      <h4 className="text-xs font-bold text-[#0C182B] uppercase tracking-wider">
                        Saved MongoDB Consultations
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowHistoryDrawer(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No saved consultations found in MongoDB. Start a chat below!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectConversation(c.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            activeConversation?.id === c.id
                              ? 'bg-teal-50/70 border-teal-300'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-[#0C182B] truncate">{c.title}</h5>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {c.lastMessage?.content || 'No messages'}
                            </p>
                            <span className="text-[9px] text-slate-400 mt-1 block">
                              {new Date(c.lastMessageAt || c.updatedAt).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} • {c.messageCount} turns
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteConversation(e, c.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                            title="Delete consultation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat Messages Scroll Container */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[280px] max-h-[380px]">
                {!activeConversation || activeConversation.messages.length === 0 ? (
                  <div className="text-center py-6 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-[#0C182B]">
                      How can MediNest AI assist your health today?
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Describe what symptoms you or your family member are experiencing. Our clinical assistant will provide educational guidance and match you to top verified specialists.
                    </p>

                    {/* Quick Suggestion Prompt Chips */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                      {[
                        'Fever and sore throat for 3 days',
                        'Persistent dry cough and fatigue',
                        'Skin rash on arms with severe itching',
                        'Dull knee joint pain while walking',
                        'Chest discomfort and mild palpitation'
                      ].map((promptText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(promptText)}
                          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                        >
                          + {promptText}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  activeConversation.messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const suggestedSpec = msg.metadata?.suggestedSpecialty;
                    const matchedDocs = suggestedSpec ? getDoctorsForSpecialty(suggestedSpec) : [];

                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center shrink-0 mt-1">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className={`max-w-[85%] rounded-2xl p-4 text-xs ${
                          isUser 
                            ? 'bg-[#0C182B] text-white rounded-tr-xs' 
                            : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs space-y-2'
                        }`}>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>

                          {/* Render Matching Doctor Booking Cards inline if specialty recommended */}
                          {!isUser && matchedDocs.length > 0 && (
                            <div className="pt-3 border-t border-slate-200 mt-3 space-y-2">
                              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                                Recommended Specialists for Appointment:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {matchedDocs.slice(0, 2).map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 transition-all flex items-center justify-between gap-2 shadow-2xs"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-[#0C182B] truncate">{doc.name}</div>
                                      <div className="text-[10px] text-slate-500 truncate">{doc.specialty} • ₹{doc.feeINR}</div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        onSelectDoctorForBooking(doc);
                                        onClose();
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold shrink-0"
                                    >
                                      Book
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <span className={`block text-[9px] mt-1 ${isUser ? 'text-slate-400 text-right' : 'text-slate-400'}`}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        {isUser && (
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                            <UserIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {isSending && (
                  <div className="flex gap-3 items-center text-xs text-slate-500 italic p-3 bg-slate-50 rounded-2xl w-fit">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                    <span>MediNest AI is reviewing clinical guidance...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-slate-100 shrink-0 mt-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type symptoms or medical questions (e.g., knee pain when bending)..."
                    disabled={isSending}
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !chatInput.trim()}
                    className="px-5 py-3 rounded-2xl bg-[#0C182B] hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  *Disclaimer: MediNest AI provides educational guidance, not an emergency service. For acute distress dial 112/108 immediately.
                </p>
              </div>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────────
               MODE 2: CLASSIC SYMPTOM TAG MATRIX (EXISTING FUNCTIONALITY)
               ─────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              {!analysisResult ? (
                <>
                  {/* Common Symptoms Cloud */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      1. Select Common Symptoms (Tap to add)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SYMPTOM_TAGS.map((tag: SymptomTag) => {
                        const isSelected = selectedTags.includes(tag.name);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.name)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-teal-700 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Free Text Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      2. Describe in your own words (Optional)
                    </label>
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="e.g. Woke up with severe itching, rash on both forearms and mild fever since yesterday..."
                      rows={3}
                      className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  {/* Severity & Duration Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Severity Level
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['mild', 'moderate', 'severe'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setSeverity(lvl)}
                            className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border cursor-pointer ${
                              severity === lvl
                                ? 'bg-[#0C182B] text-white border-[#0C182B]'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Duration
                      </label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-teal-600"
                      >
                        <option value="Since today">Started today</option>
                        <option value="2-3 days">2 - 3 days</option>
                        <option value="1-2 weeks">1 - 2 weeks</option>
                        <option value="More than a month">Chronic (1+ month)</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || (selectedTags.length === 0 && !customText.trim())}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#0C182B] hover:bg-[#162C4E] disabled:bg-slate-300 text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
                        Analyzing clinical indications...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-teal-300" />
                        Find Recommended Doctor Specialty
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* Results View */
                <div className="space-y-6">
                  {/* Emergency Alert Banner if Emergency */}
                  {analysisResult.urgency === 'emergency' && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
                      <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold">Urgent Medical Alert</h4>
                        <p className="text-xs mt-1 text-rose-800">
                          Emergency symptoms detected. Please do not wait for an online appointment. Call <strong>112</strong> or <strong>108</strong> immediately or visit your nearest hospital emergency room.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Primary Specialty Recommendation Card */}
                  <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200/80">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                        Recommended Specialty
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        analysisResult.urgency === 'emergency'
                          ? 'bg-rose-100 text-rose-800'
                          : analysisResult.urgency === 'soon'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {analysisResult.urgency === 'emergency' ? 'Emergency Level' : analysisResult.urgency === 'soon' ? 'Consult within 24h' : 'Routine Consultation'}
                      </span>
                    </div>

                    <div className="text-2xl font-bold font-display text-[#0C182B] mb-2">
                      {analysisResult.primarySpecialty}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed mb-3">
                      {analysisResult.summary}
                    </p>

                    {analysisResult.possibleCauses.length > 0 && (
                      <div className="pt-2 border-t border-teal-200/50">
                        <span className="text-[11px] font-semibold text-teal-900 block mb-1">
                          Potential Clinical Considerations to Discuss:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.possibleCauses.map((cause, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white text-slate-700 rounded-md text-[11px] border border-teal-200/60">
                              {cause}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mandatory Medical Disclaimer */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="font-medium leading-relaxed">
                      <strong>Disclaimer:</strong> {analysisResult.disclaimer}
                    </p>
                  </div>

                  {/* Matching Doctors List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-[#0C182B]">
                        Recommended {analysisResult.primarySpecialty}s
                      </h3>
                      <button
                        onClick={() => {
                          onFilterSpecialty(analysisResult.specialtyId);
                          onClose();
                        }}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                      >
                        View all ({analysisResult.primarySpecialty}) <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {matchingDoctors.length > 0 ? (
                      <div className="space-y-3">
                        {matchingDoctors.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5">
                              <img
                                src={doc.photo}
                                alt={doc.name}
                                className="w-12 h-12 rounded-xl object-cover object-top border border-slate-200 shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-sm font-bold text-[#0C182B]">{doc.name}</h4>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                    Verified
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">{doc.qualifications}</div>
                                <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                                    <Star className="w-3 h-3 fill-current" /> {doc.rating}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" /> {doc.city}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">Fee in INR</span>
                                <span className="text-base font-bold text-[#0C182B]">₹{doc.feeINR}</span>
                              </div>
                              <button
                                onClick={() => {
                                  onSelectDoctorForBooking(doc);
                                  onClose();
                                }}
                                className="px-4 py-2 rounded-xl bg-[#0C182B] hover:bg-[#152B4D] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5 text-teal-300" />
                                Book Slot
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                        No exact city match; explore all verified {analysisResult.primarySpecialty} specialists available for video consultation.
                      </p>
                    )}
                  </div>

                  {/* Reset / Check Another Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Check Different Symptoms
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
