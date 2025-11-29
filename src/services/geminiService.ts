// src/services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, Coordinates, CoPilotResponse } from "../types";

// Inicializamos el cliente con la librería unificada
// Asegúrate de que tu .env.local tenga la clave GEMINI_API_KEY definida
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

export const fetchCoPilotInfo = async (
  coords: Coordinates,
  settings: AppSettings
): Promise<CoPilotResponse> => {

  // 1. Construir el Prompt del Sistema (Contexto)
  const brandsFilter = settings.gasBrands.length > 0 
    ? `FILTRO ESTRICTO: Solo busca gasolineras de las marcas: ${settings.gasBrands.join(', ')}.` 
    : "Marcas aceptadas: Cualquiera.";

  const interests = [];
  if (settings.showCafes) interests.push("cafeterías de carretera y áreas de descanso");
  
  // Definimos las herramientas (Tools) dinámicamente según configuración
  const promptTools = [];
  if (settings.showTraffic) promptTools.push("Consulta el estado del tráfico (DGT) en la vía actual.");
  if (settings.showWeather) promptTools.push("Consulta alertas meteorológicas (AEMET) en la zona.");

  const userPrompt = `
    UBICACIÓN ACTUAL: Latitud ${coords.latitude}, Longitud ${coords.longitude}.
    PREFERENCIAS:
    - ${brandsFilter}
    - Buscar también: ${interests.join(', ')}.
    - Instrucciones: ${promptTools.join(' ')}

    TAREA:
    1. Usa Google Maps para encontrar las 2 mejores opciones (Gasolineras o Cafés) que estén EN RUTA (hacia adelante).
    2. Si hay incidencias graves de tráfico o clima, repórtalas primero.
    3. Genera un JSON estricto con la respuesta.
    
    IMPORTANTE:
    - Si no hay nada relevante o peligroso, devuelve texto vacío en "spoken_text".
    - NO inventes datos. Usa el Grounding de Google Maps.
  `;

  // 2. Definir el Schema usando 'Type' (Correcto para @google/genai)
  const schema = {
    type: Type.OBJECT,
    properties: {
      spoken_text: { 
        type: Type.STRING, 
        description: "Texto para voz. Vacío si no hay nada relevante." 
      },
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
    // 3. Llamada correcta a la API unificada
    // Usamos el modelo 'gemini-2.0-flash-exp' que es más rápido, o 'gemini-1.5-flash'
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", 
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        tools: [{ googleMaps: {} }], // Grounding nativo
        systemInstruction: "Eres G-milla, un copiloto IA que ayuda a conductores. Prioriza la seguridad y la brevedad."
      }
    });

    // 4. Parseo de respuesta
    const responseText = response.text;
    if (!responseText) throw new Error("Respuesta vacía de Gemini");
    
    // Convertimos el texto JSON a objeto
    return JSON.parse(responseText) as CoPilotResponse;

  } catch (error) {
    console.error("Error en Gemini Service:", error);
    // Fallback silencioso en caso de error
    return {
      spoken_text: "",
      weather_summary: "No disponible",
      traffic_summary: "No disponible",
      nearest_stations: []
    };
  }
};