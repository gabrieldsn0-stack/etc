import assert from "node:assert/strict";
import { test } from "node:test";
import { enviarLembretes } from "../src/lembretes.js";
import { AGORA, CLINICA, agendaTemporaria } from "./ajuda.js";

test("envia um lembrete por consulta na véspera, depois da hora configurada", async () => {
  const clinica = { ...CLINICA, lembrete: { nomeModelo: "lembrete_consulta", aPartirDe: "09:00" } };
  const agenda = agendaTemporaria();
  await agenda.agendar({ telefone: "5511988880000", nome: "Maria Silva", data: "2026-11-05", hora: "09:00", procedimento: "Consulta" }, AGORA);
  const enviados = [];
  const whatsapp = { enviarModelo: async (...args) => enviados.push(args) };

  // 08:00 em São Paulo: ainda cedo
  assert.equal(await enviarLembretes({ agenda, whatsapp, clinica, instante: new Date("2026-11-04T11:00:00Z") }), 0);
  // 10:00 em São Paulo
  const dezHoras = new Date("2026-11-04T13:00:00Z");
  assert.equal(await enviarLembretes({ agenda, whatsapp, clinica, instante: dezHoras }), 1);
  assert.deepEqual(enviados[0], ["5511988880000", "lembrete_consulta", "pt_BR", ["Maria", "quinta-feira", "05/11/2026", "09:00", "Clínica Teste"]]);
  assert.equal(await enviarLembretes({ agenda, whatsapp, clinica, instante: dezHoras }), 0);
});
