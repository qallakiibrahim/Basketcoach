
import React, { useState, useEffect } from 'react';
import { X, Send, Bug, Lightbulb, MessageSquare, Loader2, CheckCircle2, History, PlusCircle, Clock, CheckCircle, AlertTriangle, DatabaseZap } from 'lucide-react';
import { dataService } from '../services/dataService';
import { auth } from '../services/firebase';
import { TicketType, AppTicket, TicketStatus } from '../types';

interface SupportModalProps {
  onClose: () => void;
  userRole: 'coach' | 'player';
}

export const SupportModal: React.FC<SupportModalProps> = ({ onClose, userRole }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>('feedback');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  
  const [myTickets, setMyTickets] = useState<AppTicket[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      const user = auth.currentUser;
      const tickets = await dataService.getTickets(user);
      setMyTickets(tickets);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'MISSING_INDEX') {
          setError("Databas-index saknas. Be din coach öppna konsolen och skapa indexet via länken.");
      } else if (err.message === 'ACCESS_DENIED') {
          setError("Behörighet saknas. Du måste vara inloggad för att se dina ärenden.");
      } else {
          setError("Kunde inte hämta historik. Försök igen senare.");
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      await dataService.createTicket({
        userId: user?.uid || 'guest',
        userEmail: user?.email || 'guest@basketcoach.pro',
        userName: user?.displayName || (userRole === 'coach' ? 'Gästcoach' : 'Spelare'),
        role: userRole,
        title,
        description,
        type,
        priority: type === 'bug' ? 'high' : 'medium'
      });
      setDone(true);
      setTimeout(() => {
          setDone(false);
          setTitle("");
          setDescription("");
          setActiveTab('history');
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Kunde inte skicka ärendet. Kontrollera din anslutning.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (status: TicketStatus) => {
    switch (status) {
      case 'backlog': return { label: 'Väntar', color: 'text-slate-500', dot: 'bg-slate-700' };
      case 'todo': return { label: 'Planerad', color: 'text-blue-400', dot: 'bg-blue-500' };
      case 'in_progress': return { label: 'Pågår', color: 'text-amber-400', dot: 'bg-amber-500' };
      case 'done': return { label: 'Klart!', color: 'text-emerald-400', dot: 'bg-emerald-500' };
      default: return { label: status, color: 'text-slate-500', dot: 'bg-slate-500' };
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER & TABS */}
        <div className="p-8 pb-4 border-b border-slate-800 flex flex-col gap-6 bg-slate-950/40">
           <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Support & Feedback</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Hjälp oss göra appen bättre</p>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
           </div>

           <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 self-start shadow-inner">
              <button 
                onClick={() => setActiveTab('new')} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'new' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <PlusCircle size={14} /> Skapa ny
              </button>
              <button 
                onClick={() => setActiveTab('history')} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <History size={14} /> Mina ärenden
              </button>
           </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {done ? (
            <div className="p-12 text-center space-y-4 animate-in zoom-in">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic">Skickat!</h2>
              <p className="text-slate-400 text-sm">Tack, vi kollar på det så snart vi kan.</p>
            </div>
          ) : activeTab === 'new' ? (
            <form onSubmit={handleSubmit} className="p-8 space-y-6 animate-in slide-in-from-left duration-300">
               <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setType('feedback')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${type === 'feedback' ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                    <MessageSquare size={20} />
                    <span className="text-[9px] font-black uppercase">Feedback</span>
                  </button>
                  <button type="button" onClick={() => setType('feature')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${type === 'feature' ? 'bg-amber-600/10 border-amber-500 text-amber-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                    <Lightbulb size={20} />
                    <span className="text-[9px] font-black uppercase">Förslag</span>
                  </button>
                  <button type="button" onClick={() => setType('bug')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${type === 'bug' ? 'bg-rose-600/10 border-rose-500 text-rose-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                    <Bug size={20} />
                    <span className="text-[9px] font-black uppercase">Bugg</span>
                  </button>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vad gäller det?</label>
                  <input 
                    required 
                    placeholder="Kort rubrik..." 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none shadow-inner"
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Beskrivning</label>
                  <textarea 
                    required 
                    placeholder="Berätta mer..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none shadow-inner h-32 resize-none"
                  />
               </div>

               <button 
                disabled={submitting || !title.trim() || !description.trim()}
                type="submit" 
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
               >
                  {submitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18} />}
                  Skicka Ticket
               </button>
            </form>
          ) : (
            <div className="p-8 space-y-4 animate-in slide-in-from-right duration-300">
               {loadingHistory ? (
                   <div className="py-12 flex flex-col items-center justify-center gap-4 opacity-50">
                       <Loader2 className="animate-spin text-blue-500" size={32} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Hämtar historik...</span>
                   </div>
               ) : error ? (
                   <div className="py-12 px-6 text-center space-y-4 rounded-[2rem] bg-rose-500/5 border border-rose-500/20">
                       <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500">
                           {error.includes('index') ? <DatabaseZap size={24}/> : <AlertTriangle size={24} />}
                       </div>
                       <p className="text-xs font-bold text-slate-300 leading-relaxed">{error}</p>
                       <button onClick={fetchHistory} className="px-6 py-2 bg-slate-800 rounded-xl text-[10px] font-black uppercase text-white">Försök igen</button>
                   </div>
               ) : myTickets.length > 0 ? (
                   myTickets.map(ticket => {
                       const statusInfo = getStatusInfo(ticket.status);
                       return (
                           <div key={ticket.id} className="p-5 rounded-[2rem] bg-slate-950 border border-slate-800 group hover:border-slate-700 transition-all">
                               <div className="flex justify-between items-start mb-2">
                                   <div className="flex items-center gap-2">
                                       <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${ticket.type === 'bug' ? 'bg-rose-500/10 text-rose-500' : ticket.type === 'feature' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-500'}`}>
                                           {ticket.type}
                                       </span>
                                       <div className="flex items-center gap-1.5 ml-2">
                                           <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></div>
                                           <span className={`text-[8px] font-black uppercase tracking-widest ${statusInfo.color}`}>{statusInfo.label}</span>
                                       </div>
                                   </div>
                                   <span className="text-[7px] font-bold text-slate-700 uppercase">{ticket.createdAt?.split('T')[0] || 'Nyligen'}</span>
                               </div>
                               <h5 className="text-xs font-black text-white uppercase tracking-tight mb-1">{ticket.title}</h5>
                               <p className="text-[10px] text-slate-500 font-medium line-clamp-2 italic leading-relaxed">"{ticket.description}"</p>
                           </div>
                       );
                   })
               ) : (
                   <div className="py-20 text-center space-y-3 opacity-30 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                       <MessageSquare className="mx-auto" size={32} />
                       <p className="text-[10px] font-black uppercase tracking-widest">Inga ärenden inskickade än.</p>
                   </div>
               )}
            </div>
          )}
        </div>

        {/* FOOTER HINT */}
        <div className="p-6 bg-slate-950/60 border-t border-slate-800 shrink-0 text-center">
             <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Status uppdateras manuellt av administratören</p>
        </div>
      </div>
    </div>
  );
};
