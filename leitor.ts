import { parse } from "https://deno.land/std@0.200.0/csv/parse.ts";
import { normalizarStatus } from "./normalizer.ts";

// --- CAMADAS DE LÓGICA ---
function calcularMediana(v: number[]) {
  if (v.length === 0) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function analisarL1(valor: number, hist: number[]) {
  if (hist.length < 3) return { status: "COLETANDO", score: 0 };
  const med = calcularMediana(hist);
  const desvios = hist.map(v => Math.abs(v - med));
  const mad = calcularMediana(desvios) || 1;
  const score = Math.abs(valor - med) / mad;
  return { status: score > 1.5 ? "ANOMALIA" : "ESTÁVEL", score };
}

async function executarMotorMirrorLife() {
  try {
    console.clear();
    console.log("======================================================");
    console.log("📡 SISTEMA THE EYE: MONITORAMENTO PROATIVO");
    console.log("======================================================\n");

    // 1. CARREGAR BASES
    const usuariosRaw = await Deno.readTextFile("./users.json");
    const listaUsuarios = JSON.parse(usuariosRaw);
    const mapaNomes = new Map(listaUsuarios.map((u: any) => [String(u.user_id).trim(), `${u.first_name} ${u.last_name}`]));

    const locaisRaw = await Deno.readTextFile("./locations.json");
    const listaLocais = JSON.parse(locaisRaw);
    const mapaLocais = new Map();
    const alertasPorCidadao = new Map<string, number>();
    listaLocais.forEach((l: any) => mapaLocais.set(String(l.user_id).trim(), l.city));

    const statusTexto = await Deno.readTextFile("./Status.csv");
    const linhasStatus = parse(statusTexto, {
      skipFirstRow: true,
      columns: ["EventID", "CitizenID", "EventType", "PhysicalActivityIndex", "SleepQualityIndex", "EnvironmentalExposureLevel", "Timestamp"]
    }) as any[];

    // Injeção de Stress (Craig)
    linhasStatus.push({ CitizenID: "WNACROYX", SleepQualityIndex: "8", PhysicalActivityIndex: "92", EnvironmentalExposureLevel: "88" });

    const historicos = new Map<string, number[]>();
    const encaminhadosIA: string[] = [];
    
    // Contadores de Filtragem
    let totalEntradas = 0;
    let l0Passaram = 0;
    let l1Anomalias = 0;

    for (const linha of linhasStatus) {
      totalEntradas++;
      const dado = normalizarStatus(linha);
      const idLimpo = String(dado.citizenId).trim();
      
      // CAMADA L0: Integridade básica
      if (!idLimpo || idLimpo === "DESCONHECIDO") continue;
      l0Passaram++;

      const nomeCidadao = mapaNomes.get(idLimpo) || idLimpo;
      const cidadeAtual = mapaLocais.get(idLimpo) || "Desconhecido";
      const meuHist = historicos.get(idLimpo) || [];
      const resL1 = analisarL1(dado.sleepIndex, meuHist);

      // CAMADA L2: Decisão de Encaminhamento
      const riscoL2 = resL1.score > 3.0 && (dado.activityIndex > 60 || dado.envExposure > 70);

      // SAÍDA EM TEMPO REAL (LIMPA)
      if (meuHist.length >= 3) {
        if (resL1.status === "ANOMALIA") {
          l1Anomalias++;
          const prefixo = riscoL2 ? "🚨 [CRÍTICO]" : "🟡 [DESVIO] ";
          console.log(`${prefixo} ${nomeCidadao.padEnd(20)} | Score L1: ${resL1.score.toFixed(2)}`);
        }
      }

      if (riscoL2) {
        // Contabiliza quantas vezes esse cidadão falhou na L2
        const totalAlertas = (alertasPorCidadao.get(nomeCidadao) || 0) + 1;
        alertasPorCidadao.set(nomeCidadao, totalAlertas);
        
        // Guarda para o bloco da IA com o detalhe da cidade
        encaminhadosIA.push(`${nomeCidadao} (${cidadeAtual})`);
      }

      meuHist.push(dado.sleepIndex);
      historicos.set(idLimpo, meuHist);
    }

    // --- BLOCO FINAL: ENCAMINHAMENTO (AJUSTADO) ---
    console.log("\n------------------------------------------------------");
    console.log("🤖 ENCAMINHADOS PARA IA (L3/L4):");
    if (alertasPorCidadao.size > 0) {
      alertasPorCidadao.forEach((qtd, nome) => {
        console.log(`   👉 ${nome.padEnd(20)} | Status: ${qtd} eventos críticos detectados`);
      });
    } else {
      console.log("   ✅ Nenhum cidadão requer intervenção.");
    }

    // --- BLOCO FINAL: MÉTRICAS ---
    console.log("------------------------------------------------------");
    console.log("📊 RESUMO DE FILTRAGEM POR CAMADA:");
    console.log(`   L0 (Integridade):   ${l0Passaram} de ${totalEntradas} registros aprovados.`);
    console.log(`   L1 (Estatística):   ${l1Anomalias} anomalias detectadas.`);
    console.log(`   L2 (Semântica):     ${encaminhadosIA.length} casos promovidos à IA.`);
    
    const economia = (100 - (encaminhadosIA.length / totalEntradas * 100)).toFixed(1);
    console.log(`\n✅ EFICIÊNCIA DO FILTRO: ${economia}% de economia de processamento.`);
    console.log("======================================================\n");

  } catch (erro) {
    console.error("❌ ERRO:", erro.message);
  }
}

executarMotorMirrorLife();