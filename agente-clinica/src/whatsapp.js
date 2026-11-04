import { createHmac, timingSafeEqual } from "node:crypto";

/** Confere se o webhook veio mesmo da Meta (cabeçalho X-Hub-Signature-256). */
export function assinaturaValida(corpoBruto, cabecalho, segredoApp) {
  if (!segredoApp || !cabecalho?.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", segredoApp).update(corpoBruto).digest();
  const recebido = Buffer.from(cabecalho.slice("sha256=".length), "hex");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

/** Extrai as mensagens recebidas de um payload de webhook do WhatsApp Cloud API. */
export function extrairMensagens(payload) {
  const mensagens = [];
  for (const entrada of payload?.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      const valor = mudanca.value ?? {};
      const nomes = Object.fromEntries((valor.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? ""]));
      for (const m of valor.messages ?? []) {
        mensagens.push({
          id: m.id,
          de: m.from,
          nome: nomes[m.from] ?? "",
          tipo: m.type,
          texto: textoDaMensagem(m),
        });
      }
    }
  }
  return mensagens;
}

function textoDaMensagem(m) {
  switch (m.type) {
    case "text":
      return m.text?.body ?? "";
    case "button":
      return m.button?.text ?? "";
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
    default:
      return null; // áudio, imagem, figurinha etc.: o agente ainda não lê
  }
}

/** "551188880000" -> "5511988880000" para celulares brasileiros sem o nono dígito; null se não se aplica. */
export function comNonoDigito(telefone) {
  const d = String(telefone).replace(/\D/g, "");
  return d.length === 12 && d.startsWith("55") && /[6-9]/.test(d[4]) ? `${d.slice(0, 4)}9${d.slice(4)}` : null;
}

export class WhatsApp {
  constructor({ token, idNumero, versaoApi = "v24.0" }) {
    this.token = token;
    this.url = `https://graph.facebook.com/${versaoApi}/${idNumero}/messages`;
  }

  async enviar(corpo) {
    try {
      return await this.postar(corpo);
    } catch (erro) {
      // O WhatsApp pode identificar um celular brasileiro sem o nono dígito, e o
      // número de teste da Meta só aceita o formato cadastrado (erro 131030).
      // Nesse caso tentamos de novo com o 9.
      const comNono = corpo.to && comNonoDigito(corpo.to);
      if (erro.codigo === 131030 && comNono) return this.postar({ ...corpo, to: comNono });
      throw erro;
    }
  }

  async postar(corpo) {
    const resposta = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...corpo }),
    });
    if (!resposta.ok) {
      const texto = await resposta.text();
      const erro = new Error(`WhatsApp respondeu ${resposta.status}: ${texto}`);
      try {
        erro.codigo = JSON.parse(texto).error?.code;
      } catch {}
      throw erro;
    }
    return resposta.json();
  }

  enviarTexto(para, texto) {
    return this.enviar({ to: para, type: "text", text: { body: texto.slice(0, 4096), preview_url: false } });
  }

  /** Mensagem de modelo (template) aprovado pela Meta. É a única forma de escrever fora da janela de 24h. */
  enviarModelo(para, nome, idioma, parametros) {
    return this.enviar({
      to: para,
      type: "template",
      template: {
        name: nome,
        language: { code: idioma },
        components: [{ type: "body", parameters: parametros.map((texto) => ({ type: "text", text: String(texto) })) }],
      },
    });
  }

  marcarComoLida(idMensagem) {
    return this.enviar({ status: "read", message_id: idMensagem });
  }
}
