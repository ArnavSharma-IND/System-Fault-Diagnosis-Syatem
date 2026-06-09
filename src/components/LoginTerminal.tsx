import React, { useState } from 'react';
import { Operator, IndustryType, INDUSTRIES } from '../types';
import { ShieldCheck, Activity, Terminal, Cpu } from 'lucide-react';

interface LoginTerminalProps {
  onLogin: (operator: Operator, industry: IndustryType) => void;
}

export default function LoginTerminal({ onLogin }: LoginTerminalProps) {
  const [operatorName, setOperatorName] = useState('Arnav Sharma');
  const [employeeId, setEmployeeId] = useState('OP-9051-A');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('manufacturing');
  const [workstation, setWorkstation] = useState('CELL-43-GRID');
  const [shift, setShift] = useState<'Day (06:00 - 14:00)' | 'Swing (14:00 - 22:00)' | 'Night (22:00 - 06:00)'>('Day (06:00 - 14:00)');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim() || !employeeId.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      onLogin({
        id: employeeId,
        name: operatorName,
        role: 'Chief Operations Engineer',
        workstationId: workstation,
        shiftType: shift,
        activeSince: new Date().toISOString()
      }, selectedIndustry);
      setSubmitting(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Decorative backdrop shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Corporate terminal border */}
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl relative overflow-hidden">
        {/* Top active status bar */}
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-mono text-blue-400 tracking-wider font-semibold">SYSTEM SENTINEL ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
            <Terminal size={14} className="text-blue-400" />
            <span>UTC_MONITOR_v1.4.2</span>
          </div>
        </div>

        {/* Console head */}
        <div className="p-6 text-center border-b border-slate-100">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4 text-blue-600 shadow-sm">
            <Cpu size={28} className="animate-spin-slow" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-1.5">SENTINEL DIAGNOSTIC CORE</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Industrial Fault Analytics, Predictive Telemetry, & Live PLC Sequence Auditing
          </p>
        </div>

        {/* Logic credentials form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Operator Name</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 hover:border-slate-300 text-slate-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                placeholder="OP-XXXX"
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 hover:border-slate-300 text-slate-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target Division (Industry Sector)</label>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(INDUSTRIES).map((ind) => (
                <button
                  type="button"
                  key={ind.id}
                  onClick={() => setSelectedIndustry(ind.id)}
                  className={`w-full text-left p-2.5 rounded-md border text-xs font-medium transition flex items-center justify-between ${
                    selectedIndustry === ind.id
                      ? 'bg-blue-50/70 border-blue-500 text-blue-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedIndustry === ind.id ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    <span>{ind.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{ind.logPrefix}-PLCS</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Designated Workstation</label>
              <select
                value={workstation}
                onChange={(e) => setWorkstation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 hover:border-slate-300 text-slate-700 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition font-medium"
              >
                <option value="CELL-43-GRID">CELL-43-GRID (Primary)</option>
                <option value="TERMINAL-6-FEED">TERMINAL-6-FEED (Core)</option>
                <option value="ANALYTICS-X11">ANALYTICS-X11 (Auxiliary)</option>
                <option value="PORTAL-BAY-B2">PORTAL-BAY-B2 (Assembly)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Shift Session Type</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 hover:border-slate-300 text-slate-700 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition font-medium"
              >
                <option value="Day (06:00 - 14:00)">Day (06:00 - 14:00)</option>
                <option value="Swing (14:00 - 22:00)">Swing (14:00 - 22:00)</option>
                <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-xs uppercase tracking-wider py-3 px-4 rounded-md shadow-sm transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Activity size={16} className="animate-pulse" />
                  <span>NEGOTIATING CRYPTO GATEWAY...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>INITIALIZE WORKSTATION MONITOR</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security disclaimer footer */}
        <div className="bg-slate-50 border-t border-slate-150 px-6 py-3.5 text-[10px] text-slate-500 text-center font-mono select-none">
          SECURE ENCRYPTED NODE. UNAUTHORIZED INTERFERENCE DETECTED VIA LOCAL CONTAINER POLICY WILL LOG PORTAL DISCONNECTION.
        </div>
      </div>
    </div>
  );
}
