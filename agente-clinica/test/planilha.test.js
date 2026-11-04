import assert from "node:assert/strict";
import { test } from "node:test";
import { AgendaPlanilha, agendamentoParaLinha, linhaParaAgendamento } from "../src/agenda/planilha.js";

test("converte linhas da planilha, inclusive as digitadas à mão", () => {
  const a = { id: "ABC123", data: "2026-11-05", hora: "09:00", duracaoMin: 30, paciente: "Maria", telefone: "5511988880000", procedimento: "Consulta", observacao: "", status: "agendado", criadoEm: "x", lembreteEnviado: "" };
  const linha = agendamentoParaLinha(a);
  assert.equal(linha[1], "05/11/2026");
  const { _linha, ...volta } = linhaParaAgendamento(linha, 7);
  assert.equal(_linha, 7);
  assert.deepEqual(volta, a);

  const manual = linhaParaAgendamento(["", "5/11/2026", "8:30:00", "", "", "", "", "", "Bloqueado"], 9);
  assert.equal(manual.data, "2026-11-05");
  assert.equal(manual.hora, "08:30");
  assert.equal(manual.status, "bloqueado");
});

test("cria a aba e o cabeçalho numa planilha nova", async () => {
  const chamadas = [];
  const planilha = new AgendaPlanilha({
    planilhaId: "PLAN",
    requisitar: async (opcoes) => {
      chamadas.push(opcoes);
      if (opcoes.url.includes("fields=sheets")) return { sheets: [{ properties: { title: "Página1" } }] };
      return {};
    },
  });
  await planilha.prepararCabecalho();
  assert.deepEqual(chamadas[1].data, { requests: [{ addSheet: { properties: { title: "Agendamentos" } } }] });
  assert.equal(chamadas.at(-1).method, "PUT");
  assert.equal(chamadas.at(-1).data.values[0][0], "ID");
});

test("cria e atualiza a linha certa", async () => {
  const chamadas = [];
  const linhas = [["X1", "05/11/2026", "09:00", "30", "Maria", "55119", "Consulta", "", "agendado", "", ""]];
  const planilha = new AgendaPlanilha({
    planilhaId: "PLAN",
    requisitar: async (opcoes) => {
      chamadas.push(opcoes);
      return opcoes.method ? {} : { values: linhas };
    },
  });

  await planilha.atualizar("X1", { status: "cancelado" });
  const put = chamadas.at(-1);
  assert.equal(put.method, "PUT");
  assert.match(decodeURIComponent(put.url), /Agendamentos!A2:K2/);
  assert.equal(put.data.values[0][8], "cancelado");

  await planilha.criar({ id: "Y2", data: "2026-11-06", hora: "10:00" });
  assert.match(decodeURIComponent(chamadas.at(-1).url), /:append\?valueInputOption=RAW/);
});
