import { parse } from "https://deno.land/std@0.200.0/csv/parse.ts";
import { normalizarStatus, CidadaoProcessado } from "./normalizer.ts";

// --- FUNÇÕES DE APOIO ---
function calcularMediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[meio] : (sorted[meio - 1] + sorted[meio]) / 2;
}

function analisarL1(valorAtual: number, historico: number[]) {
  if (historico.length < 3) return { anomalia: false, score: 0, mediana: 0 };
  const mediana = calcularMediana(historico);
  const desvios = historico.map(v => Math.abs(v - mediana));
  const mad = calcularMediana(desvios) || 1; 
  const scoreAnomalia = Math.abs(valorAtual - mediana) / mad;
  return { anomalia: scoreAnomalia > 3, score: scoreAnomalia, mediana: mediana };
}

function analisarL2(dado: CidadaoProcessado, resultadoL1: any) {
  let scoreFinal = resultadoL1.score;
  let gatilhos: string[] = [];
  if (dado.activityIndex > 8 && resultadoL1.anomalia) {
    scoreFinal += 2;
    gatilhos.push("Exaustão Física");
  }
  if (dado.envExposure > 7 && resultadoL1.score > 2) {
    scoreFinal += 1.5;
    gatilhos.push("Risco Ambiental");
  }
  return { precisaIA: scoreFinal > 4.5, scoreFinal: scoreFinal, diagnostico: gatilhos.join(" | ") };
}

function executarL0(dado: CidadaoProcessado) {
  if (dado.citizenId.length < 3) return { aprovado: false, motivo: "ID Inválido" };
  if (isNaN(dado.sleepIndex) || dado.sleepIndex < 0 || dado.sleepIndex > 100) {
    return { aprovado: false, motivo: `Outlier Sensor (${dado.sleepIndex})` };
  }
  return { aprovado: true };
}

async function processarMirrorLife() {
  try {
    console.clear();
    console.log("====================================================");
    console.log("📡 MONITORAMENTO REAL-TIME: MIRRORLIFE ENGINE");
    console.log("====================================================\n");

    const conteudo = await Deno.readTextFile("./Status.csv");
    const registros = parse(conteudo, { skipFirstRow: true, columns: ["EventID", "CitizenID", "EventType", "Activity", "Sleep", "Env", "Timestamp"] });

    // Contadores para o Relatório
    let totalL0Bloqueados = 0;
    let totalL1Anomalias = 0;
    let totalL2Criticos = 0;
    const historicos = new Map<string, number[]>();

    for (const linha of registros) {
      const dado = normalizarStatus(linha);
      
      // L0 - Integridade
      const resL0 = executarL0(dado);
      if (!resL0.aprovado) {
        totalL0Bloqueados++;
        console.log(`[L0] ❌ BLOQUEIO | ID: ${dado.citizenId.padEnd(10)} | ${resL0.motivo}`);
        continue;
      }

      if (!historicos.has(dado.citizenId)) historicos.set(dado.citizenId, []);
      const meuHistorico = historicos.get(dado.citizenId)!;
      
      // L1 - Estatística
      const resL1 = analisarL1(dado.sleepIndex, meuHistorico);
      if (resL1.anomalia) totalL1Anomalias++;

      // L2 - Semântica
      const resL2 = analisarL2(dado, resL1);

      if (resL2.precisaIA) {
        totalL2Criticos++;
        console.log(`[L2] 🚨 CRÍTICO  | ID: ${dado.citizenId.padEnd(10)} | Score: ${resL2.scoreFinal.toFixed(2)} | ${resL2.diagnostico}`);
      } else if (resL1.anomalia) {
        console.log(`[L1] 🟡 ATENÇÃO  | ID: ${dado.citizenId.padEnd(10)} | Score: ${resL1.score.toFixed(2)} | Desvio de Trajetória`);
      }

      meuHistorico.push(dado.sleepIndex);
    }

    // --- RELATÓRIO EXPANDIDO ---
    console.log("\n" + "=".repeat(52));
    console.log(`📊 RELATÓRIO DE PERFORMANCE DAS CAMADAS`);
    console.log(`- Total de Entradas:      ${registros.length}`);
    console.log("----------------------------------------------------");
    console.log(` Camada L0 (Sintaxe):   ${totalL0Bloqueados} descartados`);
    console.log(` Camada L1 (Estat.):    ${totalL1Anomalias} anomalias detectadas`);
    console.log(` Camada L2 (Semânt.):   ${totalL2Criticos} casos p/ intervenção`);
    console.log("----------------------------------------------------");
    
    const eficiência = (((registros.length - totalL2Criticos) / registros.length) * 100).toFixed(1);
    console.log(`✅ Eficiência Econômica: ${eficiência}% dos dados filtrados`);
    console.log(`🚀 Encaminhados p/ IA:   ${totalL2Criticos} cidadãos`);
    console.log("=".repeat(52));

  } catch (erro) {
    // @ts-ignore
    console.error("❌ ERRO:", erro.message);
  }
}

processarMirrorLife();