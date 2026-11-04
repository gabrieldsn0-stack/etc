import { mesmoTelefone } from "./agenda/servico.js";
import { lerJson, salvarJson } from "./arquivoJson.js";

const HORA = 60 * 60 * 1000;

/**
 * Guarda o histórico de cada paciente (por telefone) num arquivo JSON.
 *
 * O histórico só cresce: nunca editamos mensagens antigas, porque o modelo
 * precisa receber o histórico exatamente como foi. Quando a conversa fica
 * parada por muito tempo (ou longa demais), começamos uma conversa nova.
 */
export class Conversas {
  constructor({ caminho, horasParaReiniciar = 12, maxMensagens = 80 }) {
    this.caminho = caminho;
    this.horasParaReiniciar = horasParaReiniciar;
    this.maxMensagens = maxMensagens;
    this.dados = caminho ? lerJson(caminho, {}) : {};
  }

  salvar() {
    if (this.caminho) salvarJson(this.caminho, this.dados);
  }

  historico(telefone, agora = Date.now()) {
    const c = this.dados[telefone];
    if (!c) return [];
    const parada = agora - c.ultimaAtividade > this.horasParaReiniciar * HORA;
    if (parada || c.mensagens.length > this.maxMensagens) return [];
    return c.mensagens;
  }

  registrar(telefone, mensagens, agora = Date.now()) {
    const atual = this.dados[telefone] ?? {};
    this.dados[telefone] = { ...atual, mensagens, ultimaAtividade: agora };
    this.salvar();
  }

  /** Enquanto um atendente humano cuida do paciente, o agente fica em silêncio. */
  emAtendimentoHumano(telefone, agora = Date.now()) {
    return (this.dados[telefone]?.humanoAte ?? 0) > agora;
  }

  passarParaHumano(telefone, horas, agora = Date.now()) {
    this.dados[telefone] = {
      mensagens: [],
      ...this.dados[telefone],
      humanoAte: agora + horas * HORA,
      ultimaAtividade: agora,
    };
    this.salvar();
  }

  devolverParaAgente(telefone) {
    // A equipe pode digitar o número com ou sem o nono dígito.
    for (const chave of Object.keys(this.dados).filter((t) => mesmoTelefone(t, telefone))) {
      delete this.dados[chave].humanoAte;
      this.dados[chave].mensagens = [];
    }
    this.salvar();
  }
}
