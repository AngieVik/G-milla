import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, CoPilotResponse, Coordinates } from './types'; //
import { fetchCoPilotInfo } from './services/geminiService'; //
import SettingsModal from './components/SettingsModal'; //
import Dashboard from './components/Dashboard'; // <--- NUEVO IMPORT
import { useWakeLock } from './hooks/useWakeLock'; // <--- NUEVO IMPORT

const DEFAULT_SETTINGS: AppSettings = {
  checkFrequency: 5,
  voiceEnabled: true,
  showTraffic: true,
  showWeather: true,
  showCafes: false,
  gasBrands: [],
  apiKey: ''
};

// Distancia mínima para reactivar IA (km)
const MIN_DISTANCE_TRIGGER_KM = 3.0;

function App() {
  // ESTADO
  const [isScanning, setIsScanning] = useState(false); // Renombrado de isAppActive para coherencia
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // HOOK WAKE LOCK (Toda la magia está aquí dentro)
  const { isLocked } = useWakeLock(isScanning);

  // Carga inicial
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedKey = localStorage.getItem('gmilla_api_key');
    const savedPrefs = localStorage.getItem('gmilla_prefs');
    if (savedPrefs) return { ...DEFAULT_SETTINGS, ...JSON.parse(savedPrefs), apiKey: savedKey || '' };
    return { ...DEFAULT_SETTINGS, apiKey: savedKey || '' };
  });

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CoPilotResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const lastApiLocationRef = useRef<Coordinates | null>(null);
  const timerRef = useRef<number | null>(null);

  // --- LÓGICA DE DISTANCIA ---
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180)) * Math.cos(lat2*(Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // --- MANEJADORES ---
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (newSettings.apiKey) localStorage.setItem('gmilla_api_key', newSettings.apiKey);
    const { apiKey, ...prefs } = newSettings;
    localStorage.setItem('gmilla_prefs', JSON.stringify(prefs));
  };

  const handleStart = () => {
    const hasKey = settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!hasKey) {
      alert("⚠️ Falta la API Key en configuración.");
      setIsSettingsOpen(true);
      return;
    }
    setIsScanning(true);
  };

  const handleStop = () => {
    setIsScanning(false);
    // El hook useWakeLock liberará el bloqueo automáticamente al cambiar isScanning a false
  };

  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    const v = window.speechSynthesis.getVoices().find(v => v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Monica')));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }, [settings.voiceEnabled]);

  const sendNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      new Notification(title, { body, icon: '/vite.svg', tag: 'gmilla-update' });
    }
  };

  // --- CORE UPDATE ---
  const updateInfo = useCallback(async (force = false) => {
    if (loading || (!force && !isScanning)) return;

    setLoading(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("GPS no disponible");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const currentCoords: Coordinates = { 
          latitude: pos.coords.latitude, 
          longitude: pos.coords.longitude,
          heading: pos.coords.heading, 
          speed: pos.coords.speed 
        };
        setLocation(currentCoords);

        // Lógica de disparo inteligente
        let shouldCallAI = force;
        if (!force && lastApiLocationRef.current && lastUpdate) {
          const distKm = calculateDistanceKm(lastApiLocationRef.current.latitude, lastApiLocationRef.current.longitude, currentCoords.latitude, currentCoords.longitude);
          const timeMins = (new Date().getTime() - lastUpdate.getTime()) / 60000;

          if (distKm >= MIN_DISTANCE_TRIGGER_KM || timeMins >= settings.checkFrequency) {
            shouldCallAI = true;
          }
        } else if (!lastApiLocationRef.current) {
            shouldCallAI = true;
        }

        if (shouldCallAI) {
            try {
              const result = await fetchCoPilotInfo(currentCoords, settings);
              setData(result);
              setLastUpdate(new Date());
              lastApiLocationRef.current = currentCoords;
              
              if (result.spoken_text) speak(result.spoken_text);
              if (result.nearest_stations.length > 0) sendNotification(`G-milla: ${result.nearest_stations[0].name}`, result.spoken_text.slice(0,50));
            } catch (err) {
              console.error(err);
              setErrorMsg("Error IA. Verifica API Key.");
            }
        }
        setLoading(false);
      },
      (err) => { setErrorMsg("Error GPS"); setLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [loading, isScanning, lastUpdate, settings, speak]);

  // --- EFECTOS ---
  // Timer de sondeo GPS (cada 10s verifica si te has movido lo suficiente)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isScanning) {
      updateInfo(true); 
      timerRef.current = window.setInterval(() => updateInfo(false), 10000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isScanning, updateInfo]);

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
    window.speechSynthesis.getVoices();
  }, []);

  // --- RENDERIZADO ---
  
  // VISTA 1: HOME
  if (!isScanning) {
    return (
      <div className="flex flex-col h-screen bg-gray-950 text-white items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-blue-900/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"></div>
        <div className="z-10 text-center space-y-10">
          <div className="mb-4">
            <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-600 mb-2">G-MILLA</h1>
            <p className="text-gray-400 text-lg tracking-widest uppercase">Copiloto Inteligente</p>
          </div>
          <button onClick={handleStart} className="w-64 h-64 rounded-full bg-gradient-to-b from-blue-600 to-blue-800 text-white font-black text-2xl shadow-[0_0_60px_-15px_rgba(37,99,235,0.5)] border-4 border-blue-400/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative group">
            {!settings.apiKey && !import.meta.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY && (
              <div className="absolute top-4 right-4 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
            )}
            INICIAR
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className={`flex items-center gap-2 mx-auto transition-colors ${!settings.apiKey && !import.meta.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY ? 'text-blue-400 animate-pulse font-bold' : 'text-gray-500 hover:text-white'}`}>
            <span>{(settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) ? 'Configuración' : 'Configurar API Key (Requerido)'}</span>
          </button>
        </div>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />
      </div>
    );
  }

  // VISTA 2: DASHBOARD (SEPARADO)
  return (
    <>
      <Dashboard 
        isLocked={isLocked}
        settings={settings}
        data={data}
        loading={loading}
        errorMsg={errorMsg}
        onUpdate={updateInfo}
        onStop={handleStop}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleVoice={() => setSettings(s => ({...s, voiceEnabled: !s.voiceEnabled}))}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />
    </>
  );
}

export default App;