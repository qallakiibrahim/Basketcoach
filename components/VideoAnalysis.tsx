
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, FastForward, Rewind, Trash2, MonitorPlay, Film, Scissors, CheckCircle2, RotateCcw, X, Sparkles, Loader2, ListVideo, BrainCircuit, Layers, Clock } from 'lucide-react';
import { VideoClip } from '../types';
import { analyzeGameFrame } from '../services/gemini';

export const VideoAnalysis: React.FC = () => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClips, setShowClips] = useState(false);

  // AI Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(""); // Feedback text for long ops
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [aiFocus, setAiFocus] = useState("");
  const [aiPlayerNum, setAiPlayerNum] = useState("");
  const [analysisMode, setAnalysisMode] = useState<'single' | 'sequence' | 'full'>('single');

  // Load clips from local storage if matching filename exists
  useEffect(() => {
    if (fileName) {
      const saved = localStorage.getItem(`basket_clips_${fileName}`);
      if (saved) {
        setClips(JSON.parse(saved));
      } else {
        setClips([]);
      }
    }
  }, [fileName]);

  // Save clips to local storage
  useEffect(() => {
    if (fileName && clips.length > 0) {
      localStorage.setItem(`basket_clips_${fileName}`, JSON.stringify(clips));
    }
  }, [clips, fileName]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setFileName(file.name);
      setClips([]);
      setAiAnalysis(null);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const seek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const jumpTo = (time: number) => {
    if (videoRef.current) {
      // Jump 5 seconds before the tag to give context
      const jumpTime = Math.max(0, time - 5);
      videoRef.current.currentTime = jumpTime;
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const addTag = (label: string, type: 'positive' | 'negative' | 'neutral') => {
    if (!videoRef.current) return;
    
    const timestamp = videoRef.current.currentTime;
    const newClip: VideoClip = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp,
      label,
      note: '',
      type
    };

    setClips(prev => [...prev, newClip].sort((a, b) => a.timestamp - b.timestamp));
  };

  const deleteClip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClips(prev => prev.filter(c => c.id !== id));
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const startAiAnalysis = () => {
    if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
    }
    setShowAiConfig(true);
  };

  // Optimized capture function to reduce memory usage and crash risk
  const captureFrame = (quality = 0.7, targetWidth = 800): string | null => {
     if (!videoRef.current) return null;
     
     const canvas = document.createElement('canvas');
     const video = videoRef.current;
     
     // Calculate aspect ratio to keep proportions but reduce size
     const scale = Math.min(1, targetWidth / video.videoWidth);
     canvas.width = video.videoWidth * scale;
     canvas.height = video.videoHeight * scale;
     
     const ctx = canvas.getContext('2d');
     if (!ctx) return null;
     
     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
     // Export as JPEG (smaller than PNG) with reduced quality
     return canvas.toDataURL('image/jpeg', quality);
  };

  // Helper to wait for video seek to complete
  const waitForSeek = async (video: HTMLVideoElement) => {
    return new Promise<void>(resolve => {
        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
        };
        video.addEventListener('seeked', onSeeked);
    });
  };

  // AI ANALYSIS LOGIC
  const executeAnalysis = async () => {
    if (!videoRef.current) return;
    
    setShowAiConfig(false);
    setAnalyzing(true);
    setAiAnalysis(null);
    setAnalysisProgress("");

    try {
      let imageData: string | string[] = [];

      if (analysisMode === 'single') {
         const frame = captureFrame();
         if (frame) imageData = frame;
      } else if (analysisMode === 'sequence') {
         // Sequence Capture Logic (2 seconds)
         const frames: string[] = [];
         const startTime = videoRef.current.currentTime;
         
         setAnalysisProgress("Fångar sekvens...");
         
         for (let i = 0; i < 5; i++) {
             const frame = captureFrame();
             if (frame) frames.push(frame);
             
             videoRef.current.currentTime += 0.4;
             await new Promise(resolve => setTimeout(resolve, 200)); 
         }
         
         videoRef.current.currentTime = startTime;
         imageData = frames;
      } else if (analysisMode === 'full') {
        // Full Video "Storyboard" Logic
        const frames: string[] = [];
        const originalTime = videoRef.current.currentTime;
        
        // Reduced snapshot count to prevent memory crash (10 instead of 20)
        const snapshotCount = 10;
        const interval = duration / snapshotCount;
        
        for (let i = 0; i < snapshotCount; i++) {
           setAnalysisProgress(`Skannar video... ${(i/snapshotCount * 100).toFixed(0)}%`);
           const targetTime = i * interval;
           videoRef.current.currentTime = targetTime;
           await waitForSeek(videoRef.current);
           // Small delay to ensure render
           await new Promise(resolve => setTimeout(resolve, 100));
           
           // Use aggressive compression for full video analysis
           const frame = captureFrame(0.6, 640);
           if (frame) frames.push(frame);
        }

        videoRef.current.currentTime = originalTime;
        imageData = frames;
      }

      if (imageData.length === 0) throw new Error("Kunde inte fånga bilder");

      setAnalysisProgress("Analyserar med AI...");
      // Call Gemini Service with user context
      const result = await analyzeGameFrame(imageData, aiFocus, aiPlayerNum);
      setAiAnalysis(result);
    } catch (err) {
      console.error(err);
      setAiAnalysis("Kunde inte analysera bilden/sekvensen. Videon kan vara för stor för webbläsarens minne.");
    } finally {
      setAnalyzing(false);
      setAnalysisProgress("");
      // Reset inputs
      setAiFocus("");
      setAiPlayerNum("");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-24 h-full flex flex-col relative">
      {!videoSrc ? (
         <>
          <div className="flex items-center justify-between px-1 shrink-0">
            <div>
              <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                <MonitorPlay className="text-orange-500" /> Videoanalys
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lokal Analys & AI Coach</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/50 p-8 md:p-12 text-center space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
              <Film size={40} className="text-slate-600 md:w-12 md:h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white italic uppercase">Ladda upp matchfilm</h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto">
                Filen analyseras lokalt i din webbläsare. Ingen uppladdning krävs, vilket gör det blixtsnabbt och säkert.
              </p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              accept="video/*" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 md:px-8 md:py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-orange-900/20 hover:scale-105 transition-all flex items-center gap-3"
            >
              <Upload size={18} /> Välj videofil (MP4/MOV)
            </button>
          </div>
         </>
      ) : (
        <div className="flex-1 flex flex-col items-center gap-4 md:gap-6 min-h-0 animate-in fade-in duration-500 w-full">
           {/* Header with Exit */}
           <div className="w-full flex items-center justify-between px-2 md:px-4">
              <div className="flex items-center gap-3 min-w-0">
                 <div className="bg-orange-600 w-1.5 h-6 md:w-2 md:h-8 rounded-full shrink-0"></div>
                 <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-black text-white italic uppercase tracking-tighter leading-none truncate">Filmrummet</h3>
                    <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate max-w-[150px] md:max-w-[200px]">{fileName}</p>
                 </div>
              </div>
              <div className="flex gap-2 shrink-0">
                 <button 
                    onClick={() => setShowClips(!showClips)}
                    className={`px-3 py-2 md:px-4 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase flex items-center gap-2 border transition-all ${showClips ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-950 text-slate-500 border-slate-900 hover:text-white'}`}
                 >
                    <ListVideo size={14} /> <span className="hidden sm:inline">Klipp</span>
                 </button>
                 <button 
                  onClick={() => {
                      setVideoSrc(null);
                      setFileName("");
                      setClips([]);
                      setAiAnalysis(null);
                  }}
                  className="px-3 py-2 md:px-4 md:py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-900/20 transition-all text-[9px] md:text-[10px] font-black uppercase flex items-center gap-2"
                >
                  <X size={14} /> <span className="hidden sm:inline">Stäng</span>
                </button>
              </div>
           </div>

           {/* Main Video Modal - Centered */}
           <div className="w-full max-w-5xl flex-1 relative bg-black rounded-xl md:rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800 group">
                <video 
                   ref={videoRef}
                   src={videoSrc}
                   className="w-full h-full object-contain"
                   onTimeUpdate={handleTimeUpdate}
                   onLoadedMetadata={handleLoadedMetadata}
                   onClick={togglePlay}
                   crossOrigin="anonymous" 
                   playsInline
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col gap-2 md:gap-4">
                   <div className="flex items-center gap-2 md:gap-4">
                      <button onClick={togglePlay} className="p-2 md:p-3 bg-white text-black rounded-full hover:scale-110 transition-transform">
                          {isPlaying ? <Pause size={16} className="md:w-5 md:h-5" fill="currentColor" /> : <Play size={16} className="md:w-5 md:h-5" fill="currentColor" />}
                      </button>
                      
                      <div className="flex-1 flex flex-col gap-1">
                          <input 
                              type="range" 
                              min="0" 
                              max={duration} 
                              value={currentTime}
                              onChange={(e) => {
                                const time = parseFloat(e.target.value);
                                if(videoRef.current) videoRef.current.currentTime = time;
                                setCurrentTime(time);
                              }}
                              className="w-full h-1 md:h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
                          />
                          <div className="flex justify-between text-[8px] md:text-[9px] font-mono font-bold text-slate-300">
                              <span>{formatTime(currentTime)}</span>
                              <span>{formatTime(duration)}</span>
                          </div>
                      </div>

                      <div className="flex gap-1 md:gap-2">
                          <button onClick={() => seek(-5)} className="p-1.5 md:p-2 text-white hover:bg-white/10 rounded-lg"><Rewind size={16} className="md:w-[18px] md:h-[18px]" /></button>
                          <button onClick={() => seek(5)} className="p-1.5 md:p-2 text-white hover:bg-white/10 rounded-lg"><FastForward size={16} className="md:w-[18px] md:h-[18px]" /></button>
                      </div>
                   </div>
                </div>

                {/* Clips Drawer - Absolute positioned to avoid layout shift */}
                {showClips && (
                   <div className="absolute top-2 right-2 bottom-2 w-48 md:top-4 md:left-4 md:bottom-4 md:w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col animate-in slide-in-from-right md:slide-in-from-left duration-200 z-40 shadow-2xl">
                      <div className="flex items-center justify-between mb-2 md:mb-4 shrink-0">
                          <h4 className="text-[10px] md:text-xs font-black text-white uppercase">Klipp ({clips.length})</h4>
                          <button onClick={() => setShowClips(false)} className="text-slate-500 hover:text-white"><X size={14}/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                         {clips.map(clip => (
                            <div 
                              key={clip.id} 
                              onClick={() => jumpTo(clip.timestamp)}
                              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-white/5 cursor-pointer group"
                            >
                               <div className="flex justify-between items-start">
                                  <span className={`text-[8px] md:text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mb-1 inline-block ${clip.type === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : clip.type === 'negative' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>{formatTime(clip.timestamp)}</span>
                                  <button onClick={(e) => deleteClip(clip.id, e)} className="text-slate-600 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><Trash2 size={10} className="md:w-3 md:h-3" /></button>
                               </div>
                               <div className="text-[9px] md:text-[10px] font-bold text-slate-200 truncate">{clip.label}</div>
                            </div>
                         ))}
                         {clips.length === 0 && <div className="text-[9px] text-slate-500 text-center py-4">Inga klipp än.</div>}
                      </div>
                   </div>
                )}
           </div>

           {/* Controls / Tagging Bar - Responsive Grid */}
           <div className="w-full max-w-5xl shrink-0 overflow-x-auto pb-safe">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 w-full">
                  <button 
                    onClick={startAiAnalysis}
                    disabled={analyzing}
                    className="col-span-1 p-3 md:p-4 bg-purple-600/10 border border-purple-600/30 text-purple-400 rounded-xl md:rounded-2xl hover:bg-purple-600 hover:text-white transition-all font-black uppercase text-[9px] md:text-[10px] tracking-widest flex flex-col items-center justify-center gap-2 group h-20 md:h-auto"
                  >
                    {analyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="group-hover:scale-110 transition-transform md:w-5 md:h-5" />}
                    AI Analys
                  </button>

                  <button onClick={() => addTag("Bra Defense", "positive")} className="p-3 md:p-4 bg-slate-900 border border-slate-800 text-emerald-500 rounded-xl md:rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black uppercase text-[9px] md:text-[10px] tracking-widest flex flex-col items-center justify-center gap-2 h-20 md:h-auto">
                    <CheckCircle2 size={18} className="md:w-5 md:h-5" /> Bra Defense
                  </button>
                  <button onClick={() => addTag("Turnover", "negative")} className="p-3 md:p-4 bg-slate-900 border border-slate-800 text-rose-500 rounded-xl md:rounded-2xl hover:bg-rose-600 hover:text-white transition-all font-black uppercase text-[9px] md:text-[10px] tracking-widest flex flex-col items-center justify-center gap-2 h-20 md:h-auto">
                    <Scissors size={18} className="md:w-5 md:h-5" /> Turnover
                  </button>
                  <button onClick={() => addTag("Offensiv Action", "neutral")} className="p-3 md:p-4 bg-slate-900 border border-slate-800 text-blue-500 rounded-xl md:rounded-2xl hover:bg-blue-600 hover:text-white transition-all font-black uppercase text-[9px] md:text-[10px] tracking-widest flex flex-col items-center justify-center gap-2 h-20 md:h-auto">
                    <MonitorPlay size={18} className="md:w-5 md:h-5" /> Offensiv
                  </button>
                  <button onClick={() => addTag("Highlight", "positive")} className="p-3 md:p-4 bg-slate-900 border border-slate-800 text-orange-500 rounded-xl md:rounded-2xl hover:bg-orange-600 hover:text-white transition-all font-black uppercase text-[9px] md:text-[10px] tracking-widest flex flex-col items-center justify-center gap-2 h-20 md:h-auto">
                    <Film size={18} className="md:w-5 md:h-5" /> Highlight
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* AI Configuration Modal - Updated with better scrolling and mobile fit */}
      {showAiConfig && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
           {/* Reduced max-height to 75dvh and added mb-safe to ensure button visibility on mobile browsers */}
           <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden max-h-[85dvh]">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-[50px] -mt-10 -mr-10 pointer-events-none"></div>
               
               {/* Modal Header */}
               <div className="flex justify-between items-start p-6 pb-2 shrink-0 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                      <BrainCircuit className="text-purple-500" /> AI Coach
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Konfigurera analysen</p>
                  </div>
                  <button onClick={() => setShowAiConfig(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white"><X size={20}/></button>
               </div>

               {/* Scrollable Content */}
               <div className="p-6 pt-2 space-y-5 overflow-y-auto custom-scrollbar relative z-10 flex-1">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Typ av analys</label>
                     <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={() => setAnalysisMode('single')}
                            className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${analysisMode === 'single' ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                        >
                            <Film size={16} /> Ögonblicksbild
                        </button>
                        <button 
                            onClick={() => setAnalysisMode('sequence')}
                            className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${analysisMode === 'sequence' ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                        >
                            <Layers size={16} /> Sekvens (2s)
                        </button>
                        <button 
                            onClick={() => setAnalysisMode('full')}
                            className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${analysisMode === 'full' ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                        >
                            <Clock size={16} /> Hela Videon
                        </button>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spelare att observera (Valfritt)</label>
                     <input 
                        type="text" 
                        placeholder="t.ex. #10 eller 'Point Guard'"
                        value={aiPlayerNum}
                        onChange={(e) => setAiPlayerNum(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none placeholder:text-slate-700"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vad ska jag titta efter?</label>
                     <textarea 
                        placeholder="t.ex. 'Hur är den defensiva stancen?', 'Finns det passningsvägar?', 'Är spacingen bra?'"
                        value={aiFocus}
                        onChange={(e) => setAiFocus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none placeholder:text-slate-700 h-24 resize-none"
                     />
                  </div>
                  
                  <div className="flex gap-2">
                     <button 
                       onClick={() => { setAiFocus("Analysera försvarets positionering och stance."); setAiPlayerNum(""); }}
                       className="px-3 py-1.5 rounded-lg bg-slate-800 text-[9px] font-bold text-slate-400 hover:text-purple-400 hover:bg-slate-700 transition-colors uppercase"
                     >
                       Defense
                     </button>
                     <button 
                       onClick={() => { setAiFocus("Hitta öppna ytor och passningsmöjligheter."); setAiPlayerNum(""); }}
                       className="px-3 py-1.5 rounded-lg bg-slate-800 text-[9px] font-bold text-slate-400 hover:text-purple-400 hover:bg-slate-700 transition-colors uppercase"
                     >
                       Offense
                     </button>
                  </div>
               </div>
               
               {/* Footer with Button - Always Visible and Safe */}
               <div className="p-6 pt-4 shrink-0 bg-slate-900 border-t border-slate-800/50 pb-8">
                 <button 
                    onClick={executeAnalysis}
                    className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-purple-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                    <Sparkles size={16} /> 
                    {analysisMode === 'sequence' ? 'Analysera Sekvens' : analysisMode === 'full' ? 'Analysera Hela Videon' : 'Analysera Bildruta'}
                 </button>
               </div>
           </div>
        </div>
      )}

      {/* AI Analysis Result Modal */}
      {aiAnalysis && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col max-h-[85vh]">
               <div className="flex justify-between items-center mb-6 shrink-0">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                    <Sparkles className="text-purple-500" /> AI Coach Analys
                  </h3>
                  <button onClick={() => setAiAnalysis(null)} className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white"><X size={20}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                  <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
                     <p className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{aiAnalysis}</p>
                  </div>
                  <div className="text-[10px] text-slate-500 text-center uppercase font-bold tracking-widest">Genererad av Gemini 3 Flash</div>
               </div>

               <div className="pt-6 shrink-0">
                   <button 
                      onClick={() => setAiAnalysis(null)}
                      className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs tracking-widest transition-all"
                   >
                      Stäng Analys
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* Loading Overlay for Long Analysis */}
      {analyzing && analysisProgress && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
           <div className="text-center space-y-4">
              <Loader2 size={48} className="text-purple-500 animate-spin mx-auto" />
              <h3 className="text-xl font-black text-white uppercase italic">{analysisProgress}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Detta kan ta en stund...</p>
           </div>
        </div>
      )}
    </div>
  );
};
