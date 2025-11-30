import React from 'react';
import { AppSettings, CoPilotResponse } from '../types';
import GasStationCard from './GasStationCard';

interface DashboardProps {
  isLocked: boolean;
  settings: AppSettings;
  data: CoPilotResponse | null;
  loading: boolean;
  errorMsg: string | null;
  onUpdate: (force: boolean) => void;
  onStop: () => void;
  onOpenSettings: () => void;
  onToggleVoice: () => void;
}

// Iconos SVG como componentes
const TrafficIcon = () => (
  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);
const WeatherIcon = () => (
  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
);

const Dashboard: React.FC<DashboardProps> = ({ isLocked, settings, data, loading, errorMsg, onUpdate, onStop, onOpenSettings, onToggleVoice }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
      
      {/* HEADER GLASS */}
      <header className="px-5 py-4 bg-gray-900/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center z-20 shadow-2xl relative">
        <div className="flex flex-col">
           <div className="flex items-center gap-3">
             {/* Indicador de Estado (Pulsing Dot) */}
             <div className="relative">
                <div className={`w-3 h-3 rounded-full ${loading ? 'bg-blue-400 animate-ping' : 'bg-green-500'}`}></div>
                <div className={`absolute top-0 left-0 w-3 h-3 rounded-full ${loading ? 'bg-blue-500' : 'bg-green-500 animate-pulse'}`}></div>
             </div>
             <h1 className="text-xl font-black italic tracking-tighter text-white">
               G-MILLA
             </h1>
           </div>
           
           {/* Estado Pantalla */}
           <div className="flex items-center gap-1 mt-1 ml-6">
             <span className={`text-[9px] font-bold font-mono tracking-widest uppercase ${isLocked ? "text-green-400" : "text-gray-600"}`}>
               {isLocked ? "DISPLAY: LOCKED" : "DISPLAY: AUTO"}
             </span>
           </div>
        </div>
        
        <div className="flex gap-3">
           <button onClick={onToggleVoice} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${settings.voiceEnabled ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
             {settings.voiceEnabled ? '🔊' : '🔇'}
           </button>
           <button onClick={onOpenSettings} className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-300 hover:bg-white/10">⚙️</button>
           <button onClick={onStop} className="h-10 px-4 bg-red-600/20 border border-red-500/50 rounded-full text-red-400 text-xs font-bold tracking-wider hover:bg-red-600 hover:text-white transition-all">EXIT</button>
        </div>

        {/* VISUALIZADOR IA (KITT SCANNER) - Solo visible cargando */}
        {loading && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-900 overflow-hidden">
            <div className="h-full w-1/3 bg-blue-400 blur-[4px] animate-kitt-scanner mx-auto"></div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-5 pb-36 relative">
        {/* Fondo de rejilla sutil */}
        <div className="absolute inset-0 opacity-20 pointer-events-none retro-grid animate-grid-flow" style={{transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)'}}></div>

        {errorMsg && (
          <div className="relative z-10 bg-red-500/10 backdrop-blur-md border border-red-500/30 p-4 rounded-2xl mb-4 flex items-center gap-3">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="text-sm font-medium text-red-200">{errorMsg}</span>
          </div>
        )}
        
        {data && (
          <div className="space-y-6 relative z-10 animate-fade-in-up">
             {/* Resumen Tráfico/Clima con Iconos */}
             {(data.traffic_summary || data.weather_summary) && (
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                   <div className="flex items-center gap-2 mb-2">
                     <TrafficIcon />
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tráfico</span>
                   </div>
                   <p className="text-sm font-medium text-gray-200 leading-snug">{data.traffic_summary || "Sin incidencias"}</p>
                 </div>
                 
                 <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                   <div className="flex items-center gap-2 mb-2">
                     <WeatherIcon />
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clima</span>
                   </div>
                   <p className="text-sm font-medium text-gray-200 leading-snug">{data.weather_summary || "Despejado"}</p>
                 </div>
               </div>
             )}
             
             {/* Lista de Paradas */}
             <div>
               <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                 En Ruta Detectada
               </h2>
               {data.nearest_stations.map((station, idx) => (
                  <GasStationCard key={idx} station={station} index={idx} />
               ))}
             </div>
          </div>
        )}

        {/* Estado "Esperando" */}
        {!data && !loading && !errorMsg && (
           <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 animate-spin-slow flex items-center justify-center">
                 <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <p className="mt-4 text-xs font-mono text-gray-400">ESPERANDO DATOS GPS...</p>
           </div>
        )}
      </main>

      {/* BOTÓN FLOTANTE */}
      <div className="fixed bottom-6 left-4 right-4 z-30">
        <button 
          onClick={() => onUpdate(true)} disabled={loading}
          className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-black tracking-widest shadow-2xl shadow-blue-900/50 overflow-hidden active:scale-[0.98] transition-transform"
        >
          <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out -skew-x-12 transform -translate-x-full"></div>
          <span className="relative flex items-center justify-center gap-3">
            {loading ? 'ANALIZANDO...' : 'ESCANEAR AHORA'}
            {!loading && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;