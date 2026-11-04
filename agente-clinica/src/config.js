import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { AgendaArquivo } from "./agenda/arquivo.js";
import { AgendaPlanilha } from "./agenda/planilha.js";
import { ServicoAgenda } from "./agenda/servico.js";
import { criarAgente } from "./agente.js";

export function variavel(nome, padrao) {
  const valor = process.env[nome] ?? padrao;
  if (valor === undefined || valor === "") {
    throw new Error(`Falta a variável de ambiente ${nome}. Veja o arquivo .env.exemplo.`);
  }
  return valor;
}

export function carregarClinica() {
  return JSON.parse(readFileSync(variavel("ARQUIVO_CLINICA", "clinica.json"), "utf8"));
}

export async function montarAgenda(clinica, { arquivoPadrao = "dados/agenda.json" } = {}) {
  let armazenamento;
  if (variavel("AGENDA", "arquivo") === "planilha") {
    armazenamento = new AgendaPlanilha({
      planilhaId: variavel("PLANILHA_ID"),
      aba: variavel("PLANILHA_ABA", "Agendamentos"),
      emailContaServico: variavel("GOOGLE_EMAIL_CONTA_SERVICO"),
      // A chave costuma vir com "\n" escrito; transformamos em quebras de linha de verdade.
      chavePrivada: variavel("GOOGLE_CHAVE_PRIVADA").replace(/\\n/g, "\n"),
    });
    await armazenamento.prepararCabecalho();
  } else {
    armazenamento = new AgendaArquivo(variavel("ARQUIVO_AGENDA", arquivoPadrao));
  }
  return new ServicoAgenda({ armazenamento, clinica });
}

export function montarAgente(clinica, agenda) {
  return criarAgente({
    // Lê ANTHROPIC_API_KEY do ambiente.
    cliente: new Anthropic(),
    clinica,
    agenda,
    modelo: variavel("MODELO", "claude-opus-5-5"),
    esforco: variavel("ESFORCO", "medium"),
  });
}
