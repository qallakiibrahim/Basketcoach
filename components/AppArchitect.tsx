
import React, { useState } from 'react';
import { generateAppConcept } from '../services/gemini';
import { Send, Loader2, FileText, LayoutTemplate, Zap } from 'lucide-react';

export const AppArchitect: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [concept, setConcept] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await generateAppConcept(prompt);
      setConcept(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center space-x-3 mb-4">
          <LayoutTemplate className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold">App Blueprint Generator</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your app idea (e.g., 'A fitness tracker for extreme mountain climbers with social features')..."
            className="w-full h-32 p-4 rounded-2xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-lg resize-none"
          />
          <button
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center space-x-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-blue-900/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Generate Architect Review</span>
              </>
            )}
          </button>
        </form>
      </div>

      {concept && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-lg">Architectural Specification</h3>
            </div>
            <button className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-800">Copy JSON</button>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
            {concept}
          </div>
        </div>
      )}
    </div>
  );
};
