import assert from "node:assert/strict";
import { test } from "node:test";
import { criarAgente, montarInstrucoes } from "../src/agente.js";
import { AGORA, CLINICA, agendaTemporaria } from "./ajuda.js";

/** Cliente falso: devolve respostas prontas e guarda o que recebeu. */
function clienteFalso(respostas) {
  const pedidos = [];
  return {
    pedidos,
    beta: {
      messages: {
        create: async (params) => {
          pedidos.push(structuredClone(params));
          return respostas.shift();
        },
      },
    },
  };
}

const chamada = (id, name, input) => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id, name, input }] });
const texto = (t) => ({ stop_reason: "end_turn", content: [{ type: "text", text: t }] });

test("consulta horários, agenda e responde", async () => {
  const agenda = agendaTemporaria();
  const cliente = clienteFalso([
    chamada("t1", "ver_horarios_disponiveis", { data: "2026-11-05", procedimento: "Consulta" }),
    chamada("t2", "agendar_consulta", { nome_paciente: "Maria Silva", data: "2026-11-05", hora: "09:00", procedimento: "Consulta", observacao: "Unimed" }),
    texto("Prontinho, Maria! Consulta marcada."),
  ]);
  const agente = criarAgente({ cliente, clinica: CLINICA, agenda, modelo: "claude-opus-5-5", esforco: "medium" });

  const r = await agente.responder({ telefone: "5511988880000", nomeContato: "Maria", texto: "Quero marcar amanhã às 9", historico: [], agora: AGORA });

  assert.equal(r.texto, "Prontinho, Maria! Consulta marcada.");
  assert.equal(r.transferencia, null);
  const [consulta] = await agenda.consultasDoPaciente("5511988880000", AGORA);
  assert.equal(consulta.hora, "09:00");
  assert.equal(consulta.observacao, "Unimed");

  // Histórico: usuário, assistente (ferramenta), resultado, assistente (ferramenta), resultado, assistente (texto)
  assert.deepEqual(r.mensagens.map((m) => m.role), ["user", "assistant", "user", "assistant", "user", "assistant"]);
  const horarios = JSON.parse(r.mensagens[2].content[0].content);
  assert.equal(horarios.dia, "quinta-feira");
  assert.ok(horarios.horarios.includes("09:00"));
  assert.equal(JSON.parse(r.mensagens[4].content[0].content).ok, true);

  const primeiro = cliente.pedidos[0];
  assert.equal(primeiro.model, "claude-opus-5-5");
  assert.equal(primeiro.tool_choice, undefined);
  assert.deepEqual(primeiro.betas, ["server-side-fallback-2026-07-01"]);
  assert.match(primeiro.messages[0].content[0].text, /quarta-feira, 04\/11\/2026/);
  assert.match(primeiro.messages[0].content[0].text, /Quero marcar amanhã às 9$/);
});

test("o paciente só vê e cancela as próprias consultas", async () => {
  const agenda = agendaTemporaria();
  const { agendamento } = await agenda.agendar({ telefone: "5511911110000", nome: "Outra", data: "2026-11-05", hora: "08:00", procedimento: "Consulta" }, AGORA);
  const cliente = clienteFalso([
    chamada("t1", "cancelar_consulta", { codigo: agendamento.id }),
    texto("Não encontrei essa consulta."),
  ]);
  const agente = criarAgente({ cliente, clinica: CLINICA, agenda, modelo: "m", esforco: "low" });
  const r = await agente.responder({ telefone: "5511988880000", nomeContato: "", texto: "cancela", historico: [], agora: AGORA });
  assert.equal(JSON.parse(r.mensagens[2].content[0].content).ok, false);
  assert.equal((await agenda.consultasDoPaciente("5511911110000", AGORA)).length, 1);
});

test("transferência para humano e recusa", async () => {
  const agenda = agendaTemporaria();
  const transferir = criarAgente({
    cliente: clienteFalso([chamada("t1", "transferir_para_atendente", { motivo: "Dúvida sobre exame" }), texto("Vou chamar a equipe.")]),
    clinica: CLINICA, agenda, modelo: "m", esforco: "low",
  });
  const r1 = await transferir.responder({ telefone: "1", nomeContato: "", texto: "meu exame deu alterado", historico: [], agora: AGORA });
  assert.equal(r1.transferencia, "Dúvida sobre exame");

  const recusa = criarAgente({
    cliente: clienteFalso([{ stop_reason: "refusal", content: [] }]),
    clinica: CLINICA, agenda, modelo: "m", esforco: "low",
  });
  const anterior = [{ role: "user", content: "oi" }, { role: "assistant", content: [{ type: "text", text: "olá" }] }];
  const r2 = await recusa.responder({ telefone: "1", nomeContato: "", texto: "...", historico: anterior, agora: AGORA });
  assert.ok(r2.transferencia);
  assert.deepEqual(r2.mensagens, anterior);
});

test("as instruções trazem os dados da clínica e as regras de segurança", () => {
  const instrucoes = montarInstrucoes(CLINICA);
  assert.match(instrucoes, /Clínica Teste/);
  assert.match(instrucoes, /Limpeza de pele \(60 min\)/);
  assert.match(instrucoes, /SAMU \(192\)/);
  assert.match(instrucoes, /- sab: fechado/);
});
