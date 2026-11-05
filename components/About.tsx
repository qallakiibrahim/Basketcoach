
import React, { useState } from 'react';
import { Trophy, Target, Download, Upload, ClipboardCheck, Activity, Copy, Check, Terminal, Layout, Database, Book, ShieldAlert } from 'lucide-react';
import { dataService } from '../services/dataService';

export const About: React.FC = () => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [rulesCopied, setRulesCopied] = useState(false);

  const handleBackup = () => dataService.exportTeamData();
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => { 
        if (re.target?.result) {
          dataService.importTeamData(re.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const copyRules = () => {
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. Inställningar (Whitelist)
    match /app_settings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email.lower() == "ibrahim.qallaki@gmail.com";
    }

    // 2. Tickets (Feedback Loop)
    match /app_tickets/{ticketId} {
      allow create: if request.auth != null; 
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || request.auth.token.email.lower() == "ibrahim.qallaki@gmail.com");
      allow update, delete: if request.auth != null && request.auth.token.email.lower() == "ibrahim.qallaki@gmail.com";
    }

    // 3. Live Matcher (Nya poäng-tavlan)
    match /live_matches/{matchId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // 4. Spelardata (Tillåt publika sökningar för portalkod)
    match /{path=**}/players/{playerId} {
      allow read: if true; 
      allow update: if request.auth != null;
    }

    // 5. Portalen (Tillåt spelare att läsa coach-data)
    match /{path=**}/sessions/{sessionId} {
      allow read: if true;
    }
    match /{path=**}/matches/{matchId} {
      allow read: if true;
    }
    match /{path=**}/custom_exercises/{exerciseId} {
      allow read: if true;
    }
    match /{path=**}/settings/{settingId} {
      allow read: if true;
    }

    // 6. Användardata
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || request.auth.token.email.lower() == "ibrahim.qallaki@gmail.com");
    }
  }
}`;
    navigator.clipboard.writeText(rules);
    setRulesCopied(true);
    setTimeout(() => setRulesCopied(false), 2000);
  };

  const handleCopyContext = async () => {
    const snapshot = await dataService.getAppContextSnapshot();
    navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadManual = () => {
      const link = document.createElement('a');
      link.href = '/manual.html';
      link.download = 'Basketcoach_Pro_Manual.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const journeySteps = [
    { title: "Planering", Icon: Layout, iconClass: "text-blue-400", desc: "Använd 8-faser roadmapen." },
    { title: "Träning", Icon: ClipboardCheck, iconClass: "text-orange-500", desc: "Genomför passet live." },
    { title: "Analys", Icon: Activity, iconClass: "text-emerald-400", desc: "Se framsteg i realtid." },
    { title: "Individer", Icon: Target, iconClass: "text-purple-400", desc: "Skapa unika planer." }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 md:space-y-16 animate-in fade-in duration-1000 pb-24 md:pb-20">
      <div className="relative p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-br from-slate-900 via-slate-900 to-orange-900/10 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-orange-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 grid lg:grid-cols-2 gap-8 md:gap-12 items-center text-center lg:text-left">
          <div className="space-y-6 md:space-y-8">
            <div className="inline-flex px-3 py-1.5 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest mx-auto lg:mx-0">
              The Complete Ecosystem
            </div>
            <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-white">
              Din Digitala<br /><span className="text-orange-500">Coachstab.</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-lg font-medium italic leading-relaxed max-w-lg mx-auto lg:mx-0">
              Basketcoach Pro är en levande plattform som utvecklas tillsammans med dig och ditt lag för den ultimata basketupplevelsen.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 pt-2">
              <button onClick={handleBackup} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 text-white font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-slate-700 transition-all">
                <Download size={14} /> Exportera Data
              </button>
              <label className="cursor-pointer flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest hover:border-slate-600 transition-all">
                <Upload size={14} /> Importera Data
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
              </label>
              <button onClick={downloadManual} className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 font-black uppercase text-[9px] tracking-widest hover:bg-emerald-600/20 transition-all">
                <Book size={14} /> Ladda ner Manual
              </button>
            </div>
          </div>
          <div className="hidden lg:block relative aspect-square border-2 border-dashed border-slate-800 rounded-[3rem] p-8">
             <div className="w-full h-full bg-slate-950 rounded-[2rem] border border-slate-800 flex flex-col items-center justify-center space-y-4 shadow-inner">
                <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-900/40"><Trophy size={40} className="text-white" /></div>
                <div className="text-center">
                  <div className="text-xs font-black text-slate-100 uppercase italic">Champion Ready</div>
                  <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest text-orange-500">Säsong 25/26</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-8 md:p-12 rounded-[2.5rem] bg-slate-900 border border-emerald-500/20 shadow-xl space-y-6">
           <div className="flex items-center gap-3 text-emerald-400">
              <Database size={24} />
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">VIKTIGT: Säkerhetsregler</h3>
           </div>
           <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldAlert size={20} className="text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-slate-300 text-xs font-bold leading-relaxed">
                För att coacher ska kunna logga in måste du uppdatera reglerna i Firebase. Kopiera koden nedan och ersätt allt i Firebase Console &rarr; Firestore &rarr; Rules.
              </p>
           </div>
           <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 relative group">
              <pre className="text-[10px] text-emerald-500/80 font-mono leading-tight overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. Inställningar (Whitelist)
    match /app_settings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email.lower() == "ibrahim.qallaki@gmail.com";
    }

    // 2. Tickets (Feedback Loop)
    match /app_tickets/{ticketId} {
      allow create: if request.auth != null; 
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || request.auth.token.email.lower() == "ibrahim.qallaki@gmail.com");
      allow update, delete: if request.auth != null && request.auth.token.email.lower() == "ibrahim.qallaki@gmail.com";
    }

    // 3. Live Matcher (Nya poäng-tavlan)
    match /live_matches/{matchId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // 4. Spelardata (Tillåt publika sökningar för portalkod)
    match /{path=**}/players/{playerId} {
      allow read: if true; 
    }

    // 5. Portalen (Tillåt spelare att läsa coach-data)
    match /{path=**}/sessions/{sessionId} {
      allow read: if true;
    }
    match /{path=**}/matches/{matchId} {
      allow read: if true;
    }
    match /{path=**}/custom_exercises/{exerciseId} {
      allow read: if true;
    }
    match /{path=**}/settings/{settingId} {
      allow read: if true;
    }

    // 6. Användardata
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || request.auth.token.email.lower() == "ibrahim.qallaki@gmail.com");
    }
  }
}`}
              </pre>
              <button 
                onClick={copyRules}
                className="absolute top-4 right-4 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all flex items-center gap-2"
              >
                {rulesCopied ? <span className="text-[10px] font-bold text-emerald-500">Kopierad!</span> : null}
                {rulesCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
           </div>
        </div>

        <div className="p-8 md:p-12 rounded-[2.5rem] bg-slate-900 border border-blue-500/20 shadow-xl space-y-6">
           <div className="flex items-center gap-3 text-blue-400">
              <Terminal size={24} />
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Programmerar-bryggan</h3>
           </div>
           <p className="text-slate-400 text-xs font-medium leading-relaxed italic">
             När du vill bygga ut appen via AI, kopiera appens nuvarande kontext härifrån så jag vet exakt vad vi jobbar med.
           </p>
           <button 
            onClick={handleCopyContext}
            className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${copySuccess ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl'}`}
          >
            {copySuccess ? <Check size={18} /> : <Copy size={18} />}
            Kopiera App Context
          </button>
        </div>
      </div>

      <div className="space-y-8 text-center px-4">
         <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter leading-none">The Coach's Journey</h2>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-2">
          {journeySteps.map((step, i) => (
            <div key={i} className="p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-4 flex flex-col items-center text-center hover:border-slate-600 transition-all">
               <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center"><step.Icon size={24} className={step.iconClass} /></div>
               <div className="space-y-1"><h4 className="text-xs md:text-lg font-black text-white uppercase italic tracking-tighter">{step.title}</h4><p className="text-[8px] md:text-xs text-slate-500 font-medium leading-tight">{step.desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-6 opacity-30">
        <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.4em] italic">
          Basketcoach Pro • Säsong 25/26 • AI Collaborative Build
        </p>
      </div>
    </div>
  );
};
