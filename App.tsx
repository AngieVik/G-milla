import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, CoPilotResponse, Coordinates } from './types';
import { fetchCoPilotInfo } from './services/geminiService';
import SettingsModal from './components/SettingsModal';
import GasStationCard from './components/GasStationCard';

const DEFAULT_SETTINGS: AppSettings = {
  checkFrequency: 5, // minutes
  voiceEnabled: true,
  showTraffic: true,
  showWeather: true,
  showCafes: true,
  gasBrands: []
};

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [data, setData] = useState<CoPilotResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // --- TTS Handling ---
  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled || !window.speechSynthesis) return;
    
    // Cancel current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    
    // Find a good Spanish voice if available
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.includes('es') && v.name.includes('Google'));
    if (esVoice) utterance.voice = esVoice;

    window.speechSynthesis.speak(utterance);
  }, [settings.voiceEnabled]);

  // --- Notifications ---
  const sendNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon.png' });
    }
  };

  // --- Core Logic: Update Info ---
  const updateInfo = useCallback(async (manual = false) => {
    if (loading) return;
    
    if (!manual && lastUpdate) {
      const diffMins = (new Date().getTime() - lastUpdate.getTime()) / 60000;
      if (diffMins < settings.checkFrequency) return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Get Location First
    if (!navigator.geolocation) {
      setErrorMsg("Geolocalización no soportada");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        setLocation(coords);

        // Fetch from Gemini
        try {
          const result = await fetchCoPilotInfo(coords, settings);
          setData(result);
          setLastUpdate(new Date());
          
          // Audio Output
          if (settings.voiceEnabled) {
             speak(result.spoken_text);
          }

          // Push Notification (Background Helper)
          if (document.visibilityState === 'hidden') {
            const stationName = result.nearest_stations[0]?.name || 'Gasolinera';
            const stationDist = result.nearest_stations[0]?.distance || 'cerca';
            sendNotification('G-milla Actualización', `Próxima: ${stationName} (${stationDist}). ${result.spoken_text.substring(0, 50)}...`);
          }

        } catch (err) {
          console.error(err);
          setErrorMsg("Error consultando a G-milla");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setErrorMsg("Permiso de ubicación denegado o no disponible");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

  }, [loading, lastUpdate, settings, speak]);

  // --- Effects ---

  // Initial Permission Request
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Interval Timer
  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    
    timerRef.current = window.setInterval(() => {
      updateInfo(false);
    }, 30000); // Check every 30s if we need to run (checked against settings.checkFrequency inside updateInfo)

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [updateInfo]);

  return (
    <div className="flex flex-col h-full relative font-sans">
      
      {/* Header */}
      <header className="p-4 bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 italic tracking-tighter">
          G-MILLA
        </h1>
        <div className="flex gap-2">
           <button 
            onClick={() => setSettings(s => ({...s, voiceEnabled: !s.voiceEnabled}))}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${settings.voiceEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
           >
             {settings.voiceEnabled ? (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" /></svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 1.414L11.414 11l2.293 2.293a1 1 0 01-1.414 1.414L10 12.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 11 6.293 8.707a1 1 0 011.414-1.414L10 9.586l2.293-2.293z" clipRule="evenodd" /></svg>
             )}
           </button>
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-300 hover:bg-gray-700"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto pb-32">
        {/* Status Indicator */}
        <div className="mb-6 flex flex-col items-center">
          {loading ? (
             <div className="flex flex-col items-center text-blue-400 animate-pulse-slow">
                <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-2"></div>
                <span className="text-sm font-semibold tracking-wider">ANALIZANDO RUTA...</span>
             </div>
          ) : (
             <div className="flex flex-col items-center">
                {location && (
                  <p className="text-xs text-gray-500 font-mono mb-1">
                     LAT: {location.latitude.toFixed(4)} • LNG: {location.longitude.toFixed(4)}
                  </p>
                )}
                {lastUpdate && (
                  <p className="text-xs text-green-500">
                    Actualizado: {lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                )}
             </div>
          )}
          {errorMsg && <p className="text-red-400 text-sm mt-2 bg-red-900/20 px-3 py-1 rounded">{errorMsg}</p>}
        </div>

        {/* Dynamic Content */}
        {data ? (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                 <h4 className="text-xs text-gray-400 uppercase tracking-wide">Tráfico</h4>
                 <p className="text-sm text-white font-medium mt-1 leading-snug">{data.traffic_summary || "Sin datos"}</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                 <h4 className="text-xs text-gray-400 uppercase tracking-wide">Tiempo</h4>
                 <p className="text-sm text-white font-medium mt-1 leading-snug">{data.weather_summary || "Sin datos"}</p>
              </div>
            </div>

            {/* Gas Stations List */}
            <h2 className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-3 ml-1">Próximas Paradas</h2>
            {data.nearest_stations.length > 0 ? (
              data.nearest_stations.slice(0, 2).map((station, idx) => (
                <GasStationCard key={idx} station={station} index={idx} />
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 bg-gray-900 rounded-xl border border-gray-800 border-dashed">
                No se encontraron gasolineras con los criterios actuales.
              </div>
            )}
          </>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7" />
              </svg>
              <p>Pulsa "Actualizar Ubicación" para escanear tu ruta.</p>
            </div>
          )
        )}
      </main>

      {/* Sticky Bottom Action Button */}
      <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center z-20">
        <button
          onClick={() => updateInfo(true)}
          disabled={loading}
          className={`
            w-full max-w-sm py-4 rounded-2xl shadow-2xl font-black text-lg tracking-wide uppercase transition-all transform active:scale-95
            ${loading 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/50'
            }
          `}
        >
          {loading ? 'Escaneando...' : 'Actualizar Ubicación'}
        </button>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
}

export default App;
