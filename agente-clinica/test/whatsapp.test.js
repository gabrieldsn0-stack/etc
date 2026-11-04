import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { assinaturaValida, extrairMensagens } from "../src/whatsapp.js";

test("valida a assinatura do webhook", () => {
  const corpo = Buffer.from('{"a":1}');
  const assinatura = "sha256=" + createHmac("sha256", "segredo").update(corpo).digest("hex");
  assert.equal(assinaturaValida(corpo, assinatura, "segredo"), true);
  assert.equal(assinaturaValida(corpo, assinatura, "outro"), false);
  assert.equal(assinaturaValida(corpo, undefined, "segredo"), false);
  assert.equal(assinaturaValida(corpo, "sha256=abc", "segredo"), false);
});

test("extrai texto, botões e mensagens sem texto", () => {
  const payload = {
    entry: [{ changes: [{ value: {
      contacts: [{ wa_id: "5511988880000", profile: { name: "Maria" } }],
      messages: [
        { id: "m1", from: "5511988880000", type: "text", text: { body: "Oi" } },
        { id: "m2", from: "5511988880000", type: "interactive", interactive: { button_reply: { title: "Confirmar" } } },
        { id: "m3", from: "5511988880000", type: "audio", audio: {} },
      ],
    } }] }],
  };
  assert.deepEqual(
    extrairMensagens(payload).map((m) => [m.id, m.nome, m.texto]),
    [["m1", "Maria", "Oi"], ["m2", "Maria", "Confirmar"], ["m3", "Maria", null]],
  );
  assert.deepEqual(extrairMensagens({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] }), []);
});

test("reenvia com o nono dígito quando a Meta recusa o número (erro 131030)", async (t) => {
  const { WhatsApp, comNonoDigito } = await import("../src/whatsapp.js");
  assert.equal(comNonoDigito("551188880000"), "5511988880000");
  assert.equal(comNonoDigito("551133330000"), null); // fixo
  assert.equal(comNonoDigito("5511988880000"), null);

  const destinos = [];
  t.mock.method(globalThis, "fetch", async (_url, opcoes) => {
    const { to } = JSON.parse(opcoes.body);
    destinos.push(to);
    if (to === "551188880000") {
      return new Response(JSON.stringify({ error: { code: 131030, message: "Recipient phone number not in allowed list" } }), { status: 400 });
    }
    return new Response(JSON.stringify({ messages: [{ id: "x" }] }), { status: 200 });
  });
  const whatsapp = new WhatsApp({ token: "t", idNumero: "1" });
  await whatsapp.enviarTexto("551188880000", "oi");
  assert.deepEqual(destinos, ["551188880000", "5511988880000"]);
});
