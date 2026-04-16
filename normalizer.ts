// normalizer.ts

// Definindo como um "Cidadão" deve ser lido pelo sistema
export interface CidadaoProcessado {
  citizenId: string;
  sleepIndex: number;
  activityIndex: number;
  envExposure: number;
  timestamp: string;
}

export function normalizarStatus(linha: any): CidadaoProcessado {
  return {
    citizenId: String(linha.CitizenID).trim(),
    // Convertendo strings para números para as camadas matemáticas (L1)
    sleepIndex: Number(linha.Sleep) || 0,
    activityIndex: Number(linha.Activity) || 0,
    envExposure: Number(linha.Env) || 0,
    timestamp: linha.Timestamp,
  };
}