import { JWT } from "google-auth-library";
import { dataBR, dataDeBR } from "../tempo.js";

// Colunas da aba de agendamentos, na ordem em que aparecem na planilha.
export const COLUNAS = [
  ["id", "ID"],
  ["data", "Data"],
  ["hora", "Hora"],
  ["duracaoMin", "Duração (min)"],
  ["paciente", "Paciente"],
  ["telefone", "Telefone"],
  ["procedimento", "Procedimento"],
  ["observacao", "Observação"],
  ["status", "Status"],
  ["criadoEm", "Criado em"],
  ["lembreteEnviado", "Lembrete enviado"],
];
const ULTIMA_COLUNA = String.fromCharCode(64 + COLUNAS.length); // "K"

export function linhaParaAgendamento(linha, numeroLinha) {
  const a = Object.fromEntries(COLUNAS.map(([campo], i) => [campo, String(linha[i] ?? "").trim()]));
  a.data = dataDeBR(a.data);
  // Aceita "8:00" e "08:00:00", que é como o Sheets formata uma hora digitada à mão.
  const hora = a.hora.match(/^(\d{1,2}):(\d{2})/);
  a.hora = hora ? `${hora[1].padStart(2, "0")}:${hora[2]}` : "";
  a.duracaoMin = Number(a.duracaoMin) || undefined;
  a.status = a.status.toLowerCase() || "agendado";
  a._linha = numeroLinha;
  return a;
}

export function agendamentoParaLinha(a) {
  return COLUNAS.map(([campo]) => {
    if (campo === "data") return dataBR(a.data);
    return a[campo] === undefined ? "" : String(a[campo]);
  });
}

/**
 * Agenda no Google Sheets, numa aba chamada "Agendamentos" (configurável).
 * A primeira linha é o cabeçalho. O médico e a secretária podem ver e editar
 * a planilha normalmente: o agente sempre lê o estado atual antes de agendar.
 */
export class AgendaPlanilha {
  constructor({ planilhaId, aba = "Agendamentos", emailContaServico, chavePrivada, requisitar }) {
    this.planilhaId = planilhaId;
    this.aba = aba;
    // `requisitar` pode ser trocado nos testes; em produção usa a conta de serviço do Google.
    if (requisitar) {
      this.requisitar = requisitar;
    } else {
      const auth = new JWT({
        email: emailContaServico,
        key: chavePrivada,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      this.requisitar = async (opcoes) => (await auth.request(opcoes)).data;
    }
  }

  url(caminho) {
    return `https://sheets.googleapis.com/v4/spreadsheets/${this.planilhaId}/values/${encodeURIComponent(caminho)}`;
  }

  /** Cria o cabeçalho se a aba estiver vazia. */
  async prepararCabecalho() {
    const dados = await this.requisitar({ url: this.url(`${this.aba}!A1:${ULTIMA_COLUNA}1`) });
    if (dados.values?.length) return;
    await this.requisitar({
      url: `${this.url(`${this.aba}!A1`)}?valueInputOption=RAW`,
      method: "PUT",
      data: { values: [COLUNAS.map(([, titulo]) => titulo)] },
    });
  }

  async todos() {
    const dados = await this.requisitar({ url: this.url(`${this.aba}!A2:${ULTIMA_COLUNA}`) });
    return (dados.values ?? [])
      .map((linha, i) => linhaParaAgendamento(linha, i + 2))
      .filter((a) => a.data && a.hora);
  }

  async criar(agendamento) {
    await this.requisitar({
      url: `${this.url(`${this.aba}!A:${ULTIMA_COLUNA}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      method: "POST",
      data: { values: [agendamentoParaLinha(agendamento)] },
    });
  }

  async atualizar(id, campos) {
    const alvo = (await this.todos()).find((a) => a.id === id);
    if (!alvo) throw new Error(`Agendamento ${id} não encontrado na planilha`);
    const linha = agendamentoParaLinha({ ...alvo, ...campos });
    await this.requisitar({
      url: `${this.url(`${this.aba}!A${alvo._linha}:${ULTIMA_COLUNA}${alvo._linha}`)}?valueInputOption=RAW`,
      method: "PUT",
      data: { values: [linha] },
    });
  }
}
