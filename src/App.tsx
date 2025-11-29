import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, CoPilotResponse, Coordinates, AVAILABLE_BRANDS } from './types';
import { fetchCoPilotInfo } from './services/geminiService';
import SettingsModal from './components/SettingsModal';
import GasStationCard from './components/GasStationCard';

// Configuración por defecto
const DEFAULT_SETTINGS: AppSettings = {
  checkFrequency: 5, // minutos
  voiceEnabled: true,
  showTraffic: true,
  showWeather: true,
  showCafes: false,
  gasBrands: [] // Vacío = Todas
};

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Estado para la respuesta de la IA
  const [data, setData] = useState<CoPilotResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Referencia para el temporizador
  const timerRef = useRef<number | null>(null);

  // --- SISTEMA DE VOZ (TTS) ---
  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled || !window.speechSynthesis || !text) return;
    
    // Cancelamos cualquier audio anterior para no solapar
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05; // Un pelín más rápido para sonar fluido
    
    // Intentar buscar una voz de Google en español
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Monica')));
    if (esVoice) utterance.voice = esVoice;

    window.speechSynthesis.speak(utterance);
  }, [settings.voiceEnabled]);

  // --- NOTIFICACIONES PUSH ---
  const sendNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      // Solo notificamos si la app NO está en pantalla (estás en Waze/Maps)
      new Notification(title, { 
        body, 
        icon: '/vite.svg', // Asegúrate de tener un icono o quita esta línea
        tag: 'gmilla-update' // Evita acumular muchas notificaciones
      });
    }
  };

  // --- LÓGICA CORE: Actualizar Información ---
  const updateInfo = useCallback(async (force = false) => {
    if (loading) return;
    
    // Verificación de tiempo (si no es forzado)
    if (!force && lastUpdate) {
      const diffMins = (new Date().getTime() - lastUpdate.getTime()) / 60000;
      if (diffMins < settings.checkFrequency) return;
    }

    setLoading(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("GPS no disponible en este dispositivo");
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

        try {
          // 1. Llamada a Gemini (Tu "Cerebro")
          const result = await fetchCoPilotInfo(coords, settings);
          
          setData(result);
          setLastUpdate(new Date());
          
          // 2. Ejecutar Voz (Si hay texto relevante)
          if (result.spoken_text) {
             speak(result.spoken_text);
          }

          // 3. Notificación Push (Si estás en segundo plano)
          if (result.nearest_stations.length > 0) {
            const topStation = result.nearest_stations[0];
            sendNotification(
              `G-milla: ${topStation.name}`, 
              `Aprox ${topStation.distance || 'cerca'}. ${result.spoken_text.slice(0, 40)}...`
            );
          }

        } catch (err) {
          console.error(err);
          setErrorMsg("Error conectando con G-milla IA");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("GPS Error:", err);
        setErrorMsg("Acceso a ubicación denegado. Revisa permisos.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

  }, [loading, lastUpdate, settings, speak]);

  // --- EFECTOS (Ciclo de Vida) ---

  // 1. Cargar voces y pedir permisos al inicio
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    // Precarga de voces (Chrome a veces tarda)
    window.speechSynthesis.getVoices();
  }, []);

  // 2. Gestión inteligente del Segundo Plano (Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Si el usuario VUELVE a la app después de un rato, actualizamos si toca
      if (document.visibilityState === 'visible') {
        updateInfo(false); 
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [updateInfo]);

  // 3. Temporizador (Timer)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Revisamos cada 30 segundos si toca actualizar (según la frecuencia elegida)
    timerRef.current = window.setInterval(() => {
      updateInfo(false);
    }, 30 * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [updateInfo]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      
      {/* HEADER FIJO */}
      <header className="px-4 py-3 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 flex justify-between items-center z-20 shadow-lg">
        <div className="flex items-center gap-2">
           <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
           <h1 className="text-xl font-black italic tracking-tighter text-gray-100">
             G-MILLA
           </h1>
        </div>
        
        <div className="flex gap-3">
           {/* Botón Voz */}
           <button 
            onClick={() => setSettings(s => ({...s, voiceEnabled: !s.voiceEnabled}))}
            className={`p-2 rounded-full transition-all active:scale-95 ${settings.voiceEnabled ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50' : 'bg-red-500/20 text-red-400'}`}
           >
             {settings.voiceEnabled ? (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
             ) : (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
             )}
           </button>
           
           {/* Botón Config */}
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="p-2 bg-gray-800 rounded-full text-gray-300 hover:bg-gray-700 active:scale-95 transition-colors"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <p className="text-gray-400 text-sm">Listo para iniciar viaje</p>
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
        onSave={setSettings}
      />
    </div>
  );
}

export default App;