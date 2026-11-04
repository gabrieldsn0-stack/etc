import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgendaArquivo } from "../src/agenda/arquivo.js";
import { ServicoAgenda } from "../src/agenda/servico.js";

// Quarta-feira, 04/11/2026, 10:00
export const AGORA = { data: "2026-11-04", hora: "10:00" };

export const CLINICA = {
  nome: "Clínica Teste",
  fuso: "America/Sao_Paulo",
  telefoneEquipe: "5511999990000",
  duracaoConsultaMin: 30,
  antecedenciaMinimaMin: 60,
  diasMaximosAFrente: 30,
  maxConsultasPorPaciente: 2,
  horarios: {
    seg: [["08:00", "12:00"]],
    ter: [["08:00", "12:00"]],
    qua: [["08:00", "12:00"], ["14:00", "16:00"]],
    qui: [["08:00", "12:00"]],
    sex: [["08:00", "12:00"]],
    sab: [],
    dom: [],
  },
  bloqueios: ["2026-11-20"],
  procedimentos: [
    { nome: "Consulta", duracaoMin: 30 },
    { nome: "Limpeza de pele", duracaoMin: 60 },
  ],
};

export function agendaTemporaria() {
  const pasta = mkdtempSync(join(tmpdir(), "agenda-"));
  return new ServicoAgenda({ armazenamento: new AgendaArquivo(join(pasta, "agenda.json")), clinica: CLINICA });
}
