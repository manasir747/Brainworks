import React from 'react';
import type { Vehicle, Obstacle, RiskLevel, SystemStatus } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, RADAR_RANGE, LORA_RANGE } from '../hooks/useSimulation';

interface MineMapProps {
  vehicles: Vehicle[];
  obstacles: Obstacle[];
  onSelectVehicle: (id: string) => void;
  selectedVehicleId: string | null;
  fog: 'CLEAR' | 'LIGHT' | 'DENSE';
  systemStatus: SystemStatus;
}

const MineMap: React.FC<MineMapProps> = ({ vehicles, obstacles, onSelectVehicle, selectedVehicleId, fog, systemStatus }) => {
  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'SAFE': return '#22c55e'; // green
      case 'CAUTION': return '#eab308'; // yellow
      case 'WARNING': return '#f97316'; // orange
      case 'CRITICAL': return '#ef4444'; // red
      default: return '#6b7280';
    }
  };

  const fogOpacity = fog === 'CLEAR' ? 0 : fog === 'LIGHT' ? 0.4 : 0.8;

  return (
    <div className="relative w-full h-full bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#333] shadow-2xl">
      {/* Background Grid / Mine representation */}
      <svg width="100%" height="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2a2a2a" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Simple Mine Roads */}
        <path d="M 0 300 Q 200 300 400 300 T 800 300" fill="none" stroke="#333" strokeWidth="40" strokeLinecap="round" />
        <path d="M 400 0 L 400 600" fill="none" stroke="#333" strokeWidth="40" />
        <path d="M 200 150 L 600 150" fill="none" stroke="#333" strokeWidth="30" />
        <path d="M 400 450 L 700 450" fill="none" stroke="#333" strokeWidth="30" />
        
        {/* Blind corner block */}
        <rect x="250" y="180" width="120" height="100" fill="#111" />
        <text x="310" y="235" fill="#444" fontSize="12" textAnchor="middle">BLIND CORNER</text>

        {/* Radar Arcs & LoRa Links */}
        {vehicles.map(v => (
          <g key={`sensors-${v.id}`}>
            {/* Radar Cone */}
            {systemStatus.radar && v.statuses.radar && (
              <path 
                d={`M ${v.position.x} ${v.position.y} L ${v.position.x + Math.cos((v.heading - 30) * Math.PI / 180) * RADAR_RANGE} ${v.position.y + Math.sin((v.heading - 30) * Math.PI / 180) * RADAR_RANGE} A ${RADAR_RANGE} ${RADAR_RANGE} 0 0 1 ${v.position.x + Math.cos((v.heading + 30) * Math.PI / 180) * RADAR_RANGE} ${v.position.y + Math.sin((v.heading + 30) * Math.PI / 180) * RADAR_RANGE} Z`}
                fill={v.risk === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.1)'}
                stroke={v.risk === 'CRITICAL' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.3)'}
                strokeWidth="1"
              />
            )}
            {/* LoRa Connections */}
            {systemStatus.lora && v.statuses.lora && vehicles.map(other => {
              if (v.id >= other.id) return null; // Avoid drawing twice
              if (!other.statuses.lora) return null;
              
              const dx = other.position.x - v.position.x;
              const dy = other.position.y - v.position.y;
              if (Math.sqrt(dx*dx + dy*dy) < LORA_RANGE) {
                return (
                  <line 
                    key={`lora-${v.id}-${other.id}`}
                    x1={v.position.x} y1={v.position.y}
                    x2={other.position.x} y2={other.position.y}
                    stroke="#a855f7" strokeWidth="2" strokeDasharray="5,5"
                    className="opacity-60"
                  />
                );
              }
              return null;
            })}
          </g>
        ))}

        {/* Obstacles */}
        {obstacles.map(obs => (
          <g key={obs.id} transform={`translate(${obs.position.x}, ${obs.position.y})`}>
            <circle r="12" fill="#333" stroke="#f97316" strokeWidth="2" />
            <text fill="#fff" fontSize="12" textAnchor="middle" y="4">🪨</text>
          </g>
        ))}

        {/* Vehicles */}
        {vehicles.map(v => (
          <g 
            key={v.id} 
            transform={`translate(${v.position.x}, ${v.position.y})`}
            onClick={() => onSelectVehicle(v.id)}
            className="cursor-pointer"
          >
            {/* Selection Highlight */}
            {selectedVehicleId === v.id && (
              <circle r="24" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4,4" className="animate-spin-slow" />
            )}
            
            {/* Warning Pulse */}
            {v.risk === 'CRITICAL' && (
              <circle r="20" className="radar-pulse" fill={getRiskColor(v.risk)} />
            )}

            <g transform={`rotate(${v.heading})`}>
              <rect x="-15" y="-10" width="30" height="20" rx="3" fill="#333" stroke={getRiskColor(v.risk)} strokeWidth="2" />
              <rect x="5" y="-8" width="8" height="16" rx="1" fill="#111" /> {/* Cab */}
              <polygon points="15,-5 20,0 15,5" fill={getRiskColor(v.risk)} /> {/* Direction arrow */}
              
              {/* Brake Lights when stopped */}
              {v.movementState === 'STOPPED' && (
                 <g>
                   <circle cx="-16" cy="-8" r="2" fill="#ef4444" className="animate-pulse" />
                   <circle cx="-16" cy="8" r="2" fill="#ef4444" className="animate-pulse" />
                 </g>
              )}
            </g>
            <text y="-20" fill="#fff" fontSize="12" textAnchor="middle" fontWeight="bold" style={{ textShadow: '0px 1px 2px black' }}>
              {v.id}
            </text>
          </g>
        ))}
      </svg>

      {/* Fog Overlay */}
      {fog !== 'CLEAR' && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 bg-[#bbb]" 
          style={{ opacity: fogOpacity, mixBlendMode: 'screen' }}
        />
      )}
    </div>
  );
};

export default MineMap;
