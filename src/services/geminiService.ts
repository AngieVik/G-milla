import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, Coordinates, CoPilotResponse } from "../types";

export const fetchCoPilotInfo = async (
  coords: Coordinates,
  settings: AppSettings
): Promise<CoPilotResponse> => {

  // 1. Usar Key del usuario o del entorno
  const apiKey = settings.apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key no configurada. Ve a ajustes.");

  // 2. Inicializar cliente con esa Key
  const ai = new GoogleGenAI({ apiKey });

  // 3. Prompt (Igual que antes)
  const brandsFilter = settings.gasBrands.length > 0 
    ? `FILTRO ESTRICTO: Solo marcas ${settings.gasBrands.join(', ')}.` 
    : "Marcas: Cualquiera.";

  const userPrompt = `
    UBICACIÓN: Lat ${coords.latitude}, Long ${coords.longitude}.
    PREFERENCIAS: ${brandsFilter}. ${settings.showCafes ? 'Buscar cafeterías.' : ''}
    ${settings.showTraffic ? 'Verificar Tráfico DGT.' : ''}
    ${settings.showWeather ? 'Verificar Clima AEMET.' : ''}

    TAREA:
    1. Busca con Google Maps las 2 mejores opciones EN RUTA (hacia adelante).
    2. Reporta incidencias graves primero.
    3. Devuelve JSON estricto.
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
        systemInstruction: "Eres G-milla, copiloto de carretera."
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Respuesta vacía");
    return JSON.parse(responseText) as CoPilotResponse;

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      spoken_text: "Error de conexión o clave inválida.",
      weather_summary: "Error",
      traffic_summary: "Error",
      nearest_stations: []
    };
  }
};