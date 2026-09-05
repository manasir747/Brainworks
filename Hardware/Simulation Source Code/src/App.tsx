import { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Activity, MonitorSmartphone } from 'lucide-react';
import { useSimulation } from './hooks/useSimulation';
import MineMap from './components/MineMap';

function App() {
  const sim = useSimulation();
  const { state, setState, togglePlay, reset, setSpeed, loadScenario } = sim;
  
  // Audio for buzzer
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Check if any vehicle is in CRITICAL risk and sound the alarm
    const hasCritical = state.vehicles.some(v => v.risk === 'CRITICAL');
    
    if (hasCritical && state.isPlaying) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  }, [state.vehicles, state.isPlaying]);

  const selectedVehicle = state.vehicles.find(v => v.id === state.selectedVehicleId);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-gray-200 font-sans">
      {/* Top Bar */}
      <header className="flex justify-between items-center px-6 py-4 bg-[#111] border-b border-[#222]">
        <div className="flex items-center gap-4">
          <Activity className="text-primary w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white">MINESIGHT</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Mine Vehicle Safety Simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-xs bg-[#222] px-3 py-1 rounded text-gray-400">SIMULATION • PROOF OF CONCEPT</div>
           <div className="flex items-center gap-2">
             <div className={`w-3 h-3 rounded-full ${state.systemStatus.network ? 'bg-success' : 'bg-critical'}`} />
             <span className="text-sm font-semibold">{state.systemStatus.network ? 'SYSTEM NORMAL' : 'NETWORK OFFLINE'}</span>
           </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-[#111] border-r border-[#222] p-4 flex flex-col gap-6 overflow-y-auto">
          
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Simulation Controls</h2>
            <div className="flex gap-2">
              <button onClick={togglePlay} className="flex-1 bg-[#222] hover:bg-[#333] p-2 rounded flex justify-center items-center">
                {state.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 text-success" />}
              </button>
              <button onClick={reset} className="flex-1 bg-[#222] hover:bg-[#333] p-2 rounded flex justify-center items-center">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex gap-1 text-sm bg-[#1a1a1a] p-1 rounded">
              {[0.5, 1, 2, 4].map(s => (
                <button 
                  key={s} 
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-1 rounded ${state.speedMultiplier === s ? 'bg-[#333] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Scenarios</h2>
             {[
               {id: 'blind-corner', label: 'Blind Corner'},
               {id: 'rockfall', label: 'Rockfall'},
               {id: 'lora-failure', label: 'LoRa Failure'},
             ].map(sc => (
               <button 
                 key={sc.id}
                 onClick={() => loadScenario(sc.id)}
                 className="text-left px-3 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded text-sm transition-colors border border-[#333]"
               >
                 • {sc.label}
               </button>
             ))}
          </div>

          <div className="flex flex-col gap-3 mt-auto">
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fault Injection</h2>
             {Object.entries(state.systemStatus).map(([key, val]) => (
                <label key={key} className="flex items-center justify-between text-sm cursor-pointer group">
                  <span className="uppercase text-gray-400 group-hover:text-gray-200">{key}</span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${val ? 'bg-success/30' : 'bg-critical/30'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${val ? 'bg-success translate-x-5' : 'bg-critical translate-x-0.5'}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={val} onChange={() => setState(s => ({...s, systemStatus: {...s.systemStatus, [key]: !val}}))} />
                </label>
             ))}
          </div>
        </aside>

        {/* Center Area (Map) */}
        <section className="flex-1 p-6 flex flex-col min-w-0 bg-[#0a0a0a]">
          <div className="flex-1 rounded-xl shadow-2xl relative overflow-hidden">
             <MineMap 
               vehicles={state.vehicles} 
               obstacles={state.obstacles}
               onSelectVehicle={(id) => setState(s => ({...s, selectedVehicleId: id}))}
               selectedVehicleId={state.selectedVehicleId}
               fog={state.environment.fog}
               systemStatus={state.systemStatus}
             />
             
             {state.vehicles.some(v => v.risk === 'CRITICAL') && (
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-critical/90 backdrop-blur text-white px-6 py-3 rounded-lg flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse">
                 <AlertTriangle className="w-8 h-8" />
                 <div>
                   <div className="font-bold text-lg leading-tight">COLLISION RISK</div>
                   <div className="text-sm opacity-90">HAZARD DETECTED</div>
                 </div>
               </div>
             )}
             
             {state.scenarioStatus === 'LOADING' && (
               <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                 <RotateCcw className="w-12 h-12 text-primary animate-spin mb-4" />
                 <h2 className="text-xl font-bold tracking-widest text-white mb-2">RESETTING SIMULATION</h2>
                 <p className="text-sm text-primary uppercase">LOADING SCENARIO: {state.scenarioName}</p>
               </div>
             )}
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="w-80 bg-[#111] border-l border-[#222] p-4 flex flex-col gap-6 overflow-y-auto">
          {selectedVehicle ? (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex justify-between items-center border-b border-[#333] pb-3">
                 <h2 className="text-lg font-bold text-white">{selectedVehicle.id}</h2>
                 <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                   selectedVehicle.risk === 'SAFE' ? 'bg-success/20 text-success' :
                   selectedVehicle.risk === 'CAUTION' ? 'bg-caution/20 text-caution' :
                   selectedVehicle.risk === 'WARNING' ? 'bg-warning/20 text-warning' :
                   'bg-critical/20 text-critical animate-pulse'
                 }`}>
                   {selectedVehicle.risk}
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="bg-[#1a1a1a] p-3 rounded">
                   <div className="text-gray-500 text-xs mb-1">Speed</div>
                   <div className="font-mono text-lg">{selectedVehicle.movementState === 'STOPPED' ? 0 : selectedVehicle.speed.toFixed(0)} <span className="text-xs text-gray-500">km/h</span></div>
                 </div>
                 <div className="bg-[#1a1a1a] p-3 rounded">
                   <div className="text-gray-500 text-xs mb-1">Heading</div>
                   <div className="font-mono text-lg">{selectedVehicle.heading.toFixed(0)}°</div>
                 </div>
               </div>

               {selectedVehicle.movementState === 'STOPPED' && (
                 <div className="bg-critical/20 border border-critical p-3 rounded text-center animate-pulse">
                   <div className="text-critical font-bold text-sm">🛑 VEHICLE STOPPED</div>
                   {selectedVehicle.stopReason && <div className="text-xs text-critical/80 mt-1 uppercase">{selectedVehicle.stopReason}</div>}
                 </div>
               )}

               <div className="bg-[#1a1a1a] p-4 rounded-lg flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase">Sensor Status</h3>
                  <div className="space-y-2 text-sm">
                    {['gps', 'lora', 'radar', 'edge'].map(sensor => {
                       const isActive = selectedVehicle.statuses[sensor as keyof typeof selectedVehicle.statuses] && state.systemStatus[sensor as keyof typeof state.systemStatus];
                       return (
                         <div key={sensor} className="flex justify-between items-center">
                           <span className="uppercase text-gray-400">{sensor}</span>
                           <span className={`text-xs font-bold ${isActive ? 'text-success' : 'text-critical'}`}>
                             {isActive ? 'ACTIVE' : 'FAULT'}
                           </span>
                         </div>
                       )
                    })}
                  </div>
               </div>

               {selectedVehicle.nearestHazard.distance !== null && (
                 <div className={`p-4 rounded-lg border ${selectedVehicle.risk === 'CRITICAL' ? 'bg-critical/10 border-critical/50 text-critical' : 'bg-[#1a1a1a] border-[#333]'}`}>
                   <div className="text-xs uppercase mb-1 opacity-80">Nearest Hazard</div>
                   <div className="font-mono text-2xl font-bold">{selectedVehicle.nearestHazard.distance} <span className="text-sm">m</span></div>
                   <div className="text-xs opacity-70 mt-1">{selectedVehicle.nearestHazard.type} DETECTED</div>
                 </div>
               )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 text-center p-6 border-2 border-dashed border-[#222] rounded-xl">
               <MonitorSmartphone className="w-12 h-12 mb-4 opacity-50" />
               <p>Select a vehicle on the map to view detailed telemetry.</p>
            </div>
          )}
          
          <div className="mt-auto border-t border-[#333] pt-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Live Event Log</h3>
            <div className="h-48 overflow-y-auto pr-2 space-y-2 flex flex-col-reverse text-xs font-mono">
              {state.logs.map(log => (
                <div key={log.id} className={`p-2 rounded border-l-2 ${
                  log.type === 'INFO' ? 'border-primary bg-primary/5 text-gray-300' :
                  log.type === 'WARNING' ? 'border-warning bg-warning/5 text-warning' :
                  'border-critical bg-critical/5 text-critical'
                }`}>
                  <span className="opacity-50 mr-2">{log.timestamp}</span>
                  {log.message}
                </div>
              ))}
              {state.logs.length === 0 && <div className="text-gray-600 text-center italic py-4">No events recorded.</div>}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
