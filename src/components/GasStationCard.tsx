import React from 'react';
import { GasStation } from '../types';

interface Props {
  station: GasStation;
  index: number;
}

const GasStationCard: React.FC<Props> = ({ station, index }) => {
  
  const getNavigationUrl = () => {
    if (station.location) {
      const { latitude, longitude } = station.location;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      return isMobile 
        ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(station.name)})`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
    const query = encodeURIComponent(`${station.name} ${station.address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 mb-3 transition-all duration-300 hover:bg-white/10 active:scale-[0.98] shadow-lg">
      
      {/* Brillo de fondo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-blue-500/30 transition-colors"></div>

      <div className="flex justify-between items-center relative z-10">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-3 mb-1">
            <span className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-blue-500/30 font-mono">
              {index + 1}
            </span>
            <h3 className="text-base font-bold text-white truncate tracking-tight">{station.name}</h3>
          </div>
          
          <p className="text-xs text-gray-400 truncate pl-9 font-medium">{station.address}</p>
          
          {station.distance && (
            <div className="flex items-center gap-2 mt-2 pl-9">
              <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                📍 {station.distance}
              </span>
            </div>
          )}
        </div>
        
        <a 
          href={getNavigationUrl()} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-12 h-12 flex flex-shrink-0 items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-900/40 hover:scale-110 active:scale-95 transition-all group-hover:rotate-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
          </svg>
        </a>
      </div>
    </div>
  );
};

export default GasStationCard;