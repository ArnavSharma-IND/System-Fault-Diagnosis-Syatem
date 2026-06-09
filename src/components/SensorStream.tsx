import React, { useEffect, useState, useRef } from 'react';
import { IndustryType, INDUSTRIES, SensorReading, LogEntry } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Play, Pause, AlertTriangle, Cpu, Info, RefreshCw, Zap, Activity } from 'lucide-react';

interface SensorStreamProps {
  industry: IndustryType;
  onNewReading: (reading: SensorReading) => void;
  onInjectLog: (log: LogEntry) => void;
  activeReading: SensorReading | null;
}

export default function SensorStream({ industry, onNewReading, onInjectLog, activeReading }: SensorStreamProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeAnomaly, setActiveAnomaly] = useState<string | null>(null);
  
  const metadata = INDUSTRIES[industry];
  const lastReadingsRef = useRef<Record<string, number>>({});

  // Initialize nominal readings
  useEffect(() => {
    const initialRaw: Record<string, number> = {};
    metadata.sensors.forEach(sensor => {
      const nominalMid = (sensor.nominalMin + sensor.nominalMax) / 2;
      initialRaw[sensor.key] = nominalMid;
    });
    lastReadingsRef.current = initialRaw;

    // Reset chart data
    const initialChart: any[] = [];
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const timestampLabel = new Date(now - i * 2000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const record: Record<string, any> = { timestamp: timestampLabel };
      metadata.sensors.forEach(sensor => {
        const dev = (sensor.nominalMax - sensor.nominalMin) * (Math.random() - 0.5) * 0.1;
        const base = (sensor.nominalMin + sensor.nominalMax) / 2;
        record[sensor.key] = Number((base + dev).toFixed(2));
      });
      initialChart.push(record);
    }
    setChartData(initialChart);
  }, [industry]);

  // Handle ticker for actual stream
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timestampLabel = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Calculate next value
      const newValues: Record<string, number> = {};
      let isWarning = false;
      let isCritical = false;

      metadata.sensors.forEach(sensor => {
        const currentVal = lastReadingsRef.current[sensor.key] || (sensor.nominalMin + sensor.nominalMax) / 2;
        
        let delta = (sensor.nominalMax - sensor.nominalMin) * (Math.random() - 0.5) * 0.08;
        
        // If an anomaly is injected, force scale value upwards
        if (activeAnomaly && activeAnomaly.includes(sensor.key)) {
          // Increase value to peak beyond absolute max or sink below min depending on fault
          delta = (sensor.max - currentVal) * 0.35 + (Math.random() * 5);
        }

        let nextVal = currentVal + delta;
        // Keep inside absolute boundary safety valves
        if (nextVal > sensor.max) nextVal = sensor.max - (Math.random() * 2);
        if (nextVal < sensor.min) nextVal = sensor.min + (Math.random() * 2);

        nextVal = Number(nextVal.toFixed(2));
        newValues[sensor.key] = nextVal;
        lastReadingsRef.current[sensor.key] = nextVal;

        // Check limits
        if (nextVal < sensor.nominalMin || nextVal > sensor.nominalMax) {
          isWarning = true;
        }
        if (nextVal < sensor.nominalMin - (sensor.nominalMin - sensor.min)*0.5 || 
            nextVal > sensor.nominalMax + (sensor.max - sensor.nominalMax)*0.5) {
          isCritical = true;
        }
      });

      const nextStatus = isCritical ? 'critical' : isWarning ? 'warning' : 'nominal';
      const reading: SensorReading = {
        timestamp: now.toISOString(),
        values: newValues,
        status: nextStatus
      };

      onNewReading(reading);

      // Periodically inject log if warning/critical
      if (Math.random() < 0.15 && nextStatus !== 'nominal') {
        const badSensor = metadata.sensors.find(s => 
          newValues[s.key] > s.nominalMax || newValues[s.key] < s.nominalMin
        );
        if (badSensor) {
          onInjectLog({
            id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: now.toISOString(),
            source: 'IoT',
            message: `Telemetry alert: ${badSensor.name} (${newValues[badSensor.key]} ${badSensor.unit}) departed soft threshold bounds.`,
            severity: nextStatus === 'critical' ? 'error' : 'warning'
          });
        }
      }

      setChartData(prev => {
        const next = [...prev, { ...newValues, timestamp: timestampLabel }];
        if (next.length > 18) next.shift();
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying, industry, activeAnomaly]);

  // Inject a manual mechanical/sensor level fault
  const injectFault = (sensorKey: string, faultType: string) => {
    setActiveAnomaly(sensorKey);
    const now = new Date();
    
    // Inject PLC sequence log
    onInjectLog({
      id: `SEQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toISOString(),
      source: 'PLC',
      message: `CRITICAL EXCEPTION TRIGGER: Automated fault injected on [${sensorKey}] -> ${faultType}. Interrupt sequence dispatched.`,
      severity: 'error'
    });

    onInjectLog({
      id: `ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toISOString(),
      source: 'Error Log',
      message: `PLC core thermal register warning. Feedback loop returned values outside physical range. Action requested.`,
      severity: 'error'
    });

    // Clear anomaly after 15 seconds automatically to restore cycle
    setTimeout(() => {
      setActiveAnomaly(null);
      onInjectLog({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: 'IoT',
        message: `Industrial diagnostic watchdog: Telemetry pipeline cooling / recovering to ambient boundaries.`,
        severity: 'info'
      });
    }, 15000);
  };

  // Check metrics formatting
  const getStatusBadgeColor = (status: 'nominal' | 'warning' | 'critical') => {
    if (status === 'critical') return 'bg-rose-50 text-rose-700 border border-rose-250';
    if (status === 'warning') return 'bg-amber-50 text-amber-700 border border-amber-250';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-250';
  };

  const getMetricValueColor = (val: number, nominalMin: number, nominalMax: number) => {
    if (val < nominalMin || val > nominalMax) {
      const dev = Math.abs(val - (val < nominalMin ? nominalMin : nominalMax));
      if (dev > (nominalMax - nominalMin) * 0.2) return 'text-rose-600 font-bold';
      return 'text-amber-600 font-semibold';
    }
    return 'text-blue-600';
  };

  const activeSensors = metadata.sensors;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
      {/* Stream controls panel */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-600 animate-pulse" />
          <h2 className="text-sm font-sans font-bold tracking-tight text-slate-800">
            Live Analog Sensor Telemetry <span className="text-xs text-slate-500 font-normal">({metadata.name})</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {activeAnomaly && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 animate-pulse">
              <Zap size={11} className="text-rose-600" />
              <span className="text-[10px] font-mono text-rose-600 uppercase tracking-widest font-semibold">SPIKE_INJECTED</span>
            </div>
          )}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
              isPlaying
                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause size={12} className="text-slate-500" />
                <span>Pause Feed</span>
              </>
            ) : (
              <>
                <Play size={12} className="text-emerald-650" />
                <span>Resume Waterfall</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Numerical meters cards */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/45 border-b border-slate-100">
        {activeSensors.map(sensor => {
          const currentVal = lastReadingsRef.current[sensor.key] ?? (sensor.nominalMin + sensor.nominalMax)/2;
          const nominalLabel = `${sensor.nominalMin}-${sensor.nominalMax} ${sensor.unit}`;
          return (
            <div key={sensor.key} className="bg-white border border-slate-200 rounded p-3 select-none flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-semibold text-slate-500 truncate uppercase tracking-wider">{sensor.name}</span>
                  {(currentVal < sensor.nominalMin || currentVal > sensor.nominalMax) && (
                    <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-mono tracking-tight font-bold ${getMetricValueColor(currentVal, sensor.nominalMin, sensor.nominalMax)}`}>
                    {currentVal.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{sensor.unit}</span>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>NOMINAL:</span>
                <span>{nominalLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ingress Waterfall Visualizations */}
      <div className="p-4 flex-1 min-h-[220px] flex flex-col justify-between">
        <div className="w-full h-[180px] bg-slate-50/50 rounded border border-slate-200 p-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {activeSensors.map((sensor, idx) => {
                  const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
                  const color = colors[idx % colors.length];
                  return (
                    <linearGradient key={sensor.key} id={`grad_${sensor.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0.0}/>
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={9} fontClassName="font-mono" />
              <YAxis stroke="#64748b" fontSize={9} fontClassName="font-mono" />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                labelClassName="text-[10px] text-slate-500 font-mono"
                itemStyle={{ fontSize: '11px', color: '#1e293b', fontFamily: 'monospace' }}
              />
              {activeSensors.map((sensor, idx) => {
                const colors = ['#2563eb', '#d97706', '#34d399', '#7c3aed'];
                const color = colors[idx % colors.length];
                return (
                  <Area
                    key={sensor.key}
                    type="monotone"
                    dataKey={sensor.key}
                    name={sensor.name}
                    stroke={color}
                    fill={`url(#grad_${sensor.key})`}
                    strokeWidth={1.5}
                    dot={false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Rapid inject module */}
        <div className="mt-4 pt-3.5 border-t border-slate-150">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap size={14} className="text-amber-500" />
            <span className="text-[11px] font-sans text-slate-500 uppercase tracking-wider font-bold">FAULT INJECTION CONTROL (PLC FAULT SEEDS)</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {activeSensors.map(sensor => {
              const faultLabel = sensor.key === 'spindleTemp' || sensor.key === 'jointTemp' || sensor.key === 'transformerTemp' || sensor.key === 'gearboxTemp'
                ? 'OVERHEAT'
                : sensor.key === 'vibration' || sensor.key === 'fanVibration' || sensor.key === 'acousticEmissions'
                ? 'RESONANCE'
                : 'SPIKE_LOAD';
              const isTrig = activeAnomaly === sensor.key;

              return (
                <button
                  key={sensor.key}
                  onClick={() => injectFault(sensor.key, faultLabel)}
                  disabled={!!activeAnomaly}
                  className={`py-2 px-2.5 rounded border text-[10px] font-mono tracking-wider text-left transition flex justify-between items-center cursor-pointer ${
                    isTrig
                      ? 'bg-red-50 border-red-300 text-red-700 font-semibold animate-pulse'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none'
                  }`}
                >
                  <div className="truncate pr-1">
                    <span>{sensor.name}</span>
                  </div>
                  <span className={`shrink-0 text-[9px] px-1 py-0.5 rounded ${isTrig ? 'bg-red-650 text-white font-semibold' : 'bg-slate-50 text-slate-500'}`}>
                    {faultLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
