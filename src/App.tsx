import React, { useState, useEffect } from 'react';
import { Operator, IndustryType, SensorReading, LogEntry, DiagnosticReport, INDUSTRIES } from './types';
import LoginTerminal from './components/LoginTerminal';
import SensorStream from './components/SensorStream';
import LogIngestor from './components/LogIngestor';
import FaultReportView from './components/FaultReportView';
import AiChatAssistant from './components/AiChatAssistant';
import { LogOut, LayoutGrid, AlertOctagon, RefreshCw, Terminal, Clock, ShieldCheck, ChevronRight } from 'lucide-react';

export default function App() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<IndustryType>('manufacturing');
  const [activeReading, setActiveReading] = useState<SensorReading | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [latestReport, setLatestReport] = useState<DiagnosticReport | null>(null);
  const [reportHistory, setReportHistory] = useState<DiagnosticReport[]>([]);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Clock updates tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.getUTCFullYear() + '-' + 
        String(now.getUTCMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getUTCDate()).padStart(2, '0') + ' ' + 
        String(now.getUTCHours()).padStart(2, '0') + ':' + 
        String(now.getUTCMinutes()).padStart(2, '0') + ':' + 
        String(now.getUTCSeconds()).padStart(2, '0') + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set default nominal log on login or industry switch
  useEffect(() => {
    if (!operator) return;

    const metadata = INDUSTRIES[activeIndustry];
    const initialLogs: LogEntry[] = [
      {
        id: `SYS-INIT-${Date.now()}-1`,
        timestamp: new Date(Date.now() - 30000).toISOString(),
        source: 'SCADA',
        message: `${metadata.logPrefix} Core processor successfully initialized. Handshake verified.`,
        severity: 'info'
      },
      {
        id: `SYS-INIT-${Date.now()}-2`,
        timestamp: new Date().toISOString(),
        source: 'SCADA',
        message: `Operator Checked In: ${operator.name} (ID: ${operator.id}). Active workstation cell linked.`,
        severity: 'info'
      }
    ];
    setLogs(initialLogs);
    setLatestReport(null);
  }, [operator, activeIndustry]);

  const handleLogin = (operatorProfile: Operator, targetIndustry: IndustryType) => {
    setOperator(operatorProfile);
    setActiveIndustry(targetIndustry);
  };

  const handleLogInject = (log: LogEntry) => {
    setLogs(prev => [...prev, log]);
  };

  const handleNewReading = (reading: SensorReading) => {
    setActiveReading(reading);
  };

  const handleCSVUpload = (parsedLogs: LogEntry[], externalSensors?: Record<string, number>) => {
    setLogs(prev => [...prev, ...parsedLogs]);
    if (externalSensors && activeReading) {
      setActiveReading(prev => prev ? {
        ...prev,
        values: {
          ...prev.values,
          ...externalSensors
        }
      } : {
        timestamp: new Date().toISOString(),
        values: externalSensors,
        status: 'nominal'
      });
    }
  };

  // Run structured evaluation via API
  const handleExecuteDiagnosis = async () => {
    if (!activeReading) return;

    setLoadingDiagnosis(true);
    try {
      // Gather up to last 15 relevant logs for analysis
      const logsSlice = logs.slice(-15).map(l => ({
        timestamp: l.timestamp,
        source: l.source,
        message: l.message,
        severity: l.severity
      }));

      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: activeIndustry,
          sensors: activeReading.values,
          logs: logsSlice
        })
      });

      if (!response.ok) {
        throw new Error("Local AI node returned invalid frame. Please verify container state.");
      }

      const rawReport = await response.json();
      
      const detailedReport: DiagnosticReport = {
        ...rawReport,
        id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        industry: activeIndustry,
        sensorSnapshot: activeReading.values,
        logsAnalyzed: logsSlice.map(l => l.message)
      };

      setLatestReport(detailedReport);
      setReportHistory(prev => [detailedReport, ...prev]);

      // Inject system log confirming audit receipt
      handleLogInject({
        id: `SYS-REP-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: 'SCADA',
        message: `AUDIT COMPLETED. State classified: ${detailedReport.failureCategory}. Risk severity assessed as [${detailedReport.riskAssessment}].`,
        severity: detailedReport.faultDetected ? 'warning' : 'info'
      });

    } catch (err: any) {
      console.error(err);
      handleLogInject({
        id: `SYS-ERR-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: 'Error Log',
        message: `SYSTEM AUDIT EXCEPTION: ${err?.message || "Communication with diagnostic server timed out."}`,
        severity: 'error'
      });
    } finally {
      setLoadingDiagnosis(false);
    }
  };

  const handleLogout = () => {
    setOperator(null);
    setLatestReport(null);
    setReportHistory([]);
    setActiveReading(null);
    setLogs([]);
  };

  if (!operator) {
    return <LoginTerminal onLogin={handleLogin} />;
  }

  const currentMetadata = INDUSTRIES[activeIndustry];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-500/20 antialiased select-none">
      {/* Upper SCADA status line */}
      <div className="bg-slate-900 text-[10px] text-slate-350 font-mono flex flex-wrap items-center justify-between px-6 py-2 gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold tracking-wider text-emerald-400 uppercase">SYS_NODE_OK</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase">OPERATOR:</span>{' '}
            <span className="text-white font-semibold uppercase">{operator.name} [{operator.id}]</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase">WORKSTATION:</span>{' '}
            <span className="text-white font-semibold">{operator.workstationId}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-medium">SHIFT_MODE:</span>{' '}
            <span className="text-white uppercase font-semibold">{operator.shiftType}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            <span>{currentTime}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 p-0.5 px-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 font-mono text-[9px] transition cursor-pointer"
          >
            <LogOut size={10} />
            <span>EXIT STATION</span>
          </button>
        </div>
      </div>

      {/* Main SCADA Banner and Industry Select */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 shadow-sm">
            <LayoutGrid size={20} />
          </div>
          <div className="text-left">
            <h1 className="text-base font-bold tracking-tight text-slate-900 uppercase font-sans">SMART FAULT DIAGNOSIS CENTER</h1>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              DIVISIONAL CONTROL CONSOLE &bull; {currentMetadata.name}
            </p>
          </div>
        </div>

        {/* Division Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto font-sans text-xs select-none">
          <span className="text-slate-450 text-[10px] tracking-wider uppercase font-bold hidden lg:inline">SECTOR:</span>
          <select
            value={activeIndustry}
            onChange={(e) => setActiveIndustry(e.target.value as IndustryType)}
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-md px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/15 text-xs font-semibold uppercase tracking-wider transition cursor-pointer shrink-0"
          >
            {Object.values(INDUSTRIES).map(ind => (
              <option key={ind.id} value={ind.id} className="bg-white text-slate-700">
                {ind.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Extreme System Warnings Notification */}
      {latestReport?.faultDetected && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 border-l-4 border-l-rose-600 flex items-center justify-between text-left animate-slide-down shadow-xs">
          <div className="flex items-center gap-3">
            <AlertOctagon className="text-rose-650 animate-bounce shrink-0" size={18} />
            <div>
              <p className="text-xs font-sans font-bold text-rose-700 uppercase tracking-wider leading-none">ACTIVE FAULT SEQUENCE IDENTIFIED</p>
              <p className="text-[11px] font-sans text-slate-600 mt-1.5">
                Anomaly categorized as <span className="font-bold text-slate-800">[{latestReport.failureCategory}]</span>. Safety risk assessed as <span className="p-0.5 px-1.5 bg-rose-100 rounded font-bold text-rose-750 uppercase text-[10px]">{latestReport.riskAssessment}</span>. Consult recommended repair guidelines in the right desk partition.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Bento Layout Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start max-w-7xl w-full mx-auto bg-slate-50">
        
        {/* Left Side: Real-time telemetry monitoring + logs ingestion */}
        <div className="xl:col-span-6 space-y-6 flex flex-col h-full justify-between">
          <div className="flex-1">
            <SensorStream
              industry={activeIndustry}
              onNewReading={handleNewReading}
              onInjectLog={handleLogInject}
              activeReading={activeReading}
            />
          </div>
          <div className="flex-1">
            <LogIngestor
              industry={activeIndustry}
              logs={logs}
              onUploadCSVLogs={handleCSVUpload}
              onClearLogs={() => setLogs([])}
              onInjectLog={handleLogInject}
            />
          </div>
        </div>

        {/* Right Side: Diagnostic Audit + AI Troubleshooting Chatbot */}
        <div className="xl:col-span-6 space-y-6 flex flex-col h-full justify-between">
          <div className="flex-1">
            <FaultReportView
              activeReport={latestReport}
              onRunDiagnosis={handleExecuteDiagnosis}
              loading={loadingDiagnosis}
              activeReading={activeReading}
            />
          </div>
          
          <div className="flex-1">
            <AiChatAssistant
              industry={activeIndustry}
              activeReading={activeReading}
              activeReport={latestReport}
            />
          </div>
        </div>
      </main>

      {/* Control Room Incident Vault Table (Historical sequence log) */}
      {reportHistory.length > 0 && (
        <section className="bg-white border-t border-slate-200 p-6 max-w-7xl w-full mx-auto text-left shadow-xs rounded-xl mt-4 mb-8">
          <div className="flex items-center gap-1.5 mb-4 select-none">
            <Terminal size={14} className="text-slate-400" />
            <span className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider">HISTORICAL INCIDENT DEVIANT VAULT ({reportHistory.length})</span>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4">Time Handshake</th>
                  <th className="py-2.5 px-4">Anomaly Class</th>
                  <th className="py-2.5 px-4 text-center">Confidence</th>
                  <th className="py-2.5 px-4 text-center">Safety Level</th>
                  <th className="py-2.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-700 font-medium">
                {reportHistory.map((report, idx) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 text-slate-400 font-normal">{new Date(report.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-bold">{report.failureCategory}</td>
                    <td className="py-2.5 px-4 text-center text-blue-600 font-bold">{report.probabilityScore}%</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        report.riskAssessment === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        report.riskAssessment === 'High' ? 'bg-amber-50 text-amber-500 border-amber-200' :
                        report.riskAssessment === 'Medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {report.riskAssessment}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => setLatestReport(report)}
                        className="text-blue-600 hover:text-blue-700 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>RESTORE</span>
                        <ChevronRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sticky dashboard metrics footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 text-[10px] text-slate-400 font-mono py-4 text-center select-none">
        <p className="max-w-2xl mx-auto px-4 leading-normal uppercase tracking-wider">
          Smart Fault Diagnosis Gateway &bull; Powered by Sentinel AI core diagnostics &bull; Node: {activeIndustry.toUpperCase()}-ANALYTICS-CELL-43
        </p>
      </footer>
    </div>
  );
}
