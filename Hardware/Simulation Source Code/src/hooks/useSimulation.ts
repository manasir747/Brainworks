import { useState, useEffect, useCallback, useRef } from 'react';
import type { SimulationState, RiskLevel } from '../types';

const INITIAL_STATE: SimulationState = {
  isPlaying: false,
  speedMultiplier: 1,
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
        // Simple movement logic along path
        let newPos = { ...vehicle.position };
        let newHeading = vehicle.heading;
        let newPath = [...vehicle.path];

        if (newPath.length > 0) {
          const target = newPath[0];
          const dx = target.x - newPos.x;
          const dy = target.y - newPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 5) {
            newPath.shift(); // Reached waypoint
            if (newPath.length === 0) {
              // loop back to start if empty to keep them moving
              newPath = [vehicle.position]; // placeholder for continuous movement
            }
          } else {
            newPos.x += (dx / dist) * (vehicle.speed / 10) * timeScale;
            newPos.y += (dy / dist) * (vehicle.speed / 10) * timeScale;
            newHeading = Math.atan2(dy, dx) * (180 / Math.PI);
          }
        }

        // Risk Assessment
        let newRisk: RiskLevel = 'SAFE';
        let minHazardDist = Infinity;
        let hazardType: 'VEHICLE' | 'OBSTACLE' | null = null;

        // Check obstacles
        prev.obstacles.forEach(obs => {
          const dx = obs.position.x - newPos.x;
          const dy = obs.position.y - newPos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          // Radar detection (if active)
          if (prev.systemStatus.radar && vehicle.statuses.radar && dist < RADAR_RANGE) {
             if (dist < minHazardDist) {
               minHazardDist = dist;
               hazardType = 'OBSTACLE';
             }
          }
        });

        // Check other vehicles
        prev.vehicles.forEach(other => {
          if (other.id === vehicle.id) return;
          const dx = other.position.x - newPos.x;
          const dy = other.position.y - newPos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          let detected = false;
          
          // Local Radar
          if (prev.systemStatus.radar && vehicle.statuses.radar && dist < RADAR_RANGE) {
            detected = true;
          }
          // LoRa V2X
          if (prev.systemStatus.lora && vehicle.statuses.lora && other.statuses.lora && dist < LORA_RANGE) {
            detected = true; // Simplified: they share info
          }

          if (detected && dist < minHazardDist) {
             minHazardDist = dist;
             hazardType = 'VEHICLE';
          }
        });

        if (minHazardDist < 30) newRisk = 'CRITICAL';
        else if (minHazardDist < 60) newRisk = 'WARNING';
        else if (minHazardDist < 120) newRisk = 'CAUTION';

        // Play alarm if critical and transition
        if (newRisk === 'CRITICAL' && vehicle.risk !== 'CRITICAL') {
           // Can trigger sound effect here
           // addLog(`CRITICAL: Hazard near ${vehicle.id}`, 'CRITICAL'); // handled in component to avoid spam
        }

        return {
          ...vehicle,
          position: newPos,
          heading: newHeading,
          path: newPath,
          risk: prev.systemStatus.edge && vehicle.statuses.edge ? newRisk : 'SAFE', // If edge fails, can't calculate risk
          nearestHazard: {
            distance: minHazardDist === Infinity ? null : parseFloat((minHazardDist/10).toFixed(1)), // Scale for display
            type: hazardType
          }
        };
      });

      return {
        ...prev,
        time: prev.time + deltaTime,
        vehicles: newVehicles
      };
    });
  }, []);

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
     addLog(`Loading Scenario: ${scenarioId}`, 'INFO');
     setState(s => ({ ...INITIAL_STATE, isPlaying: false, systemStatus: s.systemStatus, environment: s.environment, logs: s.logs }));
     
     if (scenarioId === 'blind-corner') {
        setState(s => ({
          ...s,
          vehicles: [
            { id: 'TRUCK-01', position: { x: 200, y: 150 }, speed: 30, heading: 0, targetPosition: null, path: [{x: 400, y: 150}, {x: 400, y: 400}], risk: 'SAFE', statuses: { gps: true, lora: true, radar: true, edge: true }, nearestHazard: { distance: null, type: null } },
            { id: 'TRUCK-02', position: { x: 400, y: 450 }, speed: 30, heading: -90, targetPosition: null, path: [{x: 400, y: 150}, {x: 200, y: 150}], risk: 'SAFE', statuses: { gps: true, lora: true, radar: true, edge: true }, nearestHazard: { distance: null, type: null } }
          ],
          isPlaying: true
        }));
     } else if (scenarioId === 'rockfall') {
         setState(s => ({
          ...s,
          vehicles: [
            { id: 'TRUCK-01', position: { x: 100, y: 300 }, speed: 35, heading: 0, targetPosition: null, path: [{x: 700, y: 300}], risk: 'SAFE', statuses: { gps: true, lora: true, radar: true, edge: true }, nearestHazard: { distance: null, type: null } },
          ],
          obstacles: [
            { id: 'OBS-1', position: { x: 500, y: 300 }, type: 'ROCKFALL' }
          ],
          isPlaying: true
        }));
     } else if (scenarioId === 'lora-failure') {
        setState(s => ({
          ...s,
          systemStatus: { ...s.systemStatus, lora: false },
          vehicles: [
            { id: 'TRUCK-01', position: { x: 200, y: 150 }, speed: 30, heading: 0, targetPosition: null, path: [{x: 400, y: 150}, {x: 400, y: 400}], risk: 'SAFE', statuses: { gps: true, lora: false, radar: true, edge: true }, nearestHazard: { distance: null, type: null } },
            { id: 'TRUCK-02', position: { x: 400, y: 450 }, speed: 30, heading: -90, targetPosition: null, path: [{x: 400, y: 150}, {x: 200, y: 150}], risk: 'SAFE', statuses: { gps: true, lora: false, radar: true, edge: true }, nearestHazard: { distance: null, type: null } }
          ],
          isPlaying: true
        }));
        addLog('LoRa System Offline', 'CRITICAL');
     }
  };

  return {
    state,
    setState,
    togglePlay,
    reset,
    setSpeed,
    loadScenario,
    addLog
  };
}
