import React from 'react';
import { GasStation } from '../types';

interface Props {
  station: GasStation;
  index: number;
}

const GasStationCard: React.FC<Props> = ({ station, index }) => {
  // Construct a Maps query link
  const query = encodeURIComponent(`${station.name} ${station.address}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <div className="bg-gray-800 border-l-4 border-blue-500 rounded-r-xl p-4 mb-3 shadow-lg flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-blue-900 text-blue-200 text-xs font-bold px-2 py-0.5 rounded">#{index + 1}</span>
          <h3 className="text-lg font-bold text-white truncate">{station.name}</h3>
        </div>
        <p className="text-sm text-gray-400 truncate">{station.address}</p>
        {station.distance && (
          <p className="text-xs text-blue-400 font-mono mt-1">Aprox {station.distance}</p>
        )}
      </div>
      
      <a 
        href={mapsUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="ml-3 w-12 h-12 flex items-center justify-center bg-blue-600 rounded-full hover:bg-blue-500 transition-colors shadow-lg active:scale-95"
        aria-label="Añadir a ruta"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </a>
    </div>
  );
};

export default GasStationCard;
