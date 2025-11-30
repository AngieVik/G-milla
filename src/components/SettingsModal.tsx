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

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const toggleBrand = (brand: string) => {
    const current = localSettings.gasBrands;
    const next = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand];
    setLocalSettings({ ...localSettings, gasBrands: next });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-gray-900/90 border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
        
        {/* Título */}
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <h2 className="text-xl font-black italic text-white tracking-tighter">AJUSTES SISTEMA</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {/* API Key */}
        <div className="mb-6 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
          <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">Gemini API Key</label>
          <input
            type="password"
            placeholder="Pegar clave aquí..."
            value={localSettings.apiKey || ''}
            onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
            className="w-full bg-black/50 text-white border border-white/10 rounded-xl p-3 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3 mb-8">
          {[
            { label: 'Tráfico (DGT)', key: 'showTraffic' },
            { label: 'Meteorología (AEMET)', key: 'showWeather' },
            { label: 'Cafeterías / Descanso', key: 'showCafes' }
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
              <span className="text-gray-200 font-medium">{item.label}</span>
              <input 
                type="checkbox" 
                checked={localSettings[item.key as keyof AppSettings] as boolean} 
                onChange={(e) => setLocalSettings({...localSettings, [item.key]: e.target.checked})} 
                className="w-6 h-6 accent-blue-600 rounded cursor-pointer" 
              />
            </label>
          ))}
        </div>

        {/* Botones Acción */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 rounded-xl bg-gray-800 text-gray-400 font-bold hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={() => { onSave(localSettings); onClose(); }} className="flex-1 py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-colors">GUARDAR CAMBIOS</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;