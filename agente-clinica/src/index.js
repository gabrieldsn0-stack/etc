import { criarAtendimento } from "./atendimento.js";
import { carregarClinica, montarAgenda, montarAgente, variavel } from "./config.js";
import { Conversas } from "./conversas.js";
import { iniciarLembretes } from "./lembretes.js";
import { criarServidor } from "./servidor.js";
import { WhatsApp } from "./whatsapp.js";

const clinica = carregarClinica();
const agenda = await montarAgenda(clinica);
const whatsapp = new WhatsApp({
  token: variavel("WHATSAPP_TOKEN"),
  idNumero: variavel("WHATSAPP_ID_NUMERO"),
  versaoApi: variavel("WHATSAPP_VERSAO_API", "v24.0"),
});
const atendimento = criarAtendimento({
  agente: montarAgente(clinica, agenda),
  conversas: new Conversas({ caminho: variavel("ARQUIVO_CONVERSAS", "dados/conversas.json") }),
  whatsapp,
  clinica,
  horasAtendimentoHumano: Number(variavel("HORAS_ATENDIMENTO_HUMANO", "4")),
});

const servidor = criarServidor({
  tokenVerificacao: variavel("WHATSAPP_TOKEN_VERIFICACAO"),
  segredoApp: variavel("WHATSAPP_SEGREDO_APP"),
  aoReceber: atendimento.receber,
});
const porta = Number(variavel("PORT", "3000"));
servidor.listen(porta, () => console.log(`Agente da ${clinica.nome} ouvindo na porta ${porta} (webhook em /webhook)`));

iniciarLembretes({ agenda, whatsapp, clinica });
