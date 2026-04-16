// normalizer.ts

export interface CidadaoProcessado {
  citizenId: string;
  sleepIndex: number;
  activityIndex: number;
  envExposure: number;
  timestamp: string;
}

export function normalizarStatus(linha: any): CidadaoProcessado {
  return {
    // Mapeia CitizenID (CSV) ou user_id (JSON)
    citizenId: String(linha.CitizenID || linha.user_id || "DESCONHECIDO").trim(),
    
    // Mapeia os nomes longos do novo arquivo para as variáveis do sistema
    sleepIndex: Number(linha.SleepQualityIndex || 0),
    activityIndex: Number(linha.PhysicalActivityIndex || 0),
    envExposure: Number(linha.EnvironmentalExposureLevel || 0),
    
    timestamp: String(linha.Timestamp || new Date().toISOString()),
  };
}