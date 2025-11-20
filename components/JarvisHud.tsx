import React from 'react';
import { AppState, GestureType, CityData } from '../types';
import { Activity, Target, Cpu, Shield, Globe, Zap } from 'lucide-react';

interface JarvisHudProps {
  state: AppState;
}

const JarvisHud: React.FC<JarvisHudProps> = ({ state }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 p-6 flex flex-col justify-between overflow-hidden text-cyan-400 font-mono-tech">
      
      {/* TOP BAR */}
      <div className="flex justify-between items-start">
        {/* Top Left: System Status */}
        <div className="border-l-2 border-t-2 border-cyan-500 pl-4 pt-2 bg-black/40 backdrop-blur-sm rounded-tr-lg w-64">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-bold tracking-widest">J.A.R.V.I.S.</h2>
          </div>
          <div className="text-xs space-y-1 opacity-80 mb-2">
            <p>SYSTEM: <span className="text-green-400">ONLINE</span></p>
            <p>VISION: {state.isSystemReady ? 'ACTIVE' : 'INITIALIZING...'}</p>
            <p>FPS: {state.fps}</p>
          </div>
        </div>

        {/* Top Center: Compass / Heading */}
        <div className="flex flex-col items-center opacity-80">
           <div className="w-96 h-8 border-b border-cyan-500/50 flex justify-between px-2 text-xs">
              <span>NW</span><span>N</span><span>NE</span>
           </div>
           <div className="w-0 h-2 border-l border-cyan-500 mt-1"></div>
        </div>

        {/* Top Right: Gesture Feed */}
        <div className="border-r-2 border-t-2 border-cyan-500 pr-4 pt-2 text-right bg-black/40 backdrop-blur-sm rounded-tl-lg w-64">
           <div className="flex items-center justify-end gap-2 mb-2">
             <h2 className="text-xl font-bold tracking-widest">INPUT</h2>
             <Activity className="w-6 h-6" />
           </div>
           <div className="text-xs space-y-1 mb-2">
             <p>GESTURE: <span className="text-yellow-400 font-bold">{state.gesture.type}</span></p>
             <p>CONFIDENCE: 98.4%</p>
           </div>
        </div>
      </div>

      {/* CENTER RETICLE */}
      {state.telemetry.detected && (
        <div 
           className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-cyan-500/30 rounded-full w-64 h-64 flex items-center justify-center animate-spin-slow"
           style={{ animationDuration: '10s' }}
        >
           <div className="w-56 h-56 border border-dashed border-cyan-500/20 rounded-full"></div>
           <Target className="w-8 h-8 text-cyan-500/50 absolute" />
        </div>
      )}

      {/* BOTTOM BAR */}
      <div className="flex justify-between items-end">
        
        {/* Bottom Left: Globe Data / Selected City */}
        <div className="w-80 border-l-2 border-b-2 border-cyan-500 pl-4 pb-2 bg-black/60 backdrop-blur-md rounded-tr-lg min-h-[150px]">
           <div className="flex items-center gap-2 mb-2 border-b border-cyan-500/30 pb-1">
             <Globe className="w-5 h-5" />
             <h3 className="font-bold">GEOSPATIAL DATA</h3>
           </div>
           {state.selectedCity ? (
             <div className="space-y-2 animate-pulse">
               <p className="text-2xl font-bold text-white">{state.selectedCity.name}</p>
               <div className="grid grid-cols-2 gap-2 text-sm">
                 <div>
                   <span className="text-xs opacity-60">POPULATION</span>
                   <p>{state.selectedCity.population}</p>
                 </div>
                 <div>
                   <span className="text-xs opacity-60">TEMP</span>
                   <p>{state.selectedCity.temp}</p>
                 </div>
                 <div className="col-span-2">
                    <span className="text-xs opacity-60">COORDS</span>
                    <p className="font-mono text-xs">{state.selectedCity.coordinates[0].toFixed(4)}, {state.selectedCity.coordinates[1].toFixed(4)}</p>
                 </div>
               </div>
             </div>
           ) : (
             <div className="text-sm opacity-50 italic mt-4">
               Waiting for target selection...
               <br/>
               [GESTURE: POINT to rotate, PINCH to zoom]
             </div>
           )}
        </div>

        {/* Bottom Right: Telemetry */}
        <div className="w-80 border-r-2 border-b-2 border-cyan-500 pr-4 pb-2 text-right bg-black/60 backdrop-blur-md rounded-tl-lg">
           <div className="flex items-center justify-end gap-2 mb-2 border-b border-cyan-500/30 pb-1">
             <h3 className="font-bold">SUIT TELEMETRY</h3>
             <Cpu className="w-5 h-5" />
           </div>
           <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block opacity-50">HEAD PITCH</span>
                <span className="text-lg font-bold">{state.telemetry.rotation.x.toFixed(2)}</span>
              </div>
              <div>
                <span className="block opacity-50">HEAD YAW</span>
                <span className="text-lg font-bold">{state.telemetry.rotation.y.toFixed(2)}</span>
              </div>
              <div className="col-span-2">
                 <div className="w-full bg-cyan-900/30 h-2 mt-2 rounded overflow-hidden">
                    <div className="h-full bg-cyan-400 w-[75%] animate-pulse"></div>
                 </div>
                 <span className="text-[10px] tracking-widest">POWER LEVELS: STABLE</span>
              </div>
           </div>
        </div>

      </div>
      
      {/* Decoration Lines */}
      <div className="absolute top-1/3 left-0 w-8 h-[1px] bg-cyan-500"></div>
      <div className="absolute top-2/3 right-0 w-8 h-[1px] bg-cyan-500"></div>
    </div>
  );
};

export default JarvisHud;