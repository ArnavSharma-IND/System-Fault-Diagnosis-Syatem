import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, DiagnosticReport, SensorReading, IndustryType } from '../types';
import { Send, Bot, User, Trash2, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

interface AiChatAssistantProps {
  industry: IndustryType;
  activeReading: SensorReading | null;
  activeReport: DiagnosticReport | null;
}

export default function AiChatAssistant({ industry, activeReading, activeReport }: AiChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Operator checked-in. Sentinel Core Diagnostic Assistant online. Chat to request calibration parameters, system limits, safety directives, or troubleshooting guides.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputVal.trim();
    if (!promptToSend) return;

    if (!customPrompt) setInputVal('');
    setError(null);

    const userMessage: ChatMessage = {
      id: `USR-${Date.now()}`,
      sender: 'operator',
      text: promptToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: {
            industry,
            sensors: activeReading?.values,
            latestReport: activeReport
          }
        })
      });

      if (!response.ok) {
        throw new Error("Local diagnostic link returned error. Validate server status.");
      }

      const resData = await response.json();
      
      const aiMessage: ChatMessage = {
        id: `AI-${Date.now()}`,
        sender: 'ai',
        text: resData.text,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err?.message || "Failed to exchange socket with diagnostic hub.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: "Operator checked-in. Sentinel Core Diagnostic Assistant online. Chat to request calibration parameters, system limits, safety directives, or troubleshooting guides.",
        timestamp: new Date().toISOString()
      }
    ]);
    setError(null);
  };

  // Automated macros shortcuts help operators request immediate guidelines
  const presets = [
    { label: "Step-by-step repair guides", prompt: "Summarize a step-by-step calibration and hardware repair manual for the active diagnostic fault." },
    { label: "Safety protocols", prompt: "Explain the absolute physical lock-out/tag-out safety precautions needed for conducting maintenance on this machinery in the active sector." },
    { label: "Verify thresholds", prompt: "What are the safe operating threshold levels for each of the active sensor metrics?" }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
      {/* Copilot Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-blue-600" />
          <h2 className="text-sm font-sans font-bold tracking-tight text-slate-800">
            Sentinel Companion Co-Pilot
          </h2>
        </div>
        <button
          onClick={clearChat}
          className="text-slate-405 hover:text-slate-700 p-1 rounded transition flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
          title="Clear messages log"
        >
          <Trash2 size={12} />
          <span>CLEAR CHAT</span>
        </button>
      </div>

      {/* Messages body scrolling */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[350px] min-h-[220px] scrollbar-thin">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'operator' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${
              msg.sender === 'operator' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-slate-100 text-slate-650 border border-slate-200'
            }`}>
              {msg.sender === 'operator' ? <User size={13} /> : <Bot size={13} />}
            </div>
            
            <div className={`rounded-xl p-3 text-xs leading-relaxed max-w-[85%] text-left select-text ${
              msg.sender === 'operator'
                ? 'bg-blue-50/70 border border-blue-100 text-slate-800'
                : 'bg-slate-50 border border-slate-150 text-slate-700 font-mono'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5 text-left">
            <div className="p-1.5 rounded-lg shrink-0 bg-slate-100 text-slate-500 border border-slate-200">
              <Bot size={13} />
            </div>
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs text-slate-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
              <p className="font-sans text-[10px] uppercase font-bold ml-1 text-slate-400">Evaluating schematic directives...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 text-left">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset guidelines chips */}
      <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-150 flex gap-2 flex-wrap text-left select-none">
        {presets.map((preset, idx) => (
          <button
            key={idx}
            disabled={loading}
            onClick={() => handleSendMessage(preset.prompt)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-[10px] font-sans font-semibold text-slate-500 hover:text-blue-650 hover:border-blue-300 hover:bg-blue-50/20 transition duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm"
          >
            <Sparkles size={10} className="text-blue-500" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Input controls form */}
      <div className="p-3 bg-slate-50 border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loading}
            placeholder="Type troubleshooting questions for local active fault..."
            className="flex-1 bg-white border border-slate-200 text-slate-800 rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="p-2.5 rounded-md bg-blue-600 shadow shadow-blue-500/15 hover:bg-blue-700 active:bg-blue-850 disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-50 text-white cursor-pointer transition shrink-0"
          >
            <Send size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}
