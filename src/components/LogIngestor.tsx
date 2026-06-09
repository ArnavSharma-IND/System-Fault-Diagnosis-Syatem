import React, { useRef, useState } from 'react';
import { LogEntry, IndustryType, INDUSTRIES } from '../types';
import { Upload, FileText, Trash2, Sliders, PlayCircle, Eye, Download } from 'lucide-react';

interface LogIngestorProps {
  industry: IndustryType;
  logs: LogEntry[];
  onUploadCSVLogs: (parsedLogs: LogEntry[], externalSensors?: Record<string, number>) => void;
  onClearLogs: () => void;
  onInjectLog: (log: LogEntry) => void;
}

export default function LogIngestor({ industry, logs, onUploadCSVLogs, onClearLogs, onInjectLog }: LogIngestorProps) {
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const metadata = INDUSTRIES[industry];

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process raw text CSV lines
  const parseCSVContent = (text: string, filename: string) => {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert("The submitted CSV does not contain sufficient columns or headers.");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const parsedLogs: LogEntry[] = [];
      let latestTelemetrySnapshot: Record<string, number> = {};

      // Parse up to 10 latest record indices
      const dataLines = lines.slice(1).slice(-10);
      dataLines.forEach((line, index) => {
        const columns = line.split(',').map(c => c.trim());
        
        // Match standard sensor metrics nicely if they are mapped in CSV headers
        metadata.sensors.forEach(sensor => {
          const sIdx = headers.indexOf(sensor.key.toLowerCase());
          if (sIdx !== -1 && columns[sIdx]) {
            const val = parseFloat(columns[sIdx]);
            if (!isNaN(val)) {
              latestTelemetrySnapshot[sensor.key] = val;
            }
          }
        });

        // Search messages column or generate one
        const msgIdx = headers.indexOf('message');
        const severityIdx = headers.indexOf('severity');
        const sourceIdx = headers.indexOf('source');

        const message = msgIdx !== -1 && columns[msgIdx] 
          ? columns[msgIdx] 
          : `Sensor Register verification for row index ${index + 1}: ${metadata.sensors.map(s => `${s.name}=${latestTelemetrySnapshot[s.key] ?? 'N/A'}`).join(', ')}`;
        
        const severityRaw = severityIdx !== -1 && columns[severityIdx] ? columns[severityIdx].toLowerCase() : 'info';
        const severity: 'info' | 'warning' | 'error' = severityRaw.includes('error') || severityRaw.includes('crit') 
          ? 'error' 
          : severityRaw.includes('warn') ? 'warning' : 'info';

        const source = sourceIdx !== -1 && columns[sourceIdx] ? columns[sourceIdx] as any : 'CSV';

        parsedLogs.push({
          id: `CSV-${Date.now()}-${index}-${Math.floor(Math.random() * 100)}`,
          timestamp: new Date(Date.now() - (dataLines.length - index) * 60000).toISOString(),
          source: source,
          message: message,
          severity: severity
        });
      });

      onUploadCSVLogs(parsedLogs, Object.keys(latestTelemetrySnapshot).length > 0 ? latestTelemetrySnapshot : undefined);
      setSelectedFile(filename);

      onInjectLog({
        id: `SYS-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: 'SCADA',
        message: `Hale telemetry load: Succeeded parsing static record register CSV [${filename}]. ${parsedLogs.length} historical registers ingested into active window.`,
        severity: 'info'
      });
    } catch (err) {
      console.error(err);
      alert("Error occurred while parsing the CSV. Ensure headers match the target metrics or contains standard text registers.");
    }
  };

  // File change handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseCSVContent(event.target.result as string, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseCSVContent(event.target.result as string, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  // Generate an automated SCADA operational command sequence
  const executeScadaSequence = () => {
    const steps = [
      { msg: 'Inbound sequence initiation. Watchdog registers check initiated.', sev: 'info' as const },
      { msg: 'Calibrating joint servos feedback registers A-14 & A-15.', sev: 'info' as const },
      { msg: 'WARNING: Harmonic feed variance outside recommended boundaries (+4.2%).', sev: 'warning' as const },
      { msg: 'Dispatched automated balancing damping capacitor bank to active terminals.', sev: 'info' as const },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        onInjectLog({
          id: `SCADA-${Date.now()}-${index}`,
          timestamp: new Date(Date.now() + index * 400).toISOString(),
          source: 'SCADA',
          message: `${metadata.logPrefix} Sequence Step ${index + 1}: ${step.msg}`,
          severity: step.sev
        });
      }, index * 800);
    });
  };

  // Create mock CSV content template
  const downloadSampleTemplate = () => {
    const sensors = metadata.sensors;
    const headerRow = `Index,Severity,Source,Message,${sensors.map(s => s.key).join(',')}`;
    // Construct nominal sample rows and one faulty row
    const row1 = `1,info,PLC,"Register sequence stable",${sensors.map(s => ((s.nominalMin + s.nominalMax) / 2).toFixed(1)).join(',')}`;
    const row2 = `2,warning,PLC,"Spindle thermal threshold approaching peak alert",${sensors.map(s => (s.nominalMax + (s.max - s.nominalMax)*0.2).toFixed(1)).join(',')}`;
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(`${headerRow}\n${row1}\n${row2}`);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `diagnostics_${industry}_telemetry.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.severity === filter;
  });

  const getSeverityBadge = (severity: 'info' | 'warning' | 'error') => {
    if (severity === 'error') return 'text-rose-700 bg-rose-50 border border-rose-200';
    if (severity === 'warning') return 'text-amber-700 bg-amber-50 border border-amber-200';
    return 'text-slate-600 bg-slate-100 border border-slate-200';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
          <h2 className="text-sm font-sans font-bold tracking-tight text-slate-800">
            Ingestion Channel <span className="text-xs text-slate-500 font-normal">(Logs & Telemetry Files)</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadSampleTemplate}
            className="p-1.5 px-3 rounded bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-[11px] font-semibold flex items-center gap-1.5 transition border border-slate-200 shadow-sm cursor-pointer"
            title="Download Custom CSV Import Template"
          >
            <Download size={11} />
            <span>Get Sample CSV</span>
          </button>
          <button
            onClick={executeScadaSequence}
            className="p-1.5 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <PlayCircle size={11} />
            <span>Trigger PLC Seq</span>
          </button>
        </div>
      </div>

      {/* CSV File Drop Area */}
      <div className="p-4 bg-slate-50/30 border-b border-slate-150">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-lg p-5 text-center cursor-pointer transition duration-150 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50/30' 
              : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="mx-auto text-slate-400 mb-2" size={24} />
          <p className="text-xs font-sans font-bold text-slate-700">
            DRAG & DROP SENSOR REPORT CSV FILE
          </p>
          <p className="text-[10px] text-slate-400 font-sans mt-1">
            Accepts standard columns: values for metric tags, alerts, time ticks
          </p>
          {selectedFile && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded border border-blue-200">
              <Eye size={12} />
              <span>Active Ingestion: {selectedFile}</span>
            </div>
          )}
        </div>
      </div>

      {/* Logs Filters */}
      <div className="p-4 py-2 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['all', 'info', 'warning', 'error'] as const).map(lev => (
            <button
              key={lev}
              onClick={() => setFilter(lev)}
              className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold uppercase tracking-wider transition cursor-pointer ${
                filter === lev
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {lev} ({lev === 'all' ? logs.length : logs.filter(l => l.severity === lev).length})
            </button>
          ))}
        </div>
        <button
          onClick={onClearLogs}
          className="text-slate-400 hover:text-rose-650 p-1 rounded transition flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
          title="Flush Logs Table"
        >
          <Trash2 size={12} />
          <span>FLUSH LOGS</span>
        </button>
      </div>

      {/* System logs table */}
      <div className="flex-1 overflow-y-auto p-3 max-h-[350px] space-y-2 font-mono scrollbar-thin">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1.5 py-12 select-none">
            <Sliders size={20} className="stroke-1 opacity-40 animate-pulse text-slate-400" />
            <p className="text-[11px] font-sans font-semibold tracking-wide">NO CHANNEL EVENTS REGISTERED</p>
            <p className="text-[9px] font-sans text-slate-400">Awaiting telemetry stream inputs or CSV register dumps</p>
          </div>
        ) : (
          filteredLogs.slice().reverse().map(log => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={log.id} className="text-[11px] leading-relaxed p-2.5 bg-slate-50/60 rounded border border-slate-205/65 hover:border-slate-300 flex items-start justify-between gap-3 select-text transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-slate-450 font-semibold text-[10px]">{timeStr}</span>
                    <span className="text-blue-600 font-bold text-[9px] uppercase tracking-wider">[{log.source}]</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold transition ${getSeverityBadge(log.severity)}`}>
                      {log.severity}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium break-words">{log.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
