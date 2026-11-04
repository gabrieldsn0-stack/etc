import { lerJson, salvarJson } from "../arquivoJson.js";

/** Agenda guardada num arquivo JSON local. Bom para testar; em produção use a planilha. */
export class AgendaArquivo {
  constructor(caminho) {
    this.caminho = caminho;
  }

  async todos() {
    return lerJson(this.caminho, []);
  }

  async criar(agendamento) {
    salvarJson(this.caminho, [...(await this.todos()), agendamento]);
  }

  async atualizar(id, campos) {
    const todos = await this.todos();
    const alvo = todos.find((a) => a.id === id);
    if (!alvo) throw new Error(`Agendamento ${id} não encontrado`);
    Object.assign(alvo, campos);
    salvarJson(this.caminho, todos);
  }
}
