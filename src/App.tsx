import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, CoPilotResponse, Coordinates } from './types';
import { fetchCoPilotInfo } from './services/geminiService';
import SettingsModal from './components/SettingsModal';
import GasStationCard from './components/GasStationCard';

// Configuración por defecto
const DEFAULT_SETTINGS: AppSettings = {
  checkFrequency: 5,
  voiceEnabled: true,
  showTraffic: true,
  showWeather: true,
  showCafes: false,
  gasBrands: [],
  apiKey: ''
};

function App() {
  // --- ESTADOS ---
  const [isAppActive, setIsAppActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Carga inicial de configuración (LocalStorage)
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedKey = localStorage.getItem('gmilla_api_key');
    const savedPrefs = localStorage.getItem('gmilla_prefs');
    
    if (savedPrefs) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(savedPrefs), apiKey: savedKey || '' };
    }
    return { ...DEFAULT_SETTINGS, apiKey: savedKey || '' };
  });

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CoPilotResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // --- MANEJADORES ---

  // Guardar configuración y persistir
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    
    // Guardar Key por separado
    if (newSettings.apiKey) {
      localStorage.setItem('gmilla_api_key', newSettings.apiKey);
    }
    
    // Guardar resto de preferencias
    const { apiKey, ...prefs } = newSettings;
    localStorage.setItem('gmilla_prefs', JSON.stringify(prefs));
  };

  // Función para manejar el inicio seguro (TU LÓGICA SOLICITADA)
  const handleStartApp = () => {
    // 1. Comprobamos si hay API Key (ya sea en settings o en variables de entorno)
    const hasKey = settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!hasKey) {
      // 2. Si NO hay key, abrimos ajustes y lanzamos alerta visual
      alert("⚠️ Necesitas configurar tu API Key de Google Gemini para arrancar.");
      setIsSettingsOpen(true);
      return;
    }

    // 3. Si todo ok, arrancamos
    setIsAppActive(true);
  };

  // TTS (Voz)
  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 1.05;
    const v = window.speechSynthesis.getVoices().find(v => v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Monica')));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }, [settings.voiceEnabled]);

  // Notificaciones Push
  const sendNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      new Notification(title, { body, icon: '/vite.svg', tag: 'gmilla-update' });
    }
  };

  // CORE: Actualizar Info
  const updateInfo = useCallback(async (force = false) => {
    if (loading) return;
    if (!force && !isAppActive) return; // No hacer nada si no está activo

    // Chequeo de tiempo
    if (!force && lastUpdate) {
      const diffMins = (new Date().getTime() - lastUpdate.getTime()) / 60000;
      if (diffMins < settings.checkFrequency) return;
    }

    setLoading(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("GPS no disponible");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: Coordinates = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);

        try {
          const result = await fetchCoPilotInfo(coords, settings);
          setData(result);
          setLastUpdate(new Date());

          if (result.spoken_text) speak(result.spoken_text);
          if (result.nearest_stations.length > 0) {
            sendNotification(`G-milla: ${result.nearest_stations[0].name}`, result.spoken_text.slice(0,50) + "...");
          }
        } catch (err) {
          console.error(err);
          setErrorMsg("Error IA. Verifica tu API Key.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setErrorMsg("Acceso a ubicación denegado.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [loading, lastUpdate, settings, speak, isAppActive]);

  // --- EFECTOS ---

  // Timer y Visibilidad
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isAppActive) {
      // 1. Ejecutar inmediatamente al activar
      updateInfo(true);
      
      // 2. Timer periódico
      timerRef.current = window.setInterval(() => updateInfo(false), 30000);
      
      // 3. Listener de visibilidad (volver a la app)
      const handleVis = () => { if (document.visibilityState === 'visible') updateInfo(false); };
      document.addEventListener("visibilitychange", handleVis);
      
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener("visibilitychange", handleVis);
      };
    }
  }, [isAppActive, updateInfo]);

  // Carga inicial
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
    window.speechSynthesis.getVoices();
  }, []);


  // --- VISTA 1: HOME (Index) ---
  if (!isAppActive) {
    return (
      <div className="flex flex-col h-screen bg-gray-950 text-white items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Decoración fondo */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-blue-900/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"></div>

        <div className="z-10 text-center space-y-10">
          <div className="mb-4">
            <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-600 mb-2">
              G-MILLA
            </h1>
            <p className="text-gray-400 text-lg tracking-widest uppercase">Copiloto Inteligente</p>
          </div>

          {/* BOTÓN CON LÓGICA DE BLOQUEO */}
          <button 
            onClick={handleStartApp}
            className="w-64 h-64 rounded-full bg-gradient-to-b from-blue-600 to-blue-800 text-white font-black text-2xl shadow-[0_0_60px_-15px_rgba(37,99,235,0.5)] border-4 border-blue-400/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative group"
          >
            {/* Indicador visual si falta la key */}
            {!settings.apiKey && !import.meta.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY && (
              <div className="absolute top-4 right-4 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
            )}
            INICIAR
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`flex items-center gap-2 mx-auto transition-colors ${!settings.apiKey && !import.meta.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY ? 'text-blue-400 animate-pulse font-bold' : 'text-gray-500 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>{(settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) ? 'Configuración' : 'Configurar API Key (Requerido)'}</span>
          </button>
        </div>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />
      </div>
    );
  }

  // --- VISTA 2: ACTIVO (Dashboard) ---
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 flex justify-between items-center z-20 shadow-lg">
        <div className="flex items-center gap-2">
           <div className="w-2 h-6 bg-blue-500 rounded-full animate-pulse"></div>
           <h1 className="text-lg font-black italic tracking-tighter text-gray-100">
             G-MILLA <span className="text-[10px] not-italic font-normal text-green-400 bg-green-900/30 px-2 py-0.5 rounded ml-1 align-middle">ACTIVO</span>
           </h1>
        </div>
        
        <div className="flex gap-3">
           {/* Botón Voz */}
           <button 
            onClick={() => setSettings(s => ({...s, voiceEnabled: !s.voiceEnabled}))}
            className={`p-2 rounded-full transition-all active:scale-95 ${settings.voiceEnabled ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50' : 'bg-red-500/20 text-red-400'}`}
           >
             {settings.voiceEnabled ? (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
             ) : (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
             )}
           </button>
           
           {/* Botón Config */}
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="p-2 bg-gray-800 rounded-full text-gray-300 hover:bg-gray-700 active:scale-95 transition-colors"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </button>

           {/* Botón STOP */}
           <button 
             onClick={() => setIsAppActive(false)}
             className="ml-2 px-4 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-colors tracking-wider"
           >
             STOP
           </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL (SCROLLABLE) */}
      <main className="flex-1 overflow-y-auto p-4 pb-32">
        
        {/* Estado GPS / Loading */}
        <div className="mb-6 flex justify-center">
          {loading ? (
             <div className="flex flex-col items-center animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3"></div>
                <span className="text-sm font-bold text-blue-400 tracking-widest uppercase">Escaneando Ruta...</span>
             </div>
          ) : (
             <div className="text-center">
                {lastUpdate && <p className="text-xs text-gray-500 mb-1">Último escaneo: {lastUpdate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>}
                {location && <p className="text-[10px] text-gray-600 font-mono tracking-tighter">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>}
             </div>
          )}
          {errorMsg && <div className="mt-2 bg-red-900/50 border border-red-800 text-red-200 px-4 py-2 rounded-lg text-sm">{errorMsg}</div>}
        </div>

        {/* CONTENIDO DINÁMICO */}
        {data ? (
          <div className="space-y-4 animate-fade-in">
            
            {/* Resumen de IA */}
            {(data.traffic_summary || data.weather_summary) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700 backdrop-blur-sm">
                   <h4 className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tráfico</h4>
                   <p className="text-sm text-gray-200 leading-tight">{data.traffic_summary || "Sin datos"}</p>
                </div>
                <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700 backdrop-blur-sm">
                   <h4 className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Clima</h4>
                   <p className="text-sm text-gray-200 leading-tight">{data.weather_summary || "Sin datos"}</p>
                </div>
              </div>
            )}

            {/* Lista de Paradas */}
            <div className="mt-6">
              <h2 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3 ml-1">
                 {data.nearest_stations.length > 0 ? 'Sugerencias en Ruta' : 'Resultados'}
              </h2>
              
              {data.nearest_stations.length > 0 ? (
                data.nearest_stations.map((station, idx) => (
                  <GasStationCard key={idx} station={station} index={idx} />
                ))
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
                  <p>No se encontraron lugares relevantes en este tramo.</p>
                </div>
              )}
            </div>

          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">Sistema Activo. Esperando datos...</p>
            </div>
          )
        )}
      </main>

      {/* BOTÓN FLOTANTE INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent z-10 pointer-events-none">
        <button
          onClick={() => updateInfo(true)}
          disabled={loading}
          className={`
            w-full py-4 rounded-2xl shadow-2xl font-black text-lg tracking-wider uppercase transition-all transform pointer-events-auto
            ${loading 
              ? 'bg-gray-800 text-gray-500 scale-95 cursor-wait' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-95 shadow-blue-900/40'
            }
          `}
        >
          {loading ? 'Analizando...' : 'Escanear Ubicación'}
        </button>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleSaveSettings} 
      />
    </div>
  );
}

export default App;