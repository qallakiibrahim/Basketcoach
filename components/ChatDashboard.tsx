
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Users, 
  User, 
  Search, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  MessageSquare,
  ArrowLeft,
  Info,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Player, ChatMessage, View } from '../types';
import { dataService } from '../services/dataService';
import { chatService } from '../services/chatService';
import { auth } from '../services/firebase';
import { notificationService } from '../services/notificationService';

interface ChatDashboardProps {
  coachId: string;
}

export const ChatDashboard: React.FC<ChatDashboardProps> = ({ coachId }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('TEAM');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const currentUserId = auth.currentUser?.uid || 'guest';

  // Request notification permission on mount
  useEffect(() => {
    notificationService.requestPermission();
  }, []);

  // Load players
  useEffect(() => {
    const unsubscribe = dataService.subscribeToPlayers((data) => {
      setPlayers(data);
    }, coachId);
    return () => unsubscribe();
  }, [coachId]);

  // Subscribe to ALL messages for unread counts
  useEffect(() => {
    const unsubscribe = chatService.subscribeToAllMessages(coachId, (data) => {
      setAllMessages(data);
    });
    return () => unsubscribe();
  }, [coachId]);

  // Subscribe to current conversation
  useEffect(() => {
    const unsubscribe = chatService.subscribeToMessages(
      coachId,
      currentUserId,
      [selectedRecipientId],
      (data) => {
        setMessages(data);
        
        // Handle notifications for new messages
        if (data.length > 0) {
          const latestMsg = data[data.length - 1];
          if (latestMsg.id !== lastMessageIdRef.current) {
            // Only notify if it's not from me and it's actually new (not just initial load)
            if (latestMsg.senderId !== currentUserId && lastMessageIdRef.current !== null) {
              notificationService.showNotification(`Nytt meddelande från ${latestMsg.senderName}`, {
                body: latestMsg.text,
                tag: latestMsg.conversationId
              });
            }
            lastMessageIdRef.current = latestMsg.id;
          }
        }

        // Mark as read
        data.forEach(msg => {
          if (msg.recipientId === currentUserId || (msg.recipientId === 'TEAM' && msg.senderRole === 'player')) {
            if (!msg.readBy.includes(currentUserId)) {
              chatService.markAsRead(coachId, msg.id, currentUserId);
            }
          }
        });
      }
    );
    return () => unsubscribe();
  }, [coachId, currentUserId, selectedRecipientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText("");

    try {
      await chatService.sendMessage(
        currentUserId,
        "Coach", // Could be dynamic if we have coach name
        'coach',
        selectedRecipientId,
        text,
        coachId
      );
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const getUnreadCount = (recipientId: string) => {
    return allMessages.filter(msg => {
      const isRelevant = recipientId === 'TEAM' 
        ? msg.recipientId === 'TEAM' 
        : (msg.senderId === recipientId && msg.recipientId === currentUserId);
      return isRelevant && !msg.readBy.includes(currentUserId);
    }).length;
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.number.toString().includes(searchQuery)
  );

  const selectedPlayer = players.find(p => p.id === selectedRecipientId);

  return (
    <div className="flex h-full pb-32 md:pb-0 md:h-[calc(100vh-12rem)] bg-slate-950 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative">
      
      {/* Sidebar - Player List */}
      <div className={`${isMobileListOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl z-20`}>
        <div className="p-4 md:p-6 border-b border-slate-800">
          <h2 className="text-lg md:text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
            <MessageSquare className="text-blue-400" size={20} /> Coach Chat
          </h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Sök spelare..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-[10px] md:text-xs text-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {/* Team Chat Option */}
          <button 
            onClick={() => { setSelectedRecipientId('TEAM'); setIsMobileListOpen(false); }}
            className={`w-full p-3 md:p-4 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4 transition-all ${selectedRecipientId === 'TEAM' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center ${selectedRecipientId === 'TEAM' ? 'bg-white/20' : 'bg-slate-800'}`}>
              <Users className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-xs md:text-sm font-black uppercase italic tracking-tight">Hela Laget</div>
              <div className="text-[9px] md:text-[10px] opacity-60 font-bold">Gemensam kanal</div>
            </div>
            {getUnreadCount('TEAM') > 0 && (
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                {getUnreadCount('TEAM')}
              </div>
            )}
          </button>

          <div className="px-4 py-3 md:py-4">
            <h3 className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Individuella Spelare</h3>
          </div>

          {filteredPlayers.map(player => (
            <button 
              key={player.id}
              onClick={() => { setSelectedRecipientId(player.id); setIsMobileListOpen(false); }}
              className={`w-full p-3 md:p-4 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4 transition-all ${selectedRecipientId === player.id ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50'}`}
            >
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 overflow-hidden">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-base md:text-lg font-black italic">{player.number}</span>
                  )}
                </div>
                {getUnreadCount(player.id) > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full bg-rose-500 text-white text-[9px] md:text-[10px] font-black flex items-center justify-center border-2 border-slate-900">
                    {getUnreadCount(player.id)}
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs md:text-sm font-bold truncate">{player.name}</div>
                <div className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase">{player.position || 'Spelare'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${!isMobileListOpen ? 'flex' : 'hidden'} md:flex flex-1 flex flex-col bg-slate-950 relative`}>
        
        {/* Chat Header */}
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/30 backdrop-blur-md">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setIsMobileListOpen(true)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              {selectedRecipientId === 'TEAM' ? <Users className="w-4.5 h-4.5 md:w-5 md:h-5" /> : <User className="w-4.5 h-4.5 md:w-5 md:h-5" />}
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black text-white uppercase italic tracking-tight">
                {selectedRecipientId === 'TEAM' ? 'Hela Laget' : selectedPlayer?.name}
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aktiv nu</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button className="p-2 text-slate-500 hover:text-white transition-colors"><Info className="w-4.5 h-4.5 md:w-5 md:h-5"/></button>
            <button className="p-2 text-slate-500 hover:text-white transition-colors"><MoreVertical className="w-4.5 h-4.5 md:w-5 md:h-5"/></button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          <div className="flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mb-4" />
                <p className="text-xs md:text-sm font-black uppercase italic text-center">Inga meddelanden än</p>
                <p className="text-[9px] md:text-[10px] font-bold mt-1">Börja konversationen nedan</p>
              </div>
            )}
            
            {messages.map((msg, idx) => {
              const isMe = msg.senderId === currentUserId;
              const showDate = idx === 0 || new Date(msg.timestamp).toDateString() !== new Date(messages[idx-1].timestamp).toDateString();

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        {new Date(msg.timestamp).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                  )}
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && selectedRecipientId === 'TEAM' && (
                        <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase ml-2 mb-1">{msg.senderName}</span>
                      )}
                      <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium shadow-lg ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-2">
                        <span className="text-[7px] md:text-[8px] font-bold text-slate-600 uppercase">
                          {new Date(msg.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className="text-blue-500">
                            {msg.readBy.length > 1 ? <CheckCheck className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <Check className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900/30 backdrop-blur-md">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder={selectedRecipientId === 'TEAM' ? "Skriv till laget..." : `Skriv till ${selectedPlayer?.name.split(' ')[0]}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl py-3 md:py-4 pl-4 md:pl-6 pr-10 md:pr-12 text-xs md:text-sm text-white focus:border-blue-500 outline-none transition-all shadow-inner"
              />
              <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-600">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
            </div>
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
              <Send className="w-4.5 h-4.5 md:w-6 md:h-6" />
            </button>
          </form>
          <div className="mt-3 md:mt-4 flex items-center justify-center gap-3 md:gap-4">
             <div className="flex items-center gap-1 text-[7px] md:text-[8px] font-black text-slate-600 uppercase tracking-widest">
               <ShieldCheck className="w-2 h-2 md:w-2.5 md:h-2.5 text-emerald-500" /> Krypterat
             </div>
             <div className="w-1 h-1 rounded-full bg-slate-800"></div>
             <div className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase tracking-widest">
               Realtids-synk
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
