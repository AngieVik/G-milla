import React from 'react';
import { GasStation } from '../types';

interface Props {
  station: GasStation;
  index: number;
}

const GasStationCard: React.FC<Props> = ({ station, index }) => {
  
  // Función para construir la URL de navegación inteligente
  const getNavigationUrl = () => {
    if (station.location) {
      const { latitude, longitude } = station.location;
      
      // Detección básica de dispositivo móvil
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // En móvil, intentamos usar el protocolo 'geo:' que abre el selector de apps de mapas nativo
        return `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(station.name)})`;
      } else {
        // En PC, abrimos Google Maps dirección
        return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      }
    }
    
    // Fallback: Si no hay coordenadas, buscamos por texto
    const query = encodeURIComponent(`${station.name} ${station.address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="bg-gray-800 border-l-4 border-blue-500 rounded-r-xl p-4 mb-3 shadow-lg flex justify-between items-center transition-transform hover:bg-gray-750">
      <div className="flex-1 min-w-0 pr-2"> {/* min-w-0 ayuda con el truncate */}
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-blue-900 text-blue-200 text-xs font-bold px-2 py-0.5 rounded flex-shrink-0">
            #{index + 1}
          </span>
          <h3 className="text-lg font-bold text-white truncate">{station.name}</h3>
        </div>
        <p className="text-sm text-gray-400 truncate">{station.address}</p>
        {station.distance && (
          <p className="text-xs text-blue-400 font-mono mt-1 font-semibold">
            📍 Aprox {station.distance}
          </p>
        )}
      </div>
      
      <a 
        href={getNavigationUrl()} 
        target="_blank" 
        rel="noopener noreferrer"
        className="ml-2 w-12 h-12 flex flex-shrink-0 items-center justify-center bg-blue-600 rounded-full hover:bg-blue-500 transition-colors shadow-lg active:scale-95"
        aria-label="Navegar a destino"
      >
        {/* Icono de Flecha de Navegación */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
          <path d="M10 3a1 1 0 011 1v5h-2V4a1 1 0 011-1z" /> {/* Decorativo tipo brújula */}
        </svg>
      </a>
    </div>
  );
};

export default GasStationCard;