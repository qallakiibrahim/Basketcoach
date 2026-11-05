
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Send, 
  User, 
  MessageSquare,
  Clock,
  Check,
  CheckCheck,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Player, ChatMessage } from '../types';
import { chatService } from '../services/chatService';
import { notificationService } from '../services/notificationService';

interface PlayerChatProps {
  player: Player;
  coachId: string;
}

export const PlayerChat: React.FC<PlayerChatProps> = ({ player, coachId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  
  const currentUserId = player.id;

  // Request notification permission on mount
  useEffect(() => {
    notificationService.requestPermission();
  }, []);

  // Subscribe to messages (Direct with Coach + Team)
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = chatService.subscribeToMessages(
      coachId,
      currentUserId,
      ['TEAM', coachId],
      (allMsgs) => {
        setMessages(allMsgs);
        setLoading(false);
        
        // Handle notifications for new messages
        if (allMsgs.length > 0) {
          const latestMsg = allMsgs[allMsgs.length - 1];
          if (latestMsg.id !== lastMessageIdRef.current) {
            // Only notify if it's from coach/team and it's actually new
            if (latestMsg.senderRole === 'coach' && lastMessageIdRef.current !== null) {
              notificationService.showNotification(`Nytt meddelande från Coach`, {
                body: latestMsg.text,
                tag: latestMsg.conversationId
              });
            }
            lastMessageIdRef.current = latestMsg.id;
          }
        }

        // Mark messages as read
        allMsgs.forEach(msg => {
          if (msg.senderRole === 'coach' && !msg.readBy.includes(currentUserId)) {
            chatService.markAsRead(coachId, msg.id, currentUserId);
          }
        });
      }
    );

    return () => unsubscribe();
  }, [coachId, currentUserId]);

  // Auto-scroll
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
        player.name,
        'player',
        coachId, // Send to coach
        text,
        coachId
      );
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  return (
    <div className="flex flex-col h-full pb-32 md:pb-0 md:h-[600px] bg-[#0a0f1d] rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom duration-500">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <User className="w-4.5 h-4.5 md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="text-xs md:text-sm font-black text-white uppercase italic tracking-tight">Coach Kommunikation</h3>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[7px] md:text-[8px] text-slate-500 font-black uppercase tracking-widest">Direktlinje till Coach</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-slate-950/30">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20">
            <Loader2 className="animate-spin mb-2 w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Ansluter...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20">
            <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mb-4" />
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest italic text-center px-6 md:px-10">
              Inga meddelanden än. Coachen kan skicka uppdrag eller feedback här.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            const isTeam = msg.recipientId === 'TEAM';
            
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {isTeam && !isMe && (
                    <span className="text-[7px] md:text-[8px] font-black text-blue-400 uppercase mb-1 ml-2 tracking-widest">LAGMEDDELANDE</span>
                  )}
                  <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium shadow-lg ${
                    isMe 
                      ? 'bg-orange-600 text-white rounded-tr-none' 
                      : isTeam 
                        ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tl-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-2">
                    <span className="text-[7px] md:text-[8px] font-bold text-slate-600 uppercase">
                      {new Date(msg.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span className="text-orange-500">
                        {msg.readBy.length > 1 ? <CheckCheck className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <Check className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900/50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
          <input 
            type="text" 
            placeholder="Svara coachen..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm text-white focus:border-orange-500 outline-none transition-all shadow-inner"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-orange-600 text-white flex items-center justify-center hover:bg-orange-500 disabled:opacity-50 transition-all shadow-lg shadow-orange-900/20 active:scale-95"
          >
            <Send className="w-4.5 h-4.5 md:w-6 md:h-6" />
          </button>
        </form>
        <div className="mt-3 md:mt-4 flex items-center justify-center gap-3 md:gap-4 opacity-40">
           <div className="flex items-center gap-1 text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">
             <ShieldCheck className="w-2 h-2 md:w-2.5 md:h-2.5 text-emerald-500" /> Krypterat
           </div>
           <div className="w-1 h-1 rounded-full bg-slate-800"></div>
           <div className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">
             <Clock className="w-2 h-2 md:w-2.5 md:h-2.5" /> Direktlinje
           </div>
        </div>
      </div>
    </div>
  );
};
