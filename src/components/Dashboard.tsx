import React from 'react';
import { AppSettings, CoPilotResponse, Coordinates } from '../types'; //
import GasStationCard from './GasStationCard'; //

interface DashboardProps {
  isLocked: boolean; // Estado del Wake Lock
  settings: AppSettings;
  data: CoPilotResponse | null;
  loading: boolean;
  errorMsg: string | null;
  onUpdate: (force: boolean) => void;
  onStop: () => void;
  onOpenSettings: () => void;
  onToggleVoice: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  isLocked,
  settings,
  data,
  loading,
  errorMsg,
  onUpdate,
  onStop,
  onOpenSettings,
  onToggleVoice
}) => {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* HEADER */}
      <header className="px-4 py-3 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 flex justify-between items-center z-20 shadow-lg">
        <div className="flex flex-col">
           <div className="flex items-center gap-2">
             <div className="w-2 h-6 bg-green-500 rounded-full animate-pulse"></div>
             <h1 className="text-lg font-black italic tracking-tighter text-gray-100">G-MILLA</h1>
           </div>
           {/* INDICADOR VISUAL WAKE LOCK */}
           <span className={`text-[10px] font-bold font-mono ml-4 ${isLocked ? "text-green-400" : "text-gray-500"}`}>
             {isLocked ? "☀ PANTALLA ACTIVA" : "☾ AHORRO ENERGÍA"}
           </span>
        </div>
        
        <div className="flex gap-2">
           <button onClick={onToggleVoice} className={`p-2 rounded-full ${settings.voiceEnabled ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
             {settings.voiceEnabled ? '🔊' : '🔇'}
           </button>
           <button onClick={onOpenSettings} className="p-2 bg-gray-800 rounded-full text-gray-300">⚙️</button>
           <button onClick={onStop} className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold">STOP</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 pb-32">
        {loading && (
           <div className="flex flex-col items-center animate-pulse mt-4">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-2"></div>
              <span className="text-xs font-bold text-blue-400 tracking-widest">ESCANEANDO...</span>
           </div>
        )}
        
        {errorMsg && <div className="bg-red-900/50 p-3 rounded text-sm text-red-200 mt-2 border border-red-800">{errorMsg}</div>}
        
        {data && (
          <div className="space-y-4 mt-4 animate-fade-in">
             {/* Resumen Tráfico/Clima */}
             {(data.traffic_summary || data.weather_summary) && (
               <div className="grid grid-cols-2 gap-2">
                 <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700">
                   <p className="text-[10px] text-gray-400 uppercase font-bold">Tráfico</p>
                   <p className="text-sm">{data.traffic_summary || "--"}</p>
                 </div>
                 <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700">
                   <p className="text-[10px] text-gray-400 uppercase font-bold">Clima</p>
                   <p className="text-sm">{data.weather_summary || "--"}</p>
                 </div>
               </div>
             )}
             
             {/* Lista de Paradas */}
             <h2 className="text-xs text-gray-500 font-bold uppercase mt-4 mb-2">Próximas Paradas</h2>
             {data.nearest_stations.map((station, idx) => (
                <GasStationCard key={idx} station={station} index={idx} />
             ))}
          </div>
        )}
      </main>

      {/* BOTÓN FLOTANTE */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent z-10 pointer-events-none">
        <button 
          onClick={() => onUpdate(true)} disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black tracking-widest shadow-lg pointer-events-auto active:scale-95 transition-transform"
        >
          {loading ? '...' : 'ACTUALIZAR UBICACIÓN'}
        </button>
      </div>
    </div>
  );
};

export default Dashboard;