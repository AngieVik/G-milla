import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, CoPilotResponse, Coordinates } from './types';
import { fetchCoPilotInfo } from './services/geminiService';
import SettingsModal from './components/SettingsModal';
import Dashboard from './components/Dashboard';
import { useWakeLock } from './hooks/useWakeLock';

const DEFAULT_SETTINGS: AppSettings = {
  checkFrequency: 5,
  voiceEnabled: true,
  showTraffic: true,
  showWeather: true,
  showCafes: false,
  gasBrands: [],
  apiKey: ''
};

const MIN_DISTANCE_TRIGGER_KM = 3.0;

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { isLocked } = useWakeLock(isScanning);

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

  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180)) * Math.cos(lat2*(Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (newSettings.apiKey) localStorage.setItem('gmilla_api_key', newSettings.apiKey);
    const { apiKey, ...prefs } = newSettings;
    localStorage.setItem('gmilla_prefs', JSON.stringify(prefs));
  };

  const handleStart = () => {
    const hasKey = settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!hasKey) {
      alert("⚠️ Falta API Key. Configúrala primero.");
      setIsSettingsOpen(true);
      return;
    }
    setIsScanning(true);
  };

  const handleStop = () => setIsScanning(false);

  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = 1.05;
    const v = window.speechSynthesis.getVoices().find(v => v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Monica')));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }, [settings.voiceEnabled]);

  const sendNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      new Notification(title, { body, icon: '/vite.svg', tag: 'gmilla-update' });
    }
  };

  const updateInfo = useCallback(async (force = false) => {
    if (loading || (!force && !isScanning)) return;
    setLoading(true); setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("GPS no disponible"); setLoading(false); return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const currentCoords: Coordinates = { 
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
          heading: pos.coords.heading, speed: pos.coords.speed 
        };
        setLocation(currentCoords);

        let shouldCallAI = force;
        if (!force && lastApiLocationRef.current && lastUpdate) {
          const distKm = calculateDistanceKm(lastApiLocationRef.current.latitude, lastApiLocationRef.current.longitude, currentCoords.latitude, currentCoords.longitude);
          const timeMins = (new Date().getTime() - lastUpdate.getTime()) / 60000;
          if (distKm >= MIN_DISTANCE_TRIGGER_KM || timeMins >= settings.checkFrequency) shouldCallAI = true;
        } else if (!lastApiLocationRef.current) shouldCallAI = true;

        if (shouldCallAI) {
            try {
              const result = await fetchCoPilotInfo(currentCoords, settings);
              setData(result); setLastUpdate(new Date()); lastApiLocationRef.current = currentCoords;
              if (result.spoken_text) speak(result.spoken_text);
              if (result.nearest_stations.length > 0) sendNotification(`G-milla: ${result.nearest_stations[0].name}`, result.spoken_text.slice(0,50));
            } catch (err) {
              console.error(err); setErrorMsg("Error IA. Verifica API Key.");
            }
        }
        setLoading(false);
      },
      (err) => { setErrorMsg("Error GPS"); setLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [loading, isScanning, lastUpdate, settings, speak]);

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

  // --- VISTA: HOME CINEMÁTICA ---
  if (!isScanning) {
    return (
      <div className="flex flex-col h-screen bg-gray-950 text-white items-center justify-center p-6 relative overflow-hidden font-sans">
        
        {/* FONDO RETRO WAVE (ANIMADO) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-gray-950 to-gray-950 z-0"></div>
        <div className="absolute inset-0 retro-grid animate-grid-flow z-0 opacity-30" style={{transform: 'perspective(500px) rotateX(60deg) translateY(0)'}}></div>
        <div className="absolute bottom-0 left-0 right-0 h-1/2 retro-horizon z-0"></div>

        <div className="z-10 text-center space-y-12 relative">
          <div className="mb-4">
            <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] transform -skew-x-12">
              G-MILLA
            </h1>
            <p className="text-blue-200 text-sm font-bold tracking-[0.3em] uppercase mt-2 opacity-80">AI DRIVING ASSISTANT</p>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <button 
              onClick={handleStart}
              className="relative w-64 h-20 rounded-full bg-black border border-blue-500/50 text-white font-black text-2xl tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-2xl"
            >
              {!settings.apiKey && !import.meta.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
              )}
              INICIAR
            </button>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 mx-auto text-xs font-mono text-gray-500 hover:text-white transition-colors uppercase tracking-wide"
          >
            <span className="border-b border-gray-700 pb-0.5 hover:border-white">
              {(settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) ? 'CONFIGURACIÓN SISTEMA' : '⚠️ REQUERIDO: API KEY'}
            </span>
          </button>
        </div>
        
        <div className="absolute bottom-6 text-[10px] text-gray-700 font-mono">v1.0.0 // SYSTEM READY</div>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />
      </div>
    );
  }

  // --- VISTA: DASHBOARD ---
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