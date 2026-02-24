import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import {
  Activity,
  Cpu,
  Zap,
  Server,
  AlertTriangle,
  CheckCircle2,
  Play,
  Square,
  Terminal,
  BrainCircuit,
  Gauge,
  Settings2,
  List,
  Flame,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tier = 'Edge (Ryzen AI)' | 'Control (Ryzen)' | 'Cloud GPU (Instinct)' | 'EPYC Orchestration';
type Mode = 'baseline' | 'soif' | 'aggressive' | 'energy-saving';

interface DataPoint {
  index: number;
  token: string;
  sci: number;
  entropy: number;
  curvature: number;
  drift: number;
  tier: Tier;
  time: number;
  seer: number;
  energy: number;
  latency: number;
}

interface LogEvent {
  id: string;
  time: number;
  type: 'info' | 'warning' | 'critical' | 'migration';
  message: string;
  tokenIndex: number;
}

const BASE_ENTROPY = 0.4;
const BASE_CURVATURE = 0.2;

export default function App() {
  const [prompt, setPrompt] = useState('Explain the theory of relativity in simple terms.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [data, setData] = useState<DataPoint[]>([]);
  const [events, setEvents] = useState<LogEvent[]>([]);
  
  // Controls & Modes
  const [mode, setMode] = useState<Mode>('soif');
  const [temperature, setTemperature] = useState(0.8);
  const [beamWidth, setBeamWidth] = useState(1);
  const [sciThreshold, setSciThreshold] = useState(1.5);
  const [forceGpu, setForceGpu] = useState(false);

  const [systemHealth, setSystemHealth] = useState({
    cpu: 15,
    gpu: 0,
    memory: 2.4,
    latency: 45,
    escalations: 0
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  const simState = useRef({
    entropy: BASE_ENTROPY,
    curvature: BASE_CURVATURE,
    prevSpectrum: 0.5,
    tier: 'Edge (Ryzen AI)' as Tier,
    tokenCount: 0,
    infoGain: 0,
    totalEnergy: 0,
  });

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [data]);

  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [events]);

  // Adjust thresholds based on mode
  const activeSciThreshold = mode === 'aggressive' ? 1.0 : mode === 'energy-saving' ? 2.0 : sciThreshold;
  const activeDetThreshold = activeSciThreshold * 0.6;

  const addEvent = (type: LogEvent['type'], message: string, tokenIndex: number) => {
    setEvents(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      time: Date.now(),
      type,
      message,
      tokenIndex
    }]);
  };

  const handleGenerate = async () => {
    if (isGenerating || isReplaying) {
      abortControllerRef.current?.abort();
      setIsGenerating(false);
      setIsReplaying(false);
      return;
    }

    setIsGenerating(true);
    setData([]);
    setEvents([]);
    setSystemHealth({ cpu: 15, gpu: 0, memory: 2.4, latency: 45, escalations: 0 });
    setForceGpu(false);
    startTimeRef.current = performance.now();
    
    simState.current = {
      entropy: BASE_ENTROPY,
      curvature: BASE_CURVATURE,
      prevSpectrum: 0.5,
      tier: 'Edge (Ryzen AI)',
      tokenCount: 0,
      infoGain: 0,
      totalEnergy: 0,
    };

    addEvent('info', `Simulation started in ${mode.toUpperCase()} mode`, 0);

    abortControllerRef.current = new AbortController();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      for await (const chunk of response) {
        if (abortControllerRef.current?.signal.aborted) break;
        
        const text = chunk.text || '';
        const tokens = text.match(/[\s\S]{1,4}/g) || [text];
        
        for (const token of tokens) {
          if (abortControllerRef.current?.signal.aborted) break;
          
          simState.current.tokenCount++;
          const tCount = simState.current.tokenCount;
          
          let { entropy, curvature, prevSpectrum, tier } = simState.current;
          
          // Base fluctuations
          entropy += (Math.random() - 0.5) * 0.15;
          curvature += (Math.random() - 0.5) * 0.08;
          
          const currentSpectrum = prevSpectrum + (Math.random() - 0.5) * 0.25;
          let drift = Math.abs(currentSpectrum - prevSpectrum);
          
          // Simulate instability buildup
          if (tCount > 30 && tCount < 50 && tier === 'Edge (Ryzen AI)') {
            entropy += 0.3; 
            drift += 0.5;  
            if (tCount === 35) addEvent('warning', 'Spectral drift detected. Instability building.', tCount);
          }
          
          let sci = 0.5 * drift + 0.3 * entropy - 0.2 * curvature;
          sci = Math.max(0, sci); 
          
          // Decision Engine (SOIF intervention)
          let prevTier = tier;
          if (mode !== 'baseline') {
            if (forceGpu && tier !== 'Cloud GPU (Instinct)') {
              tier = 'Cloud GPU (Instinct)';
              addEvent('migration', 'Manual override: Escalated to Cloud GPU', tCount);
            } else if (sci >= activeSciThreshold && tier !== 'Cloud GPU (Instinct)') {
              tier = 'Cloud GPU (Instinct)';
              addEvent('migration', `SCI (${sci.toFixed(2)}) exceeded threshold. Escalating to GPU Cluster.`, tCount);
              setSystemHealth(s => ({ ...s, escalations: s.escalations + 1 }));
            } else if (sci >= activeDetThreshold && sci < activeSciThreshold && tier === 'Edge (Ryzen AI)') {
              tier = 'Control (Ryzen)';
              addEvent('info', 'Uncertainty plateau. Switching to Deterministic Control.', tCount);
            } else if (tier === 'Control (Ryzen)' && sci < activeDetThreshold) {
              tier = 'Edge (Ryzen AI)';
              addEvent('info', 'Stability restored. Returning to Edge.', tCount);
            }
          }

          // Apply intervention effects
          if (tier === 'Cloud GPU (Instinct)') {
            sci *= 0.4;
            entropy *= 0.5;
            drift *= 0.3;
          } else if (tier === 'Control (Ryzen)') {
            sci *= 0.7;
            entropy *= 0.8;
          }

          // Metrics calculation
          const stepLatency = tier === 'Cloud GPU (Instinct)' ? 85 + Math.random()*20 : 40 + Math.random()*10;
          const stepEnergy = tier === 'Cloud GPU (Instinct)' ? 12.5 : (tier === 'Control (Ryzen)' ? 4.2 : 2.1);
          simState.current.totalEnergy += stepEnergy;
          
          const stepInfoGain = Math.max(0.1, 1 - entropy);
          simState.current.infoGain += stepInfoGain;
          
          const currentSeer = simState.current.infoGain / Math.max(0.1, simState.current.totalEnergy);

          simState.current = {
            entropy,
            curvature,
            prevSpectrum: currentSpectrum,
            tier,
            tokenCount: tCount,
            infoGain: simState.current.infoGain,
            totalEnergy: simState.current.totalEnergy,
          };
          
          // Update System Health
          setSystemHealth(prev => ({
            ...prev,
            cpu: tier === 'Edge (Ryzen AI)' ? 65 + Math.random()*15 : 25 + Math.random()*10,
            gpu: tier === 'Cloud GPU (Instinct)' ? 85 + Math.random()*10 : 5 + Math.random()*5,
            memory: Math.min(16, prev.memory + 0.05),
            latency: stepLatency
          }));

          setData(prev => [...prev, {
            index: tCount,
            token,
            sci,
            entropy,
            curvature,
            drift,
            tier,
            time: performance.now(),
            seer: currentSeer,
            energy: stepEnergy,
            latency: stepLatency
          }]);
          
          await new Promise(r => setTimeout(r, stepLatency));
        }
      }
      addEvent('info', 'Generation complete.', simState.current.tokenCount);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Generation error:', error);
        addEvent('critical', `Error: ${error.message}`, simState.current.tokenCount);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReplay = async () => {
    if (data.length === 0 || isGenerating) return;
    setIsReplaying(true);
    const fullData = [...data];
    setData([]);
    setEvents([]);
    
    for (let i = 0; i < fullData.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;
      setData(prev => [...prev, fullData[i]]);
      await new Promise(r => setTimeout(r, 50));
    }
    setIsReplaying(false);
  };

  const currentData = data.length > 0 ? data[data.length - 1] : null;
  const currentSci = currentData?.sci || 0;
  const currentEntropy = currentData?.entropy || 0;
  const currentTier = currentData?.tier || 'Edge (Ryzen AI)';
  const currentSeer = currentData?.seer || 0;

  const getSciColor = (val: number) => {
    if (val >= activeSciThreshold) return 'text-red-500';
    if (val >= activeDetThreshold) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getTierColor = (tier: Tier) => {
    switch (tier) {
      case 'Edge (Ryzen AI)': return 'text-emerald-500';
      case 'Control (Ryzen)': return 'text-amber-500';
      case 'Cloud GPU (Instinct)': return 'text-violet-500';
      case 'EPYC Orchestration': return 'text-blue-500';
    }
  };

  const migrationEvents = data.reduce((acc, curr, idx, arr) => {
    if (idx > 0 && curr.tier !== arr[idx - 1].tier) {
      acc.push({ index: curr.index, tier: curr.tier });
    }
    return acc;
  }, [] as { index: number; tier: Tier }[]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 p-4 md:p-6 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#262626] pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#141414] rounded-lg border border-[#262626]">
              <BrainCircuit className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">SOIF Dashboard</h1>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Stability-Orchestrated Intelligence Fabric</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-[#141414] p-1.5 rounded-lg border border-[#262626]">
            {(['baseline', 'soif', 'aggressive', 'energy-saving'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={isGenerating}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-all",
                  mode === m 
                    ? "bg-[#262626] text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-300 disabled:opacity-50"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </header>

        {/* Top: Prompt & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-[#141414] rounded-xl border border-[#262626] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Input Prompt
              </label>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating || isReplaying}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none h-20 disabled:opacity-50"
              placeholder="Enter a prompt to simulate..."
            />
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isGenerating 
                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" 
                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                )}
              >
                {isGenerating ? (
                  <><Square className="w-4 h-4 fill-current" /> Halt Simulation</>
                ) : (
                  <><Play className="w-4 h-4 fill-current" /> Initialize Inference</>
                )}
              </button>
              <button
                onClick={handleReplay}
                disabled={isGenerating || data.length === 0}
                className="px-4 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-[#262626] text-white hover:bg-[#333] transition-all disabled:opacity-50"
              >
                <RotateCcw className={cn("w-4 h-4", isReplaying && "animate-spin")} />
                Replay
              </button>
            </div>
          </div>

          <div className="lg:col-span-1 bg-[#141414] rounded-xl border border-[#262626] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              <Settings2 className="w-4 h-4" />
              Inference Control
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">SCI Threshold</span>
                  <span className="font-mono text-emerald-500">{sciThreshold.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0.5" max="3.0" step="0.1" 
                  value={sciThreshold} onChange={(e) => setSciThreshold(parseFloat(e.target.value))}
                  disabled={mode !== 'soif' || isGenerating}
                  className="w-full accent-emerald-500 disabled:opacity-50"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Temperature</span>
                  <span className="font-mono text-gray-300">{temperature.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0" max="2" step="0.1" 
                  value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  disabled={isGenerating}
                  className="w-full accent-gray-500 disabled:opacity-50"
                />
              </div>

              <button
                onClick={() => setForceGpu(true)}
                disabled={isGenerating && currentTier === 'Cloud GPU (Instinct)'}
                className="w-full py-2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-mono uppercase hover:bg-violet-500/20 transition-all disabled:opacity-50"
              >
                Force GPU Escalation
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Output & Visualizer */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            
            {/* Tier Migration Visualizer */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-4">
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">
                <Server className="w-4 h-4" />
                Tier Migration Visualizer
              </div>
              <div className="flex items-center justify-between relative px-4">
                {/* Connecting Lines */}
                <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-0.5 bg-[#262626] -z-10" />
                
                {(['Edge (Ryzen AI)', 'Control (Ryzen)', 'Cloud GPU (Instinct)'] as Tier[]).map((t, i) => {
                  const isActive = currentTier === t;
                  return (
                    <div key={t} className="flex flex-col items-center gap-2 bg-[#141414] px-2">
                      <div className={cn(
                        "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                        isActive ? "border-current shadow-[0_0_15px_currentColor] scale-110" : "border-[#262626] text-gray-600",
                        getTierColor(t)
                      )}>
                        {i === 0 ? <Cpu className="w-5 h-5" /> : i === 1 ? <Activity className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                      </div>
                      <span className={cn("text-[10px] font-mono uppercase text-center w-24", isActive ? getTierColor(t) : "text-gray-600")}>
                        {t}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Token-Level Stability Overlay */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] flex-1 flex flex-col overflow-hidden min-h-[300px]">
              <div className="border-b border-[#262626] p-3 flex items-center justify-between bg-[#0a0a0a]/50">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Token-Level Stability Overlay</span>
                <div className="flex gap-4 text-[10px] font-mono">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500/20 border border-red-500/50 rounded-sm"/> High Entropy</span>
                  <span className="flex items-center gap-1"><div className="w-[1px] h-3 bg-violet-500"/> Intervention</span>
                </div>
              </div>
              <div 
                ref={terminalRef}
                className="p-4 overflow-y-auto flex-1 font-mono text-sm leading-relaxed whitespace-pre-wrap"
              >
                {data.length === 0 && !isGenerating && !isReplaying && (
                  <span className="text-gray-600 italic">Awaiting input...</span>
                )}
                {data.map((d, i) => {
                  const isHighEntropy = d.entropy > 0.8;
                  const isMigration = i > 0 && d.tier !== data[i-1].tier;
                  return (
                    <React.Fragment key={i}>
                      {isMigration && (
                        <span className="inline-block mx-1 h-4 w-[2px] bg-violet-500 align-middle" title={`Migrated to ${d.tier}`} />
                      )}
                      <span 
                        className={cn(
                          "transition-colors duration-300 px-0.5 rounded-sm",
                          isHighEntropy ? "bg-red-500/20 text-red-200" : "text-gray-300",
                          d.tier === 'Cloud GPU (Instinct)' && !isHighEntropy && "text-violet-300"
                        )}
                        title={`SCI: ${d.sci.toFixed(2)} | H: ${d.entropy.toFixed(2)}`}
                      >
                        {d.token}
                      </span>
                    </React.Fragment>
                  );
                })}
                {(isGenerating || isReplaying) && (
                  <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1 align-middle" />
                )}
              </div>
            </div>

            {/* Event Log Timeline */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] h-48 flex flex-col">
              <div className="border-b border-[#262626] p-3 flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider bg-[#0a0a0a]/50">
                <List className="w-4 h-4" />
                Event Log Timeline
              </div>
              <div ref={eventsRef} className="p-3 overflow-y-auto flex-1 space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="flex gap-3 text-xs font-mono">
                    <span className="text-gray-600 shrink-0">[{new Date(ev.time).toISOString().substring(11, 23)}]</span>
                    <span className={cn(
                      "shrink-0 w-16",
                      ev.type === 'info' ? 'text-blue-400' :
                      ev.type === 'warning' ? 'text-amber-400' :
                      ev.type === 'critical' ? 'text-red-500' : 'text-violet-400'
                    )}>
                      {ev.type.toUpperCase()}
                    </span>
                    <span className="text-gray-300">{ev.message}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Dashboards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* System Health Panel */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-4">
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">
                <Activity className="w-4 h-4" />
                System Health
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-1">CPU USAGE</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#262626] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${systemHealth.cpu}%` }} />
                    </div>
                    <span className="text-xs font-mono text-gray-300 w-8">{systemHealth.cpu.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-1">GPU USAGE</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#262626] rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${systemHealth.gpu}%` }} />
                    </div>
                    <span className="text-xs font-mono text-gray-300 w-8">{systemHealth.gpu.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-1">MEMORY</div>
                  <div className="text-sm font-mono text-gray-300">{systemHealth.memory.toFixed(1)} GB</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-1">LATENCY/TOKEN</div>
                  <div className="text-sm font-mono text-gray-300">{systemHealth.latency.toFixed(0)} ms</div>
                </div>
              </div>
            </div>

            {/* Live Stability Monitor */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-4 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
                  <Gauge className="w-4 h-4" />
                  Live Stability Monitor
                </div>
                <div className={cn("text-xl font-mono font-light", getSciColor(currentSci))}>
                  SCI: {currentSci.toFixed(2)}
                </div>
              </div>
              
              {/* SCI Chart */}
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorSci" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="index" hide />
                    <YAxis stroke="#525252" tick={{ fill: '#525252', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 3]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                      itemStyle={{ color: '#e5e5e5' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <ReferenceLine y={activeSciThreshold} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                    <ReferenceLine y={activeDetThreshold} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} />
                    {migrationEvents.map((event, i) => (
                      <ReferenceLine key={`mig-${i}`} x={event.index} stroke="#8b5cf6" strokeDasharray="3 3" opacity={0.5} />
                    ))}
                    <Area type="monotone" dataKey="sci" stroke="#10b981" fillOpacity={1} fill="url(#colorSci)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Entropy & Curvature */}
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 w-full">
                  <div className="text-[10px] font-mono text-gray-500 mb-1">ENTROPY (H)</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <YAxis hide domain={[0, 1.5]} />
                      <Line type="monotone" dataKey="entropy" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-24 w-full">
                  <div className="text-[10px] font-mono text-gray-500 mb-1">CONFIDENCE CURVATURE</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <YAxis hide domain={[0, 1]} />
                      <Line type="monotone" dataKey="curvature" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Energy & SEER Dashboard */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
                  <Zap className="w-4 h-4" />
                  Energy & SEER
                </div>
                <div className="text-xl font-mono font-light text-blue-400">
                  SEER: {currentSeer.toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-1">TOTAL ENERGY (PROXY)</div>
                  <div className="text-lg font-mono text-gray-200">{simState.current.totalEnergy.toFixed(1)} J</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-1">AVG JOULES/TOKEN</div>
                  <div className="text-lg font-mono text-gray-200">
                    {data.length > 0 ? (simState.current.totalEnergy / data.length).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              <div className="h-24 w-full mt-2">
                <div className="text-[10px] font-mono text-gray-500 mb-1">ENERGY USAGE / TOKEN</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <Bar dataKey="energy" fill="#60a5fa" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


