import { useState, useEffect, useCallback, useRef } from 'react';
import type { SimulationState, RiskLevel, Vehicle } from '../types';

const INITIAL_STATE: SimulationState = {
  isPlaying: false,
  speedMultiplier: 1,
  scenarioStatus: 'IDLE',
  scenarioName: null,
  vehicles: [],
  obstacles: [],
  environment: {
    fog: 'CLEAR',
    dust: 'OFF',
    rain: false,
  },
  systemStatus: {
    gps: true,
    lora: true,
    radar: true,
    edge: true,
    network: true,
  },
  selectedVehicleId: null,
  logs: [],
  time: 0,
};

// Map Dimensions
export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 600;
export const RADAR_RANGE = 100;
export const LORA_RANGE = 250;

export function useSimulation() {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  const addLog = useCallback((message: string, type: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    setState(prev => ({
      ...prev,
      logs: [{
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      }, ...prev.logs].slice(0, 50), // Keep last 50
    }));
  }, []);

  const updateSimulation = useCallback((deltaTime: number) => {
    setState(prev => {
      if (!prev.isPlaying) return prev;

      const timeScale = (deltaTime / 1000) * prev.speedMultiplier * 20; // 20 units per real second at 1x
      
      const newVehicles = prev.vehicles.map(vehicle => {
        let isStopped = vehicle.movementState === 'STOPPED';
        let proposedPos = { ...vehicle.position };
        let proposedHeading = vehicle.heading;
        let newPath = [...vehicle.path];
        
        let dx = 0, dy = 0, distToWaypoint = 0;

        if (newPath.length > 0) {
          const target = newPath[0];
          dx = target.x - vehicle.position.x;
          dy = target.y - vehicle.position.y;
          distToWaypoint = Math.sqrt(dx * dx + dy * dy);

          if (distToWaypoint < 5) {
            newPath.shift();
            newPath.push(target); // Loop
            if (newPath.length > 0) {
                const nextTarget = newPath[0];
                dx = nextTarget.x - vehicle.position.x;
                dy = nextTarget.y - vehicle.position.y;
                distToWaypoint = Math.sqrt(dx * dx + dy * dy);
            }
          }
        }

        if (newPath.length > 0 && distToWaypoint > 0) {
           const targetHeading = Math.atan2(dy, dx) * (180 / Math.PI);
           let diff = targetHeading - vehicle.heading;
           diff = ((diff + 180) % 360 + 360) % 360 - 180;
           
           const maxTurn = 90 * (deltaTime / 1000) * prev.speedMultiplier;
           if (Math.abs(diff) <= maxTurn) {
              proposedHeading = targetHeading;
           } else {
              proposedHeading += Math.sign(diff) * maxTurn;
           }
           
           proposedPos.x += (dx / distToWaypoint) * (vehicle.speed / 10) * timeScale;
           proposedPos.y += (dy / distToWaypoint) * (vehicle.speed / 10) * timeScale;
        }

        // Predictive safety check
        const SAFETY_BUFFER = 50; 
        const RESUME_THRESHOLD = 70; 
        let minHazardDist = Infinity;
        let hazardType: 'VEHICLE' | 'OBSTACLE' | null = null;

        const checkPos = isStopped ? vehicle.position : proposedPos;
        let hazardTargetPos = null;
        
        prev.obstacles.forEach(obs => {
          const ox = obs.position.x - checkPos.x;
          const oy = obs.position.y - checkPos.y;
          const dist = Math.sqrt(ox*ox + oy*oy);
          
          if (prev.systemStatus.radar && vehicle.statuses.radar && dist < RADAR_RANGE) {
             let angleToObs = Math.atan2(oy, ox) * (180 / Math.PI);
             let angleDiff = Math.abs(((angleToObs - proposedHeading + 180) % 360 + 360) % 360 - 180);
             if (angleDiff < 45) { 
                if (dist < minHazardDist) {
                  minHazardDist = dist;
                  hazardType = 'OBSTACLE';
                  hazardTargetPos = obs.position;
                }
             }
          }
        });

        prev.vehicles.forEach(other => {
          if (other.id === vehicle.id) return;
          const ox = other.position.x - checkPos.x;
          const oy = other.position.y - checkPos.y;
          const dist = Math.sqrt(ox*ox + oy*oy);

          let detected = false;
          if (prev.systemStatus.radar && vehicle.statuses.radar && dist < RADAR_RANGE) {
             let angleToObs = Math.atan2(oy, ox) * (180 / Math.PI);
             let angleDiff = Math.abs(((angleToObs - proposedHeading + 180) % 360 + 360) % 360 - 180);
             if (angleDiff < 45) {
                detected = true;
             }
          }
          if (prev.systemStatus.lora && vehicle.statuses.lora && other.statuses.lora && dist < LORA_RANGE) {
            detected = true;
          }

          if (detected && dist < minHazardDist) {
             minHazardDist = dist;
             hazardType = 'VEHICLE';
             hazardTargetPos = other.position;
          }
        });

        let newMovementState = vehicle.movementState;
        let newStopReason = vehicle.stopReason;
        
        if (minHazardDist < SAFETY_BUFFER) {
           if (newMovementState !== 'STOPPED') {
              newMovementState = 'STOPPED';
              newStopReason = hazardType === 'VEHICLE' ? 'VEHICLE AHEAD' : 'OBSTACLE AHEAD';
              addLog(`${vehicle.id} STOPPING - ${newStopReason}`, 'WARNING');
           }
        } else if (newMovementState === 'STOPPED' && minHazardDist > RESUME_THRESHOLD) {
           newMovementState = 'MOVING';
           newStopReason = null;
           addLog(`${vehicle.id} RESUMED`, 'INFO');
        }

        const finalPos = newMovementState === 'MOVING' ? proposedPos : vehicle.position;
        const finalHeading = newMovementState === 'MOVING' ? proposedHeading : vehicle.heading;

        let newRisk: RiskLevel = 'SAFE';
        if (minHazardDist < 60) newRisk = 'CRITICAL';
        else if (minHazardDist < 90) newRisk = 'WARNING';
        else if (minHazardDist < 160) newRisk = 'CAUTION';

        return {
          ...vehicle,
          position: finalPos,
          heading: finalHeading,
          path: newPath,
          movementState: newMovementState,
          stopReason: newStopReason,
          risk: prev.systemStatus.edge && vehicle.statuses.edge ? newRisk : 'SAFE',
          nearestHazard: {
            distance: minHazardDist === Infinity ? null : parseFloat((minHazardDist/10).toFixed(1)),
            type: hazardType,
            position: hazardTargetPos
          }
        };
      });

      return {
        ...prev,
        time: prev.time + deltaTime,
        vehicles: newVehicles
      };
    });
  }, [addLog]);

  useEffect(() => {
    const tick = (time: number) => {
      if (lastTimeRef.current != undefined) {
        const deltaTime = time - lastTimeRef.current;
        updateSimulation(deltaTime);
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateSimulation]);

  const togglePlay = () => setState(s => ({ ...s, isPlaying: !s.isPlaying }));
  const reset = () => setState(INITIAL_STATE);
  const setSpeed = (speed: number) => setState(s => ({ ...s, speedMultiplier: speed }));
  
  const loadScenario = (scenarioId: string) => {
     addLog(`Initializing Scenario: ${scenarioId}...`, 'INFO');
     setState(s => ({ ...s, isPlaying: false, scenarioStatus: 'LOADING', scenarioName: scenarioId }));
     
     setTimeout(() => {
       setState(s => {
         let newVehicles: typeof s.vehicles = [];
         let newObstacles: typeof s.obstacles = [];
         let newSystemStatus = { gps: true, lora: true, radar: true, edge: true, network: true };
         
         // Strict road paths based on MineMap SVG:
         // Horizontal: Y=300, Top: Y=150, Bottom: Y=450
         // Vertical: X=400
         
         if (scenarioId === 'blind-corner') {
            newVehicles = [
              // Top road to vertical road
              { id: 'TRUCK-01', position: { x: 200, y: 150 }, speed: 35, heading: 0, targetPosition: null, path: [{x: 400, y: 150}, {x: 400, y: 450}, {x: 700, y: 450}, {x: 400, y: 450}, {x: 400, y: 150}, {x: 200, y: 150}], risk: 'SAFE', movementState: 'MOVING', stopReason: null, statuses: { gps: true, lora: true, radar: true, edge: true }, nearestHazard: { distance: null, type: null } },
              // Bottom road to top road
              { id: 'TRUCK-02', position: { x: 400, y: 450 }, speed: 30, heading: -90, targetPosition: null, path: [{x: 400, y: 150}, {x: 200, y: 150}, {x: 400, y: 150}, {x: 400, y: 450}], risk: 'SAFE', movementState: 'MOVING', stopReason: null, statuses: { gps: true, lora: true, radar: true, edge: true }, nearestHazard: { distance: null, type: null } }
            ];
         } else if (scenarioId === 'rockfall') {
             newVehicles = [
              { id: 'TRUCK-01', position: { x: 100, y: 300 }, speed: 40, heading: 0, targetPosition: null, path: [{x: 800, y: 300}, {x: 100, y: 300}], risk: 'SAFE', movementState: 'MOVING', stopReason: null, statuses: { gps: true, lora: true, radar: true, edge: true }, nearestHazard: { distance: null, type: null } },
            ];
            newObstacles = [
              { id: 'OBS-1', position: { x: 500, y: 300 }, type: 'ROCKFALL' }
            ];
         } else if (scenarioId === 'lora-failure') {
            newSystemStatus.lora = false;
            newVehicles = [
              { id: 'TRUCK-01', position: { x: 150, y: 300 }, speed: 35, heading: 0, targetPosition: null, path: [{x: 800, y: 300}, {x: 50, y: 300}], risk: 'SAFE', movementState: 'MOVING', stopReason: null, statuses: { gps: true, lora: false, radar: true, edge: true }, nearestHazard: { distance: null, type: null } },
              { id: 'TRUCK-02', position: { x: 650, y: 300 }, speed: 30, heading: 180, targetPosition: null, path: [{x: 50, y: 300}, {x: 800, y: 300}], risk: 'SAFE', movementState: 'MOVING', stopReason: null, statuses: { gps: true, lora: false, radar: true, edge: true }, nearestHazard: { distance: null, type: null } }
            ];
         }
         
         return {
           ...s,
           scenarioStatus: 'READY',
           isPlaying: true,
           vehicles: newVehicles,
           obstacles: newObstacles,
           systemStatus: newSystemStatus,
           logs: s.logs,
           time: 0
         };
       });
       if (scenarioId === 'lora-failure') addLog('LoRa System Offline', 'CRITICAL');
     }, 1000);
  };

  const addVehicle = useCallback(() => {
    setState(s => {
      let idNum = 1;
      while (s.vehicles.find(v => v.id === `TRUCK-${idNum.toString().padStart(2, '0')}`)) {
        idNum++;
      }
      const newId = `TRUCK-${idNum.toString().padStart(2, '0')}`;

      const spawnPoints = [
        { position: { x: 50, y: 300 }, heading: 0, path: [{x: 800, y: 300}, {x: 50, y: 300}] },
        { position: { x: 400, y: 50 }, heading: 90, path: [{x: 400, y: 600}, {x: 400, y: 50}] },
        { position: { x: 600, y: 150 }, heading: 180, path: [{x: 200, y: 150}, {x: 600, y: 150}] },
        { position: { x: 400, y: 450 }, heading: 0, path: [{x: 700, y: 450}, {x: 400, y: 450}] },
      ];

      let selectedSpawn = null;
      for (const sp of spawnPoints) {
        let isSafe = true;
        for (const v of s.vehicles) {
          const dx = v.position.x - sp.position.x;
          const dy = v.position.y - sp.position.y;
          if (Math.sqrt(dx*dx + dy*dy) < 60) {
            isSafe = false;
            break;
          }
        }
        if (isSafe) {
          selectedSpawn = sp;
          break;
        }
      }

      if (!selectedSpawn) {
        addLog('Cannot add vehicle: all spawn points blocked', 'WARNING');
        return s;
      }

      const newVehicle: Vehicle = {
        id: newId,
        position: selectedSpawn.position,
        heading: selectedSpawn.heading,
        speed: 35,
        targetPosition: null,
        path: selectedSpawn.path,
        risk: 'SAFE',
        movementState: 'MOVING',
        stopReason: null,
        statuses: { gps: true, lora: true, radar: true, edge: true },
        nearestHazard: { distance: null, type: null }
      };
      
      addLog(`${newId} added to simulation`, 'INFO');
      
      return {
        ...s,
        vehicles: [...s.vehicles, newVehicle]
      };
    });
  }, [addLog]);

  const removeVehicle = useCallback((id: string) => {
    setState(s => {
      addLog(`${id} removed from simulation`, 'INFO');
      return {
        ...s,
        vehicles: s.vehicles.filter(v => v.id !== id),
        selectedVehicleId: s.selectedVehicleId === id ? null : s.selectedVehicleId
      };
    });
  }, [addLog]);

  const addObstacle = useCallback((type: 'ROCKFALL' | 'EQUIPMENT' = 'ROCKFALL') => {
    setState(s => {
      const roads = [
        { y: 300, minX: 100, maxX: 700 },
        { x: 400, minY: 100, maxY: 500 },
        { y: 150, minX: 200, maxX: 600 },
        { y: 450, minX: 400, maxX: 700 },
      ];
      
      let newPos = null;
      for (let attempts = 0; attempts < 20; attempts++) {
        const road = roads[Math.floor(Math.random() * roads.length)];
        const x = road.x !== undefined ? road.x : Math.floor(Math.random() * (road.maxX! - road.minX!) + road.minX!);
        const y = road.y !== undefined ? road.y : Math.floor(Math.random() * (road.maxY! - road.minY!) + road.minY!);
        
        let isSafe = true;
        for (const v of s.vehicles) {
          const dist = Math.sqrt((v.position.x - x)**2 + (v.position.y - y)**2);
          if (dist < 120) {
             isSafe = false;
             break;
          }
        }
        
        if (isSafe) {
           newPos = { x, y };
           break;
        }
      }
      
      if (!newPos) {
        addLog('Cannot safely place obstacle (too crowded).', 'WARNING');
        return s;
      }
      
      const newObs = {
        id: `OBS-${s.obstacles.length + 1}-${Math.floor(Math.random()*1000)}`,
        position: newPos,
        type: type
      };
      
      addLog(`${type} hazard spawned at [${newPos.x}, ${newPos.y}]`, 'CRITICAL');
      
      return {
        ...s,
        obstacles: [...s.obstacles, newObs]
      };
    });
  }, [addLog]);

  return {
    state,
    setState,
    togglePlay,
    reset,
    setSpeed,
    loadScenario,
    addVehicle,
    removeVehicle,
    addObstacle,
    addLog
  };
}
