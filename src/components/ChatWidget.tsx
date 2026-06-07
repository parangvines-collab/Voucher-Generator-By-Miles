import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { chatService, ChatMessage } from '../utils/chatService';
import { 
  MessageSquare, X, Send, User, ShieldAlert, Circle, 
  MessageCircle, Search, HelpCircle, Check, CheckCheck 
} from 'lucide-react';

interface ChatWidgetProps {
  currentUser: string;
}

export function ChatWidget({ currentUser }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputText, setInputText] = useState('');
  
  // Admin-specific states
  const [operators, setOperators] = useState<string[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Auto-scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Poll for messages
  useEffect(() => {
    if (!currentUser) return;

    const loadMessagesAndOperators = async () => {
      const allMsgs = await chatService.fetchMessages(currentUser);
      setMessages(allMsgs);

      // Determine unread count for current view
      if (currentUser === 'admin') {
        // Admin sees unread count from ALL chats that are directed to 'admin'
        const unreads = allMsgs.filter(m => m.receiver === 'admin' && !m.is_read);
        setUnreadCount(unreads.length);

        // Extract unique operator names from histories and load registered profiles as well
        const messageOperators = Array.from(
          new Set(
            allMsgs.map(m => m.sender === 'admin' ? m.receiver : m.sender)
          )
        ).filter(name => name !== 'admin');

        try {
          const { data: profiles } = await supabase.from('profiles').select('username');
          const profileNames = profiles ? profiles.map((p: any) => p.username).filter(n => n !== 'admin') : [];
          // Merge unique names
          const combined = Array.from(new Set([...messageOperators, ...profileNames]));
          setOperators(combined);
        } catch (e) {
          setOperators(messageOperators);
        }
      } else {
        // Operator sees unread count from messages where receiver is them
        const unreads = allMsgs.filter(m => m.receiver === currentUser && !m.is_read);
        setUnreadCount(unreads.length);
      }
    };

    loadMessagesAndOperators();
    
    // Polling interval of 4 seconds
    const interval = setInterval(loadMessagesAndOperators, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle scrolling to bottom when messages or active conversation changes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedOperator, isOpen]);

  // Mark active messages as read
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const markCurrentThreadAsRead = async () => {
      if (currentUser === 'admin' && selectedOperator) {
        await chatService.markAsRead(selectedOperator, 'admin');
      } else if (currentUser !== 'admin') {
        await chatService.markAsRead('admin', currentUser);
      }
    };

    markCurrentThreadAsRead();
  }, [isOpen, selectedOperator, messages, currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);

    const recipient = currentUser === 'admin' ? selectedOperator : 'admin';
    if (!recipient) {
      setIsSending(false);
      return;
    }

    try {
      const success = await chatService.sendMessage(currentUser, recipient, text);
      if (success) {
        setInputText('');
        // Instant update locally prior to polling response
        const newMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: currentUser,
          receiver: recipient,
          text,
          timestamp: new Date().toISOString(),
          is_read: false
        };
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const getFilteredOperators = () => {
    return operators.filter(op => 
      op.toLowerCase().includes(operatorSearch.toLowerCase())
    );
  };

  // Get active conversations list with unread badges
  const getConversationDetails = () => {
    return getFilteredOperators().map(op => {
      const opMsgs = messages.filter(m => 
        (m.sender === op && m.receiver === 'admin') || 
        (m.sender === 'admin' && m.receiver === op)
      );
      const latestMsg = opMsgs[opMsgs.length - 1];
      const unreadNum = opMsgs.filter(m => m.sender === op && !m.is_read).length;

      return {
        username: op,
        latestText: latestMsg ? latestMsg.text : 'No messages yet',
        latestTime: latestMsg ? new Date(latestMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        unreadCount: unreadNum
      };
    });
  };

  const activeMessages = currentUser === 'admin' 
    ? messages.filter(m => 
        selectedOperator && (
          (m.sender === selectedOperator && m.receiver === 'admin') ||
          (m.sender === 'admin' && m.receiver === selectedOperator)
        )
      )
    : messages;

  return (
    <div id="chat-system-root" className="fixed bottom-6 right-6 z-[999] font-sans">
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer hover:shadow-indigo-500/20 border border-indigo-400/30 group z-50 animate-bounce"
          title="Open Admin Chat Support"
        >
          <MessageCircle className="w-6 h-6 transition-transform group-hover:rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] min-w-[20px] h-5 rounded-full px-1.5 flex items-center justify-center ring-2 ring-[#070b13] animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Main Chat Box Container */}
      {isOpen && (
        <div className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 transition-all duration-300 ${currentUser === 'admin' ? 'w-[750px] max-w-[calc(100vw-2rem)] h-[550px]' : 'w-84 sm:w-96 max-w-[calc(100vw-2rem)] h-[500px]'}`}>
          
          {/* Header */}
          <div className="bg-slate-950 border-b border-slate-800 px-4.5 py-4.5 flex justify-between items-center bg-gradient-to-r from-slate-950 to-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5 leading-none">
                  {currentUser === 'admin' ? 'Support Portal' : 'Contact Support'}
                  {currentUser !== 'admin' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                      <Circle className="w-1.5 h-1.5 fill-emerald-400 text-emerald-400" />
                      Admin Online
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  {currentUser === 'admin' ? 'Operator Communications Workspace' : 'Send message details, requests & balance updates'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-800 text-slate-450 hover:text-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Core Body */}
          {currentUser === 'admin' ? (
            /* ADMIN LAYOUT: Split view workspace */
            <div className="flex-1 flex overflow-hidden bg-slate-950">
              
              {/* Left Bar: Conversations / Operators */}
              <div className="w-1/3 border-r border-slate-850/60 overflow-y-auto flex flex-col bg-slate-900/35">
                <div className="p-3 border-b border-slate-850/80 bg-slate-900/10 sticky top-0 z-10 backdrop-blur-sm">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search operator..."
                      value={operatorSearch}
                      onChange={(e) => setOperatorSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex-1 divide-y divide-slate-850/40">
                  {getConversationDetails().length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-[11px]">
                      <HelpCircle className="w-8 h-8 opacity-20 mx-auto mb-1.5 text-indigo-400" />
                      No active operators found.
                    </div>
                  ) : (
                    getConversationDetails().map(op => (
                      <button
                        key={op.username}
                        onClick={() => setSelectedOperator(op.username)}
                        className={`w-full text-left p-3 flex flex-col justify-between transition-all hover:bg-slate-800/40 border-l-2 cursor-pointer ${selectedOperator === op.username ? 'bg-indigo-600/10 border-indigo-500 hover:bg-indigo-600/10' : 'border-transparent'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-slate-200 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {op.username}
                          </span>
                          {op.latestTime && (
                            <span className="text-[9px] text-slate-500 font-mono">{op.latestTime}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-end gap-2">
                          <p className="text-[10px] text-slate-400 truncate flex-1 leading-relaxed">
                            {op.latestText}
                          </p>
                          {op.unreadCount > 0 && (
                            <span className="bg-rose-500 text-white rounded-full text-[9px] font-bold h-4.5 min-w-[18px] px-1 flex items-center justify-center shrink-0">
                              {op.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Active Chat Window */}
              <div className="flex-1 flex flex-col bg-slate-900/10 overflow-hidden">
                {selectedOperator ? (
                  <>
                    {/* Active Chat Conversation Banner */}
                    <div className="px-4 py-2 border-b border-slate-850 bg-slate-900/40 flex justify-between items-center shrink-0">
                      <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        Chatting with: <strong className="text-slate-100">{selectedOperator}</strong>
                      </span>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                      {activeMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-[11px]">
                          <span>Send a support message to initiate conversation with this operator.</span>
                        </div>
                      ) : (
                        activeMessages.map((msg, index) => {
                          const isMe = msg.sender === 'admin';
                          const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md leading-relaxed ${isMe ? 'bg-indigo-600 text-slate-100 rounded-tr-none' : 'bg-slate-800 text-slate-150 rounded-tl-none'}`}>
                                {msg.text}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 px-1">
                                <span className="text-[9px] text-slate-500 font-mono tracking-tighter">
                                  {timeStr}
                                </span>
                                {isMe && (
                                  msg.is_read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-slate-500" />
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Field */}
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-850 bg-slate-950/80 sticky bottom-0 shrink-0">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder={`Message ${selectedOperator}...`}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={!inputText.trim() || isSending}
                          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all rounded-xl text-white cursor-pointer shadow-md shadow-indigo-600/15 text-center flex items-center justify-center font-bold"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                    <User className="w-12 h-12 opacity-15 text-indigo-400 animate-pulse" />
                    <div>
                      <p className="font-bold text-xs text-slate-350">No Operator Thread Selected</p>
                      <p className="text-[10px] text-slate-500 max-w-[240px] mt-1 mx-auto">
                        Pick an operator in the left list panel to review history logs and reply directly.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* OPERATOR LAYOUT: Simple Direct Message Chat Panel */
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/50">
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2.5">
                    <ShieldAlert className="w-10 h-10 opacity-20 text-indigo-400" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-350">Support Chat Room</h4>
                      <p className="text-[10px] text-slate-500 max-w-[210px] m-auto mt-1 leading-relaxed">
                        Need balanced refills, operational assistance, or ticket audits? Message the Master Admin below.
                      </p>
                    </div>
                  </div>
                ) : (
                  activeMessages.map((msg, index) => {
                    const isMe = msg.sender === currentUser;
                    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md leading-relaxed ${isMe ? 'bg-indigo-600 text-slate-100 rounded-tr-none' : 'bg-slate-800 text-slate-150 rounded-tl-none'}`}>
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 px-1">
                          <span className="text-[9px] text-slate-500 font-mono tracking-tighter">
                            {timeStr}
                          </span>
                          {isMe && (
                            msg.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-500" />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Field */}
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 sticky bottom-0 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your support request details..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all rounded-xl text-white cursor-pointer shadow-md shadow-indigo-600/15 flex items-center justify-center font-bold"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      )}
    </div>
  );
}
