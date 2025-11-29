import React from 'react';
import { AppSettings, AVAILABLE_BRANDS } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  if (!isOpen) return null;

  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);

  const toggleBrand = (brand: string) => {
    const current = localSettings.gasBrands;
    const next = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand];
    setLocalSettings({ ...localSettings, gasBrands: next });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in-up">
        <h2 className="text-xl font-bold mb-6 text-white">Configuración G-milla</h2>

        {/* Info Toggles */}
        <div className="space-y-4 mb-6">
          <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-gray-200">Tráfico (DGT)</span>
            <input 
              type="checkbox" 
              checked={localSettings.showTraffic}
              onChange={(e) => setLocalSettings({...localSettings, showTraffic: e.target.checked})}
              className="w-6 h-6 accent-blue-500 rounded"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-gray-200">Meteorología (AEMET)</span>
            <input 
              type="checkbox" 
              checked={localSettings.showWeather}
              onChange={(e) => setLocalSettings({...localSettings, showWeather: e.target.checked})}
              className="w-6 h-6 accent-blue-500 rounded"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-gray-200">Cafeterías / Descanso</span>
            <input 
              type="checkbox" 
              checked={localSettings.showCafes}
              onChange={(e) => setLocalSettings({...localSettings, showCafes: e.target.checked})}
              className="w-6 h-6 accent-blue-500 rounded"
            />
          </label>
        </div>

        {/* Frequency */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Frecuencia de Actualización</label>
          <div className="flex justify-between items-center bg-gray-800 p-2 rounded-lg">
            <button 
               onClick={() => setLocalSettings({...localSettings, checkFrequency: Math.max(1, localSettings.checkFrequency - 1)})}
               className="w-10 h-10 bg-gray-700 rounded text-xl font-bold"
            >-</button>
            <span className="text-lg font-mono">{localSettings.checkFrequency} min</span>
             <button 
               onClick={() => setLocalSettings({...localSettings, checkFrequency: Math.min(60, localSettings.checkFrequency + 1)})}
               className="w-10 h-10 bg-gray-700 rounded text-xl font-bold"
            >+</button>
          </div>
        </div>

        {/* Brands */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Gasolineras Preferidas</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_BRANDS.map(brand => (
              <button
                key={brand}
                onClick={() => toggleBrand(brand)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  localSettings.gasBrands.includes(brand)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Si no seleccionas ninguna, se buscarán todas.</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-semibold"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              onSave(localSettings);
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
