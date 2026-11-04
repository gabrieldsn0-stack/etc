import { createServer } from "node:http";
import { assinaturaValida, extrairMensagens } from "./whatsapp.js";

const LIMITE_CORPO = 1024 * 1024;

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let tamanho = 0;
    req.on("data", (p) => {
      tamanho += p.length;
      if (tamanho > LIMITE_CORPO) {
        reject(new Error("corpo grande demais"));
        req.destroy();
      } else partes.push(p);
    });
    req.on("end", () => resolve(Buffer.concat(partes)));
    req.on("error", reject);
  });
}

/**
 * Servidor HTTP com o webhook do WhatsApp:
 *   GET  /webhook  -> verificação feita pela Meta ao cadastrar o webhook
 *   POST /webhook  -> mensagens recebidas
 *   GET  /saude    -> para o serviço de hospedagem saber que está no ar
 */
export function criarServidor({ tokenVerificacao, segredoApp, aoReceber }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/saude") {
      res.writeHead(200).end("ok");
      return;
    }

    if (req.method === "GET" && url.pathname === "/webhook") {
      const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === tokenVerificacao;
      if (ok) res.writeHead(200, { "Content-Type": "text/plain" }).end(url.searchParams.get("hub.challenge") ?? "");
      else res.writeHead(403).end();
      return;
    }

    if (req.method === "POST" && url.pathname === "/webhook") {
      let corpo;
      try {
        corpo = await lerCorpo(req);
      } catch {
        res.writeHead(413).end();
        return;
      }
      if (!assinaturaValida(corpo, req.headers["x-hub-signature-256"], segredoApp)) {
        res.writeHead(401).end();
        return;
      }
      // Responde logo: a Meta reenvia a mensagem se demorarmos.
      res.writeHead(200).end();
      let payload;
      try {
        payload = JSON.parse(corpo.toString("utf8"));
      } catch {
        return;
      }
      for (const m of extrairMensagens(payload)) aoReceber(m);
      return;
    }

    res.writeHead(404).end();
  });
}
