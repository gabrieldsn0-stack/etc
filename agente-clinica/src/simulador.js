// Converse com o agente pelo terminal, sem WhatsApp. Só precisa da ANTHROPIC_API_KEY.
//   npm run simular
import { createInterface } from "node:readline/promises";
import { carregarClinica, montarAgenda, montarAgente } from "./config.js";
import { agoraNoFuso } from "./tempo.js";

const clinica = carregarClinica();
const agenda = await montarAgenda(clinica, { arquivoPadrao: "dados/agenda-simulador.json" });
const agente = montarAgente(clinica, agenda);
const telefone = "5511900000000";
let historico = [];

const terminal = createInterface({ input: process.stdin, output: process.stdout });
console.log(`Simulador da ${clinica.nome}. Escreva como se fosse um paciente (ou "sair").\n`);

while (true) {
  const texto = await terminal.question("Você: ");
  if (!texto.trim()) continue;
  if (texto.trim().toLowerCase() === "sair") break;
  const r = await agente.responder({ telefone, nomeContato: "Paciente Teste", texto, historico, agora: agoraNoFuso(clinica.fuso) });
  historico = r.mensagens;
  console.log(`\nAgente: ${r.texto}\n`);
  if (r.transferencia) console.log(`(transferido para um atendente: ${r.transferencia})\n`);
}
terminal.close();
