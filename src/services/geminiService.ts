import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, Coordinates, CoPilotResponse } from "../types";

// Helper para traducir grados a dirección humana
const getCardinalDirection = (heading: number) => {
  const directions = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
  const index = Math.round(((heading %= 360) < 0 ? heading + 360 : heading) / 45) % 8;
  return directions[index];
};

export const fetchCoPilotInfo = async (
  coords: Coordinates,
  settings: AppSettings
): Promise<CoPilotResponse> => {

  // 1. OBTENCIÓN DE LA CLAVE
  const apiKey = settings.apiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key no configurada.");

  // 2. INICIALIZACIÓN
  const ai = new GoogleGenAI({ apiKey });

  // 3. CONTEXTO DE MOVIMIENTO (NUEVO)
  let movementContext = "Vehículo detenido o sin datos de brújula.";
  if (coords.heading !== null && coords.heading !== undefined && !isNaN(coords.heading)) {
    const direction = getCardinalDirection(coords.heading);
    movementContext = `VEHÍCULO EN MOVIMIENTO: Rumbo hacia el ${direction} (${coords.heading.toFixed(0)} grados).`;
  }

  // 4. PROMPT MEJORADO
  const brandsFilter = settings.gasBrands.length > 0 
    ? `FILTRO ESTRICTO: Solo marcas ${settings.gasBrands.join(', ')}.` 
    : "Marcas: Cualquiera.";

  const interests = [];
  if (settings.showCafes) interests.push("cafeterías de carretera y áreas de descanso");

  const promptTools = [];
  if (settings.showTraffic) promptTools.push("Consulta el estado del tráfico (DGT) en la vía actual.");
  if (settings.showWeather) promptTools.push("Consulta alertas meteorológicas (AEMET) en la zona.");

  const userPrompt = `
    UBICACIÓN: Lat ${coords.latitude}, Long ${coords.longitude}.
    ${movementContext}
    
    PREFERENCIAS: ${brandsFilter}. ${interests.length > 0 ? 'Buscar también ' + interests.join(', ') : ''}
    ${promptTools.join(' ')}

    TAREA CRÍTICA:
    1. Usa Google Maps para buscar opciones que estén ADELANTE en mi sentido de la marcha.
    2. DESCARTA lugares que ya he pasado o que están en sentido contrario de la autovía.
    3. Si hay incidencias graves, repórtalas primero.
    4. Devuelve JSON estricto.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      spoken_text: { type: Type.STRING },
      weather_summary: { type: Type.STRING, nullable: true },
      traffic_summary: { type: Type.STRING, nullable: true },
      nearest_stations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            address: { type: Type.STRING },
            distance: { type: Type.STRING },
            location: {
              type: Type.OBJECT,
              properties: {
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    },
    required: ["spoken_text", "nearest_stations"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", 
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
        systemInstruction: "Eres G-milla, un copiloto experto. Prioriza seguridad y dirección de ruta."
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Respuesta vacía");
    return JSON.parse(responseText) as CoPilotResponse;

  } catch (error) {
    console.error("Gemini Service Error:", error);
    const errStr = String(error);
    if (errStr.includes("401") || errStr.includes("403") || errStr.includes("API key")) {
        return {
            spoken_text: "Error de clave API. Revísala en configuración.",
            weather_summary: "Error Key",
            traffic_summary: "Error Key",
            nearest_stations: []
        };
    }
    return {
      spoken_text: "",
      weather_summary: "--",
      traffic_summary: "--",
      nearest_stations: []
    };
  }
};