import assert from "node:assert/strict";
import { test } from "node:test";
import { criarAtendimento } from "../src/atendimento.js";
import { Conversas } from "../src/conversas.js";
import { CLINICA } from "./ajuda.js";

function montar(respostaDoAgente = { texto: "Olá!", mensagens: [{ role: "user", content: "oi" }], transferencia: null }) {
  const enviadas = [];
  const chamadasAgente = [];
  const whatsapp = {
    enviarTexto: async (para, texto) => enviadas.push([para, texto]),
    marcarComoLida: async () => {},
  };
  const agente = {
    responder: async (dados) => {
      chamadasAgente.push(dados);
      return typeof respostaDoAgente === "function" ? respostaDoAgente(dados) : respostaDoAgente;
    },
  };
  const conversas = new Conversas({ caminho: null });
  const atendimento = criarAtendimento({ agente, conversas, whatsapp, clinica: CLINICA });
  return { atendimento, enviadas, chamadasAgente, conversas };
}

const msg = (id, texto, de = "5511988880000") => ({ id, de, nome: "Maria", tipo: "text", texto });

test("responde e ignora a mesma mensagem reenviada pela Meta", async () => {
  const { atendimento, enviadas, chamadasAgente, conversas } = montar();
  await atendimento.receber(msg("m1", "oi"));
  await atendimento.receber(msg("m1", "oi"));
  assert.equal(chamadasAgente.length, 1);
  assert.deepEqual(enviadas, [["5511988880000", "Olá!"]]);
  assert.equal(conversas.historico("5511988880000").length, 1);
});

test("mensagens sem texto recebem um aviso, sem chamar o agente", async () => {
  const { atendimento, enviadas, chamadasAgente } = montar();
  await atendimento.receber({ ...msg("m1", null), tipo: "audio" });
  assert.equal(chamadasAgente.length, 0);
  assert.match(enviadas[0][1], /só consigo ler mensagens de texto/);
});

test("depois de transferir, fica em silêncio até a equipe devolver", async () => {
  const { atendimento, enviadas, chamadasAgente } = montar({ texto: "Vou chamar a equipe.", mensagens: [], transferencia: "Quer falar com alguém" });
  await atendimento.receber(msg("m1", "quero falar com uma pessoa"));
  assert.equal(enviadas.length, 2);
  assert.equal(enviadas[1][0], CLINICA.telefoneEquipe);
  assert.match(enviadas[1][1], /#devolver 5511988880000/);

  await atendimento.receber(msg("m2", "alô?"));
  assert.equal(chamadasAgente.length, 1);

  await atendimento.receber(msg("m3", "#devolver 5511988880000", CLINICA.telefoneEquipe));
  await atendimento.receber(msg("m4", "oi de novo"));
  assert.equal(chamadasAgente.length, 2);
});

test("se o agente falhar, avisa o paciente e a equipe", async () => {
  const { atendimento, enviadas } = montar(() => {
    throw new Error("API fora do ar");
  });
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    await atendimento.receber(msg("m1", "oi"));
  } finally {
    console.error = erroOriginal;
  }
  assert.match(enviadas[0][1], /problema técnico/);
  assert.equal(enviadas[1][0], CLINICA.telefoneEquipe);
});

test("mensagens do mesmo paciente são respondidas em ordem", async () => {
  const ordem = [];
  const { atendimento } = montar(async ({ texto }) => {
    await new Promise((r) => setTimeout(r, texto === "primeira" ? 30 : 0));
    ordem.push(texto);
    return { texto: "ok", mensagens: [], transferencia: null };
  });
  await Promise.all([atendimento.receber(msg("a", "primeira")), atendimento.receber(msg("b", "segunda"))]);
  assert.deepEqual(ordem, ["primeira", "segunda"]);
});

test("a equipe pode devolver usando o número com o nono dígito", async () => {
  const { atendimento, chamadasAgente } = montar({ texto: "ok", mensagens: [], transferencia: "x" });
  // O WhatsApp entrega o paciente sem o 9 e a equipe também sem o 9
  await atendimento.receber(msg("m1", "oi", "551188880000"));
  await atendimento.receber(msg("m2", "#devolver +55 11 98888-0000", "551199990000"));
  await atendimento.receber(msg("m3", "oi de novo", "551188880000"));
  assert.equal(chamadasAgente.length, 2);
});
