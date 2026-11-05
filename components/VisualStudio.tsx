
import React, { useState, useEffect } from 'react';
import { generateImage, generateVideo } from '../services/gemini';
import { ImageIcon, Film, Loader2, Wand2, Download, AlertCircle, AlertTriangle, Key, Clock, Zap } from 'lucide-react';

const VS_CACHE_KEY = 'basket_coach_vs_cache';

export const VisualStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imgUrl, setImgUrl] = useState<string | null>(() => localStorage.getItem(VS_CACHE_KEY));
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<'image' | 'video' | null>(null);
  const [error, setError] = useState<{ message: string, status?: number } | null>(null);
  const [progress, setProgress] = useState('');
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    if (imgUrl) localStorage.setItem(VS_CACHE_KEY, imgUrl);
  }, [imgUrl]);

  useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleGenImage = async () => {
    if (!prompt || cooldown > 0) return;
    setLoading('image');
    setImgUrl(null);
    setError(null);
    try {
      const res = await generateImage(prompt);
      setImgUrl(res);
    } catch (err: any) {
      const status = err.status || 500;
      if (status === 429) setCooldown(60);
      setError({ message: err.message || "Failed.", status });
    } finally {
      setLoading(null);
    }
  };

  const handleGenVideo = async () => {
    if (!prompt || cooldown > 0) return;
    setLoading('video');
    setVideoUrl(null);
    setError(null);
    try {
      const res = await generateVideo(prompt, setProgress);
      setVideoUrl(res);
    } catch (err: any) {
      const status = err.status || 500;
      if (status === 429) setCooldown(60);
      setError({ message: err.message || "Failed.", status });
    } finally {
      setLoading(null);
      setProgress('');
    }
  };

  const setQuickPrompt = (p: string) => {
    setPrompt(p);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 sticky top-8 shadow-2xl">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              <Wand2 className="text-purple-400" />
              Creative Canvas
            </h2>
            
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
               <button 
                  onClick={() => setQuickPrompt('Explosive basketball player performing a high box jump, gym background, cinematic lighting, 8k resolution')}
                  className="px-3 py-1.5 rounded-lg bg-orange-600/10 text-orange-500 border border-orange-500/20 text-[9px] font-black uppercase whitespace-nowrap flex items-center gap-1 hover:bg-orange-600/20 transition-all"
               >
                  <Zap size={10} /> Explosive Box Jump
               </button>
               <button 
                  onClick={() => setQuickPrompt('Basketball defensive stance, low center of gravity, intense focus, studio lighting')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-500 border border-blue-500/20 text-[9px] font-black uppercase whitespace-nowrap hover:bg-blue-600/20 transition-all"
               >
                  Defensive Stance
               </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Beskriv vad du vill skapa..."
              className="w-full h-32 p-4 rounded-2xl bg-slate-950 border border-slate-800 focus:border-purple-500 transition-all outline-none resize-none text-white font-medium"
            />
            
            {error && (
              <div className={`p-4 rounded-2xl border space-y-3 ${error.status === 429 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                <div className="flex items-start gap-3">
                  {error.status === 429 ? <Clock size={16} /> : <AlertTriangle size={16} />}
                  <p className="text-xs leading-relaxed">{error.message}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleGenImage}
                disabled={!!loading || !prompt || cooldown > 0}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 font-black uppercase text-[10px] tracking-widest border border-slate-700 transition-all"
              >
                {loading === 'image' ? <Loader2 className="animate-spin" /> : (cooldown > 0 ? `${cooldown}s` : <ImageIcon size={20} />)}
                Bild
              </button>
              <button
                onClick={handleGenVideo}
                disabled={!!loading || !prompt || cooldown > 0}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 font-black uppercase text-[10px] tracking-widest transition-all"
              >
                {loading === 'video' ? <Loader2 className="animate-spin" /> : (cooldown > 0 ? <Clock size={20} /> : <Film size={20} />)}
                Video
              </button>
            </div>
            {progress && <div className="text-center text-[10px] text-purple-400 animate-pulse font-black uppercase">{progress}</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="aspect-square bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center relative group">
            {imgUrl ? (
              <>
                <img src={imgUrl} className="w-full h-full object-cover" alt="Gen" />
                <a href={imgUrl} download="ai_image.png" className="absolute top-4 right-4 p-3 bg-slate-900/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Download size={18}/></a>
              </>
            ) : <ImageIcon size={48} className="text-slate-800" />}
          </div>
          <div className="aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center">
            {videoUrl ? <video src={videoUrl} controls className="w-full h-full object-cover" /> : <Film size={48} className="text-slate-800" />}
          </div>
        </div>
      </div>
    </div>
  );
};
