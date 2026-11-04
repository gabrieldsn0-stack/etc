import assert from "node:assert/strict";
import { test } from "node:test";
import { AGORA, agendaTemporaria } from "./ajuda.js";

const PEDIDO = { telefone: "+55 11 98888-0000", nome: "Maria Silva", data: "2026-11-05", hora: "09:00", procedimento: "Consulta", observacao: "" };

test("agenda e não deixa marcar o mesmo horário duas vezes", async () => {
  const agenda = agendaTemporaria();
  const r = await agenda.agendar(PEDIDO, AGORA);
  assert.equal(r.ok, true);
  assert.equal(r.agendamento.telefone, "5511988880000");

  const repetido = await agenda.agendar({ ...PEDIDO, telefone: "5511977770000" }, AGORA);
  assert.equal(repetido.ok, false);
  assert.ok(!repetido.horariosLivresNoDia.includes("09:00"));
});

test("pedidos simultâneos para o mesmo horário: só um é aceito", async () => {
  const agenda = agendaTemporaria();
  const resultados = await Promise.all([
    agenda.agendar(PEDIDO, AGORA),
    agenda.agendar({ ...PEDIDO, telefone: "5511977770000", nome: "João" }, AGORA),
  ]);
  assert.deepEqual(resultados.map((r) => r.ok).sort(), [false, true]);
});

test("só cancela consultas do próprio telefone e libera o horário", async () => {
  const agenda = agendaTemporaria();
  const { agendamento } = await agenda.agendar(PEDIDO, AGORA);

  const deOutro = await agenda.cancelar(agendamento.id, "5511977770000", AGORA);
  assert.equal(deOutro.ok, false);

  const proprio = await agenda.cancelar(agendamento.id.toLowerCase(), PEDIDO.telefone, AGORA);
  assert.equal(proprio.ok, true);
  assert.ok((await agenda.livres("2026-11-05", "Consulta", AGORA)).horarios.includes("09:00"));
  assert.deepEqual(await agenda.consultasDoPaciente(PEDIDO.telefone, AGORA), []);
});

test("limita quantas consultas um número pode marcar", async () => {
  const agenda = agendaTemporaria();
  await agenda.agendar(PEDIDO, AGORA);
  await agenda.agendar({ ...PEDIDO, hora: "10:00" }, AGORA);
  const terceira = await agenda.agendar({ ...PEDIDO, hora: "11:00" }, AGORA);
  assert.equal(terceira.ok, false);
  assert.match(terceira.erro, /limite/);
});

test("lista consultas pendentes de lembrete", async () => {
  const agenda = agendaTemporaria();
  const { agendamento } = await agenda.agendar(PEDIDO, AGORA);
  assert.equal((await agenda.pendentesDeLembrete("2026-11-05")).length, 1);
  await agenda.marcarLembreteEnviado(agendamento.id);
  assert.equal((await agenda.pendentesDeLembrete("2026-11-05")).length, 0);
});

test("reconhece o mesmo celular com e sem o nono dígito", async () => {
  const { mesmoTelefone } = await import("../src/agenda/servico.js");
  assert.equal(mesmoTelefone("5511988880000", "551188880000"), true);
  assert.equal(mesmoTelefone("+55 (11) 98888-0000", "5511988880000"), true);
  assert.equal(mesmoTelefone("5511988880000", "5511977770000"), false);
  assert.equal(mesmoTelefone("", ""), false);
});
