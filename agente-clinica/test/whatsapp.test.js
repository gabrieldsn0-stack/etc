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
