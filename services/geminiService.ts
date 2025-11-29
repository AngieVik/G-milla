import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, Coordinates, CoPilotResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchCoPilotInfo = async (
  coords: Coordinates,
  settings: AppSettings
): Promise<CoPilotResponse> => {
  const brandsText = settings.gasBrands.length > 0 
    ? `Marcas preferidas: ${settings.gasBrands.join(', ')}.` 
    : "Cualquier marca de gasolinera.";
  
  const extras = [];
  if (settings.showCafes) extras.push("cafeterías y áreas de descanso");
  if (settings.showTraffic) extras.push("información de tráfico y restricciones (consulta DGT)");
  if (settings.showWeather) extras.push("meteorología (consulta AEMET)");

  const prompt = `
    Actúa como un copiloto inteligente llamado "G-milla".
    Mi ubicación actual es: Latitud ${coords.latitude}, Longitud ${coords.longitude}.
    
    Tareas:
    1. Busca las 2 gasolineras más cercanas y convenientes que estén EN MI RUTA probable (asume que sigo conduciendo en la dirección actual). ${brandsText}.
    2. Busca también ${extras.join(', ')}.
    3. Genera un resumen breve y útil para ser leído por voz (TTS) y datos estructurados para la pantalla.
    
    Reglas:
    - NO menciones precios.
    - NO menciones puntuaciones de estrellas.
    - El resumen de voz debe ser directo: "Tienes una Repsol a 2 kilómetros, el tráfico es fluido y hay probabilidad de lluvia según AEMET." (Ejemplo).
    - Si detectas incidencias graves de la DGT cerca, avisa primero.
    
    Devuelve la respuesta estrictamente en JSON.
  `;

  // Define schema strictly
  const schema = {
    type: Type.OBJECT,
    properties: {
      spoken_text: { type: Type.STRING, description: "Texto breve para ser leído en voz alta por el copiloto." },
      weather_summary: { type: Type.STRING, description: "Resumen muy breve del clima." },
      traffic_summary: { type: Type.STRING, description: "Resumen muy breve del tráfico." },
      nearest_stations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            address: { type: Type.STRING },
            distance: { type: Type.STRING, description: "Distancia estimada" }
          }
        }
      }
    },
    required: ["spoken_text", "nearest_stations"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: coords.latitude,
              longitude: coords.longitude
            }
          }
        },
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "Eres G-milla, un copiloto experto que ayuda a conductores en España."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as CoPilotResponse;

  } catch (error) {
    console.error("Gemini Error:", error);
    // Return a safe fallback
    return {
      spoken_text: "Lo siento, hubo un error conectando con los servicios de Google.",
      weather_summary: "--",
      traffic_summary: "--",
      nearest_stations: []
    };
  }
};
