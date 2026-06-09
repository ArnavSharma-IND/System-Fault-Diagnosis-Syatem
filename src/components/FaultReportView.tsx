import React, { useState } from 'react';
import { DiagnosticReport, SensorReading, LogEntry, IndustryType } from '../types';
import { ShieldCheck, ShieldAlert, Cpu, CheckSquare, Zap, Clock, ClipboardList, AlertOctagon, Heart } from 'lucide-react';

interface FaultReportViewProps {
  activeReport: DiagnosticReport | null;
  onRunDiagnosis: () => void;
  loading: boolean;
  activeReading: SensorReading | null;
}

export default function FaultReportView({ activeReport, onRunDiagnosis, loading, activeReading }: FaultReportViewProps) {
  const [completedFixes, setCompletedFixes] = useState<Record<string, boolean>>({});

  const toggleFix = (index: number) => {
    setCompletedFixes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getRiskColor = (risk: 'Low' | 'Medium' | 'High' | 'Critical') => {
    switch (risk) {
      case 'Critical': return 'bg-red-50 text-red-700 border border-red-200';
      case 'High': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Medium': return 'bg-yellow-50 text-yellow-700 border border-yellow-250';
      default: return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
      {/* View Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-blue-600" />
          <h2 className="text-sm font-sans font-bold tracking-tight text-slate-800 text-left">
            AI Workstation Diagnostic Audit
          </h2>
        </div>
        <button
          onClick={onRunDiagnosis}
          disabled={loading || !activeReading}
          className={`py-1.5 px-4 rounded text-xs font-semibold tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
            loading 
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-blue-650 cursor-pointer'
          }`}
        >
          {loading ? (
            <>
              <Cpu className="animate-spin text-blue-500" size={13} />
              <span>RUNNING INTERPOLATION AUDIT...</span>
            </>
          ) : (
            <>
              <Zap size={13} />
              <span>Execute Diagnostic Audit</span>
            </>
          )}
        </button>
      </div>

      {/* Main Diagnosis Feed */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[500px]">
        {!activeReport ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-16 text-center select-none">
            <ShieldCheck size={32} className="stroke-1 text-slate-350 opacity-60 animate-pulse" />
            <p className="text-xs font-sans font-bold text-slate-700 tracking-wider">AWAITING SYSTEM AUDIT INITIATION</p>
            <p className="text-[10px] text-slate-400 font-sans max-w-sm mx-auto leading-relaxed">
              Initiate diagnostic audit to send active telemetry snapshots and PLC sequence logs to the Sentinel AI diagnostic core.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            {/* Fault general status card */}
            <div className={`p-4 rounded-lg flex items-start gap-4 border ${
              activeReport.faultDetected 
                ? 'bg-rose-50 border-rose-200' 
                : 'bg-emerald-50 border-emerald-205'
            }`}>
              <div className={`p-2.5 rounded-md ${
                activeReport.faultDetected ? 'bg-rose-100 text-rose-750' : 'bg-emerald-100 text-emerald-750'
              }`}>
                {activeReport.faultDetected ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
              </div>
              
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-450">
                    AUDIT REPORT #{activeReport.id.split('-')[1] || activeReport.id.substring(0, 5)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(activeReport.timestamp).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 mt-1">
                  {activeReport.failureCategory}
                </h3>
                <div className="text-xs text-slate-700 mt-2 font-mono leading-relaxed bg-white p-3 rounded border border-slate-200 shadow-sm select-text">
                  <strong className="text-blue-600 block mb-1 font-sans font-bold text-[11px] uppercase tracking-wider">AI ROOT CAUSE IDENTIFICATION:</strong>
                  {activeReport.rootCause}
                </div>
              </div>
            </div>

            {/* Metrics parameters grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between text-left shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">FAULT CLASSIFICATION</span>
                <span className="text-xs font-semibold text-slate-750 mt-1 break-words">
                  {activeReport.faultDetected ? activeReport.failureCategory : 'Nominal Core System'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between text-left shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">PROBABILITY RATING</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-mono font-bold text-blue-605">{activeReport.probabilityScore}%</span>
                  <span className="text-[10px] text-slate-450 font-sans font-semibold">Confidence</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between text-left shadow-sm col-span-2 lg:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">RISK RATING</span>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block leading-tight border ${getRiskColor(activeReport.riskAssessment)}`}>
                    {activeReport.riskAssessment} LEVEL
                  </span>
                </div>
              </div>
            </div>

            {/* Progressive Repairs checklist */}
            {activeReport.suggestedFixes && activeReport.suggestedFixes.length > 0 && (
              <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-200 text-left shadow-xs">
                <div className="flex items-center gap-1.5 mb-3">
                  <CheckSquare size={14} className="text-blue-600" />
                  <span className="text-[11px] font-sans text-slate-500 uppercase tracking-wider font-extrabold">TROUBLESHOOTING REPAIR CHECKLIST</span>
                </div>
                <div className="space-y-2">
                  {activeReport.suggestedFixes.map((fix, idx) => {
                    const isDone = !!completedFixes[idx];
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleFix(idx)}
                        className={`w-full p-2.5 rounded text-xs font-semibold text-left border transition flex items-center gap-3 cursor-pointer ${
                          isDone 
                            ? 'bg-emerald-50 border-emerald-200 text-slate-400 line-through decoration-slate-300' 
                            : 'bg-white border-slate-200 hover:border-slate-350 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          readOnly
                          className="rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-200"
                        />
                        <span>{fix}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Predictive / preventive action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-start gap-3 shadow-xs">
                <Heart size={16} className="text-emerald-505 mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <span className="text-[10px] font-sans text-slate-400 font-bold uppercase tracking-wider block">PREVENTIVE ACTION PLAN</span>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {activeReport.preventiveAction}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-start gap-3 shadow-xs">
                <Clock size={16} className="text-amber-505 mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <span className="text-[10px] font-sans text-slate-400 font-bold uppercase tracking-wider block">SCHEDULED TIMEFRAME</span>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {activeReport.maintenanceSchedule}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
