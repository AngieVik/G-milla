export interface Coordinates {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;   
}

export interface GasStation {
  name: string;
  address: string;
  location?: Coordinates;
  distance?: string; // e.g. "2.5 km"
}

export interface CoPilotResponse {
  spoken_text: string;
  weather_summary: string;
  traffic_summary: string;
  nearest_stations: GasStation[];
}

export interface AppSettings {
  checkFrequency: number; // minutes
  voiceEnabled: boolean;
  showTraffic: boolean;
  showWeather: boolean;
  showCafes: boolean;
  gasBrands: string[]; // e.g. ['Repsol', 'BP'] or [] for all
  apiKey?: string;
}

export const AVAILABLE_BRANDS = ['Repsol', 'BP', 'Cepsa', 'Galp', 'Shell', 'Avia'];
