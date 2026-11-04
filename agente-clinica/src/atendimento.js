import { apenasDigitos, mesmoTelefone } from "./agenda/servico.js";
import { agoraNoFuso } from "./tempo.js";

const MSG_SO_TEXTO = "Por enquanto eu só consigo ler mensagens de texto. Pode me escrever o que precisa? 🙂";
const MSG_ERRO = "Desculpe, tive um problema técnico agora. Vou pedir para alguém da equipe te responder por aqui.";

/**
 * Cuida de cada mensagem que chega: decide se o agente responde,
 * chama o agente, envia a resposta e avisa a equipe quando preciso.
 */
export function criarAtendimento({ agente, conversas, whatsapp, clinica, horasAtendimentoHumano = 4 }) {
  const jaVistas = new Set();
  const filas = new Map(); // uma fila por telefone: as mensagens de um paciente são respondidas em ordem
  const telefoneEquipe = apenasDigitos(clinica.telefoneEquipe);

  async function avisarEquipe(texto) {
    if (!telefoneEquipe) return;
    try {
      await whatsapp.enviarTexto(telefoneEquipe, texto);
    } catch (erro) {
      // Fora da janela de 24h a Meta só aceita modelos aprovados; veja o README.
      console.error("[atendimento] não consegui avisar a equipe:", erro.message);
    }
  }

  async function transferir(telefone, nome, motivo) {
    conversas.passarParaHumano(telefone, horasAtendimentoHumano);
    await avisarEquipe(
      `🔔 Paciente precisa de atendimento humano\nNome: ${nome || "não informado"}\nWhatsApp: +${telefone}\nMotivo: ${motivo}\n\nO assistente vai ficar em silêncio com esse paciente por ${horasAtendimentoHumano}h. Para devolver antes, envie aqui: #devolver ${telefone}`,
    );
  }

  /** Comandos que a equipe manda do telefone cadastrado em telefoneEquipe. */
  async function comandoDaEquipe(texto) {
    const devolver = texto.trim().match(/^#devolver\s+\+?([\d\s()-]+)$/i);
    if (!devolver) return false;
    const paciente = apenasDigitos(devolver[1]);
    conversas.devolverParaAgente(paciente);
    await whatsapp.enviarTexto(telefoneEquipe, `✅ O assistente voltou a atender +${paciente}.`);
    return true;
  }

  async function processar(m) {
    if (mesmoTelefone(m.de, telefoneEquipe) && m.texto && (await comandoDaEquipe(m.texto))) return;
    if (conversas.emAtendimentoHumano(m.de)) {
      console.log(`[mensagem] +${m.de}: em atendimento humano, o assistente não responde`);
      return;
    }
    console.log(`[mensagem] +${m.de}: recebida (${m.tipo})`);

    whatsapp.marcarComoLida(m.id).catch(() => {});
    if (!m.texto?.trim()) {
      await whatsapp.enviarTexto(m.de, MSG_SO_TEXTO);
      return;
    }

    let resultado;
    try {
      resultado = await agente.responder({
        telefone: m.de,
        nomeContato: m.nome,
        texto: m.texto,
        historico: conversas.historico(m.de),
        agora: agoraNoFuso(clinica.fuso),
      });
    } catch (erro) {
      console.error("[atendimento] erro ao gerar resposta:", erro);
      await whatsapp.enviarTexto(m.de, MSG_ERRO);
      await transferir(m.de, m.nome, "Erro técnico no assistente.");
      return;
    }

    conversas.registrar(m.de, resultado.mensagens);
    if (resultado.texto) {
      await whatsapp.enviarTexto(m.de, resultado.texto);
      console.log(`[mensagem] +${m.de}: respondida`);
    }
    if (resultado.transferencia) await transferir(m.de, m.nome, resultado.transferencia);
  }

  /** Recebe uma mensagem do webhook. A Meta pode reenviar a mesma mensagem, então ignoramos repetidas. */
  function receber(m) {
    if (jaVistas.has(m.id)) return filas.get(m.de) ?? Promise.resolve();
    jaVistas.add(m.id);
    if (jaVistas.size > 5000) jaVistas.delete(jaVistas.values().next().value);

    const anterior = filas.get(m.de) ?? Promise.resolve();
    const atual = anterior
      .then(() => processar(m))
      .catch((erro) => console.error("[atendimento] erro inesperado:", erro))
      .finally(() => {
        if (filas.get(m.de) === atual) filas.delete(m.de);
      });
    filas.set(m.de, atual);
    return atual;
  }

  return { receber };
}
