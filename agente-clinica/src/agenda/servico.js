import { randomBytes } from "node:crypto";
import { duracaoDoProcedimento, horariosLivres, motivoDiaFechado } from "../disponibilidade.js";
import { dataValida, diferencaEmDias, horaValida } from "../tempo.js";

export const STATUS_AGENDADO = "agendado";
export const STATUS_CANCELADO = "cancelado";

export function apenasDigitos(telefone) {
  return String(telefone ?? "").replace(/\D/g, "");
}

function novoId() {
  return randomBytes(3).toString("hex").toUpperCase();
}

/**
 * Regras de agendamento por cima de um "armazenamento" (arquivo JSON ou planilha).
 * O armazenamento só precisa de: todos(), criar(agendamento), atualizar(id, campos).
 *
 * Toda linha que não esteja cancelada ocupa a agenda. Assim a secretária pode
 * bloquear um horário direto na planilha (ex.: status "bloqueado").
 */
export class ServicoAgenda {
  constructor({ armazenamento, clinica }) {
    this.armazenamento = armazenamento;
    this.clinica = clinica;
    this.fila = Promise.resolve();
  }

  /** Executa operações de escrita uma de cada vez, para não marcar dois pacientes no mesmo horário. */
  exclusivo(fn) {
    const resultado = this.fila.then(fn);
    this.fila = resultado.catch(() => {});
    return resultado;
  }

  async ocupados() {
    const todos = await this.armazenamento.todos();
    return todos.filter((a) => String(a.status).toLowerCase() !== STATUS_CANCELADO);
  }

  async livres(data, procedimento, agora) {
    if (!dataValida(data)) return { erro: "Data inválida. Use o formato AAAA-MM-DD." };
    const fechado = motivoDiaFechado(this.clinica, data, agora);
    if (fechado) return { erro: fechado, horarios: [] };
    const duracaoMin = duracaoDoProcedimento(this.clinica, procedimento);
    const horarios = horariosLivres({ clinica: this.clinica, data, duracaoMin, ocupados: await this.ocupados(), agora });
    return { horarios };
  }

  agendar({ telefone, nome, data, hora, procedimento, observacao }, agora) {
    return this.exclusivo(async () => {
      if (!dataValida(data) || !horaValida(hora)) return { ok: false, erro: "Data ou hora inválida." };
      if (!String(nome ?? "").trim()) return { ok: false, erro: "Falta o nome do paciente." };

      const tel = apenasDigitos(telefone);
      const futuras = await this.consultasDoPaciente(tel, agora);
      const limite = this.clinica.maxConsultasPorPaciente ?? 3;
      if (futuras.length >= limite) {
        return { ok: false, erro: `O paciente já tem ${futuras.length} consultas marcadas, o limite pelo WhatsApp é ${limite}.` };
      }

      const { horarios, erro } = await this.livres(data, procedimento, agora);
      if (erro) return { ok: false, erro };
      if (!horarios.includes(hora)) {
        return { ok: false, erro: "Esse horário não está disponível.", horariosLivresNoDia: horarios };
      }

      const agendamento = {
        id: novoId(),
        data,
        hora,
        duracaoMin: duracaoDoProcedimento(this.clinica, procedimento),
        paciente: String(nome).trim(),
        telefone: tel,
        procedimento: String(procedimento ?? "").trim() || "Consulta",
        observacao: String(observacao ?? "").trim(),
        status: STATUS_AGENDADO,
        criadoEm: new Date().toISOString(),
        lembreteEnviado: "",
      };
      await this.armazenamento.criar(agendamento);
      return { ok: true, agendamento };
    });
  }

  /** Consultas futuras (de hoje em diante) marcadas por esse telefone. */
  async consultasDoPaciente(telefone, agora) {
    const tel = apenasDigitos(telefone);
    const todos = await this.armazenamento.todos();
    return todos
      .filter(
        (a) =>
          a.status === STATUS_AGENDADO &&
          apenasDigitos(a.telefone) === tel &&
          dataValida(a.data) &&
          diferencaEmDias(agora.data, a.data) >= 0,
      )
      .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`));
  }

  /** Cancela uma consulta, mas só se ela pertence a esse telefone. */
  cancelar(id, telefone, agora) {
    return this.exclusivo(async () => {
      const minhas = await this.consultasDoPaciente(telefone, agora);
      const consulta = minhas.find((a) => a.id === String(id).trim().toUpperCase());
      if (!consulta) return { ok: false, erro: "Não encontrei essa consulta entre as consultas futuras deste número." };
      await this.armazenamento.atualizar(consulta.id, { status: STATUS_CANCELADO });
      return { ok: true, cancelada: { ...consulta, status: STATUS_CANCELADO } };
    });
  }

  async pendentesDeLembrete(data) {
    const todos = await this.armazenamento.todos();
    return todos.filter((a) => a.status === STATUS_AGENDADO && a.data === data && a.telefone && !a.lembreteEnviado);
  }

  marcarLembreteEnviado(id) {
    return this.exclusivo(() => this.armazenamento.atualizar(id, { lembreteEnviado: new Date().toISOString() }));
  }
}
