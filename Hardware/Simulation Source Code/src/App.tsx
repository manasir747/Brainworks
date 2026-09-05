import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Activity, MonitorSmartphone } from 'lucide-react';
import { useSimulation } from './hooks/useSimulation';
import MineMap from './components/MineMap';

function App() {
  const sim = useSimulation();
  const { state, setState, togglePlay, reset, setSpeed, loadScenario, addVehicle, removeVehicle, addObstacle } = sim;
  
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  // Audio for buzzer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<number | null>(null);
  const beepTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    // Play beep when ANY hazard condition occurs
    const hasHazard = state.vehicles.some(v => 
      v.risk === 'WARNING' || 
      v.risk === 'CRITICAL' || 
      v.movementState === 'STOPPED'
    );
    
    if (hasHazard && state.isPlaying && alertsEnabled) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (!audioIntervalRef.current) {
        const playBeep = (freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.08) => {
            if (!alertsEnabled || !audioCtxRef.current) return;
            try {
                let osc = ctx.createOscillator();
                let gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(vol, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + duration);
            } catch(e){}
        };

        const playSequence = () => {
          beepTimeoutsRef.current.forEach(clearTimeout);
          beepTimeoutsRef.current = [];

          // Beep 1
          playBeep(900, 0.15, 'square', 0.1);
          
          // Beep 2 (150ms beep + 150ms gap = 300ms)
          const t1 = window.setTimeout(() => playBeep(900, 0.15, 'square', 0.1), 300);
          
          // Beep 3 (300ms + 150ms beep + 150ms gap = 600ms)
          const t2 = window.setTimeout(() => playBeep(900, 0.15, 'square', 0.1), 600);
          
          beepTimeoutsRef.current.push(t1, t2);
        };

        playSequence(); 
        // 600ms + 150ms (last beep) + 1000ms pause = 1750ms
        audioIntervalRef.current = window.setInterval(playSequence, 1750);
      }
    } else {
      if (audioIntervalRef.current) {
        window.clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      beepTimeoutsRef.current.forEach(clearTimeout);
      beepTimeoutsRef.current = [];
    }
    
    return () => {
      if (audioIntervalRef.current) {
        window.clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
      beepTimeoutsRef.current.forEach(clearTimeout);
      beepTimeoutsRef.current = [];
    };
  }, [state.vehicles, state.isPlaying, alertsEnabled]);

  const selectedVehicle = state.vehicles.find(v => v.id === state.selectedVehicleId);

  // Helper to map risk level to terminal display
  const riskLabel = (risk: string) => {
    switch (risk) {
      case 'SAFE':     return { text: 'SAFE',     cls: 'text-success' };
      case 'CAUTION':  return { text: 'CAUTION',  cls: 'text-caution' };
      case 'WARNING':  return { text: 'WARNING',  cls: 'text-warning' };
      case 'CRITICAL': return { text: '⚠ CRITICAL', cls: 'text-critical animate-pulse' };
      default:         return { text: risk,        cls: 'text-gray-400' };
    }
  };

  const sensorStatus = (active: boolean) =>
    active
      ? <span className="text-success">ONLINE</span>
      : <span className="text-critical animate-pulse">FAULT</span>;

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-gray-200 font-sans">
      {/* Top Bar — compact */}
      <header className="flex justify-between items-center px-4 py-2 bg-[#0d0d0d] border-b border-[#1e1e1e] shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="text-primary w-5 h-5" />
          <div>
            <h1 className="text-base font-bold tracking-wider text-white leading-none">BRAINWORKS</h1>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest">Mine Vehicle Safety Simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] bg-[#1a1a1a] px-2 py-0.5 rounded text-gray-500 border border-[#2a2a2a]">SIMULATION • PROOF OF CONCEPT</div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${state.systemStatus.network ? 'bg-success' : 'bg-critical'}`} />
            <span className="text-xs font-semibold font-mono">
              {state.systemStatus.network ? 'SYS_NORMAL' : 'NET_OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* ── LEFT SIDEBAR — compact controls ── */}
        <aside className="w-44 bg-[#0d0d0d] border-r border-[#1e1e1e] p-3 flex flex-col gap-4 overflow-y-auto shrink-0">
          
          {/* Playback Controls */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Controls</h2>
            <div className="flex gap-1.5">
              <button onClick={togglePlay} className="flex-1 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] p-1.5 rounded flex justify-center items-center transition-colors">
                {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-success" />}
              </button>
              <button onClick={reset} className="flex-1 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] p-1.5 rounded flex justify-center items-center transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed */}
            <div className="flex gap-0.5 text-[10px] bg-[#1a1a1a] p-0.5 rounded border border-[#2a2a2a]">
              {[0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-0.5 rounded transition-colors ${state.speedMultiplier === s ? 'bg-[#2e2e2e] text-white' : 'text-gray-600 hover:text-gray-400'}`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Alerts toggle */}
            <button
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className="flex justify-between items-center bg-[#1a1a1a] px-2 py-1 rounded border border-[#2a2a2a] hover:bg-[#222] transition-colors w-full text-left"
            >
              <span className="text-[10px] font-bold text-gray-600 uppercase">Alerts</span>
              <span className="text-xs">{alertsEnabled ? '🔊' : '🔇'}</span>
            </button>
          </div>

          {/* Spawn Controls */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Spawn</h2>
            <div className="flex justify-between items-center bg-[#1a1a1a] px-2 py-1 rounded border border-[#2a2a2a]">
              <span className="text-[10px] text-gray-500">{state.vehicles.length} VEHICLE{state.vehicles.length !== 1 ? 'S' : ''}</span>
              <button
                onClick={addVehicle}
                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-[10px] font-bold px-2 py-0.5 rounded transition-colors"
              >
                + ADD
              </button>
            </div>
            <button
              onClick={() => addObstacle('ROCKFALL')}
              className="bg-critical/10 hover:bg-critical/20 text-critical border border-critical/40 text-[10px] font-bold py-1 rounded transition-colors"
            >
              + ROCKFALL
            </button>
            <button
              onClick={() => addObstacle('EQUIPMENT')}
              className="bg-caution/10 hover:bg-caution/20 text-caution border border-caution/40 text-[10px] font-bold py-1 rounded transition-colors"
            >
              + OBSTACLE
            </button>
          </div>

          {/* Scenarios */}
          <div className="flex flex-col gap-1">
            <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Scenarios</h2>
            {[
              { id: 'blind-corner', label: 'Blind Corner' },
              { id: 'rockfall',     label: 'Rockfall' },
              { id: 'lora-failure', label: 'LoRa Failure' },
            ].map(sc => (
              <button
                key={sc.id}
                onClick={() => loadScenario(sc.id)}
                className="text-left px-2 py-1 bg-[#1a1a1a] hover:bg-[#232323] rounded text-[10px] transition-colors border border-[#2a2a2a] text-gray-400 hover:text-gray-200"
              >
                › {sc.label}
              </button>
            ))}
          </div>

          {/* Fault Injection */}
          <div className="flex flex-col gap-2 mt-auto">
            <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Fault Injection</h2>
            {Object.entries(state.systemStatus).map(([key, val]) => (
              <label key={key} className="flex items-center justify-between text-[10px] cursor-pointer group">
                <span className="uppercase text-gray-500 group-hover:text-gray-300 font-mono">{key}</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${val ? 'bg-success/25' : 'bg-critical/25'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${val ? 'bg-success translate-x-4' : 'bg-critical translate-x-0.5'}`} />
                </div>
                <input type="checkbox" className="hidden" checked={val} onChange={() => setState(s => ({ ...s, systemStatus: { ...s.systemStatus, [key]: !val } }))} />
              </label>
            ))}
          </div>
        </aside>

        {/* ── CENTER — Simulation Canvas (dominant) ── */}
        <section className="flex-1 p-2 flex flex-col min-w-0 bg-[#0a0a0a]">
          <div className="flex-1 relative overflow-hidden rounded-lg border border-[#1e1e1e] shadow-2xl">
            <MineMap
              vehicles={state.vehicles}
              obstacles={state.obstacles}
              onSelectVehicle={(id) => setState(s => ({ ...s, selectedVehicleId: id }))}
              selectedVehicleId={state.selectedVehicleId}
              fog={state.environment.fog}
              systemStatus={state.systemStatus}
            />

            {/* Critical collision banner */}
            {state.vehicles.some(v => v.risk === 'CRITICAL') && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-critical/90 backdrop-blur text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse z-10">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <div className="font-bold text-sm leading-tight">COLLISION RISK</div>
                  <div className="text-xs opacity-90">HAZARD DETECTED</div>
                </div>
              </div>
            )}

            {/* Scenario loading overlay */}
            {state.scenarioStatus === 'LOADING' && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <RotateCcw className="w-10 h-10 text-primary animate-spin mb-3" />
                <h2 className="text-lg font-bold tracking-widest text-white mb-1">RESETTING SIMULATION</h2>
                <p className="text-xs text-primary uppercase font-mono">LOADING SCENARIO: {state.scenarioName}</p>
              </div>
            )}

            {/* Corner HUD — simulation clock */}
            <div className="absolute bottom-2 left-2 font-mono text-[10px] text-gray-600 select-none">
              T+{(state.time / 1000).toFixed(1)}s &nbsp;|&nbsp; {state.vehicles.length} VEH &nbsp;|&nbsp; {state.obstacles.length} OBS
            </div>
          </div>
        </section>

        {/* ── RIGHT SIDEBAR — Terminal Telemetry ── */}
        <aside className="w-56 bg-[#0d0d0d] border-l border-[#1e1e1e] flex flex-col overflow-hidden shrink-0">

          {/* ─── LIVE TELEMETRY TERMINAL ─── */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="border border-[#2a2a2a] rounded font-mono text-[11px] overflow-hidden">
              {/* Terminal title bar */}
              <div className="flex items-center gap-1.5 bg-[#161616] border-b border-[#2a2a2a] px-2 py-1.5">
                <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                <div className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                <span className="ml-1 text-[10px] text-gray-500 uppercase tracking-widest">live_telemetry.sh</span>
                {state.isPlaying && <span className="terminal-cursor ml-auto" />}
              </div>

              {/* Terminal body */}
              <div className="p-2 bg-[#0d0d0d] space-y-0.5">
                {selectedVehicle ? (
                  <>
                    <TRow label="VEHICLE_ID"  value={selectedVehicle.id} cls="text-primary font-bold" />
                    <TRow
                      label="STATUS"
                      value={selectedVehicle.movementState}
                      cls={selectedVehicle.movementState === 'STOPPED' ? 'text-critical animate-pulse' : 'text-success'}
                    />
                    {selectedVehicle.movementState === 'STOPPED' && selectedVehicle.stopReason && (
                      <TRow label="STOP_REASON" value={selectedVehicle.stopReason} cls="text-critical text-[10px]" />
                    )}
                    <div className="border-t border-[#1e1e1e] my-1" />
                    <TRow
                      label="SPEED"
                      value={`${selectedVehicle.movementState === 'STOPPED' ? 0 : selectedVehicle.speed.toFixed(0)} km/h`}
                      cls="text-gray-200"
                    />
                    <TRow label="HEADING"     value={`${selectedVehicle.heading.toFixed(0)}°`} cls="text-gray-200" />
                    <div className="border-t border-[#1e1e1e] my-1" />
                    <TRow
                      label="GPS"
                      valueNode={sensorStatus(selectedVehicle.statuses.gps && state.systemStatus.gps)}
                    />
                    <TRow
                      label="LORA"
                      valueNode={sensorStatus(selectedVehicle.statuses.lora && state.systemStatus.lora)}
                    />
                    <TRow
                      label="RADAR"
                      valueNode={sensorStatus(selectedVehicle.statuses.radar && state.systemStatus.radar)}
                    />
                    <TRow
                      label="EDGE_PROC"
                      valueNode={sensorStatus(selectedVehicle.statuses.edge && state.systemStatus.edge)}
                    />
                    <div className="border-t border-[#1e1e1e] my-1" />
                    {selectedVehicle.nearestHazard.distance !== null ? (
                      <>
                        <TRow
                          label="NEAR_HAZARD"
                          value={`${selectedVehicle.nearestHazard.distance} m`}
                          cls={selectedVehicle.risk === 'CRITICAL' ? 'text-critical font-bold' : 'text-warning'}
                        />
                        <TRow
                          label="HAZARD_TYPE"
                          value={selectedVehicle.nearestHazard.type ?? '—'}
                          cls="text-gray-300"
                        />
                      </>
                    ) : (
                      <TRow label="NEAR_HAZARD" value="NONE" cls="text-success" />
                    )}
                    <TRow
                      label="RISK_LEVEL"
                      value={riskLabel(selectedVehicle.risk).text}
                      cls={riskLabel(selectedVehicle.risk).cls}
                    />
                    <div className="border-t border-[#1e1e1e] my-1" />
                    {/* Remove vehicle */}
                    <button
                      onClick={() => removeVehicle(selectedVehicle.id)}
                      className="w-full text-left text-[10px] text-gray-600 hover:text-critical transition-colors mt-1 font-mono"
                    >
                      &gt; <span className="underline underline-offset-2">rm {selectedVehicle.id}</span>
                    </button>
                  </>
                ) : (
                  <div className="py-3 space-y-1 text-gray-600">
                    <div>&gt; NO_VEHICLE_SELECTED</div>
                    <div>&gt; click a vehicle on</div>
                    <div>&gt; the map to begin_</div>
                    <MonitorSmartphone className="w-5 h-5 mt-2 opacity-30" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── EVENT LOG TERMINAL ─── */}
          <div className="border-t border-[#1e1e1e] p-2 flex flex-col" style={{ height: '40%', minHeight: '140px' }}>
            <div className="border border-[#2a2a2a] rounded font-mono text-[10px] overflow-hidden flex flex-col h-full">
              {/* Title bar */}
              <div className="flex items-center gap-2 bg-[#161616] border-b border-[#2a2a2a] px-2 py-1 shrink-0">
                <span className="text-gray-600 uppercase tracking-widest">event_log.sh</span>
                <span className="ml-auto text-gray-700">{state.logs.length} entries</span>
              </div>
              {/* Log lines */}
              <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5 bg-[#080808] flex flex-col-reverse">
                {state.logs.map(log => (
                  <div key={log.id} className="flex gap-1.5 leading-tight">
                    <span className="text-gray-700 shrink-0">[{log.timestamp}]</span>
                    <span className={`shrink-0 font-bold ${
                      log.type === 'INFO'     ? 'text-primary' :
                      log.type === 'WARNING'  ? 'text-warning' :
                      'text-critical'
                    }`}>
                      [{log.type.slice(0, 4)}]
                    </span>
                    <span className={
                      log.type === 'INFO'     ? 'text-gray-400' :
                      log.type === 'WARNING'  ? 'text-warning/80' :
                      'text-critical/80'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
                {state.logs.length === 0 && (
                  <div className="text-gray-700 italic py-2">&gt; awaiting events...</div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

// ── Terminal row helper ──────────────────────────────────────────────────────
interface TRowProps {
  label: string;
  value?: string;
  cls?: string;
  valueNode?: React.ReactNode;
}

function TRow({ label, value, cls = 'text-gray-300', valueNode }: TRowProps) {
  const paddedLabel = label.padEnd(11, ' ');
  return (
    <div className="flex gap-1 leading-snug">
      <span className="text-gray-700 shrink-0">&gt;</span>
      <span className="text-gray-600 shrink-0 whitespace-pre">{paddedLabel}</span>
      <span className="text-gray-700 shrink-0">:</span>
      <span className={`${cls} truncate`}>{valueNode ?? value}</span>
    </div>
  );
}

export default App;
