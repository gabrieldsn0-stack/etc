import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { criarServidor } from "../src/servidor.js";

test("webhook: verificação, assinatura e entrega das mensagens", async (t) => {
  const recebidas = [];
  const servidor = criarServidor({ tokenVerificacao: "abc", segredoApp: "segredo", aoReceber: (m) => recebidas.push(m) });
  await new Promise((r) => servidor.listen(0, r));
  t.after(() => servidor.close());
  const base = `http://127.0.0.1:${servidor.address().port}`;

  const ok = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=abc&hub.challenge=123`);
  assert.equal(await ok.text(), "123");
  assert.equal((await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=1`)).status, 403);

  const corpo = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "m1", from: "55", type: "text", text: { body: "oi" } }] } }] }] });
  const assinatura = "sha256=" + createHmac("sha256", "segredo").update(corpo).digest("hex");

  const falsa = await fetch(`${base}/webhook`, { method: "POST", body: corpo, headers: { "x-hub-signature-256": "sha256=00" } });
  assert.equal(falsa.status, 401);
  assert.equal(recebidas.length, 0);

  const valida = await fetch(`${base}/webhook`, { method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura } });
  assert.equal(valida.status, 200);
  assert.equal(recebidas[0].texto, "oi");
});
