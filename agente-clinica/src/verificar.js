// Confere se tudo está configurado antes do teste real:  npm run verificar
// Não envia mensagem para ninguém e não gasta tokens do Claude.
import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync } from "node:fs";
import { AgendaPlanilha } from "./agenda/planilha.js";
import { apenasDigitos } from "./agenda/servico.js";
import { DIAS_SEMANA, horaValida } from "./tempo.js";

let falhas = 0;
const ok = (msg) => console.log(`  ✅ ${msg}`);
const aviso = (msg) => console.log(`  ⚠️  ${msg}`);
const erro = (msg, comoResolver) => {
  falhas++;
  console.log(`  ❌ ${msg}`);
  if (comoResolver) console.log(`     → ${comoResolver}`);
};
const env = (nome) => (process.env[nome] ?? "").trim();
const titulo = (t) => console.log(`\n${t}`);

titulo("1. Computador");
const [maior, menor] = process.versions.node.split(".").map(Number);
if (maior > 20 || (maior === 20 && menor >= 6)) ok(`Node.js ${process.versions.node}`);
else erro(`Node.js ${process.versions.node} é antigo demais`, "Instale a versão LTS em https://nodejs.org");
if (existsSync(".env")) ok("Arquivo .env encontrado");
else erro("Não achei o arquivo .env", "Copie o .env.exemplo para .env e preencha");

titulo("2. Dados da clínica");
const arquivoClinica = env("ARQUIVO_CLINICA") || "clinica.json";
let clinica = null;
try {
  clinica = JSON.parse(readFileSync(arquivoClinica, "utf8"));
  ok(`${arquivoClinica} lido: ${clinica.nome}`);
} catch (e) {
  erro(
    `Não consegui ler ${arquivoClinica}: ${e.code === "ENOENT" ? "arquivo não existe" : e.message}`,
    e.code === "ENOENT" ? "Copie o clinica.exemplo.json para clinica.json" : "Confira vírgulas e aspas em https://jsonlint.com",
  );
}
if (clinica) {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: clinica.fuso });
    ok(`Fuso horário ${clinica.fuso}`);
  } catch {
    erro(`Fuso horário inválido: ${clinica.fuso}`, 'Use, por exemplo, "America/Sao_Paulo"');
  }
  const turnosRuins = DIAS_SEMANA.flatMap((dia) =>
    (clinica.horarios?.[dia] ?? []).filter(([a, f]) => !horaValida(a) || !horaValida(f) || a >= f).map(() => dia),
  );
  if (!clinica.horarios) erro('Faltam os "horarios" de atendimento');
  else if (turnosRuins.length) erro(`Horários com problema em: ${turnosRuins.join(", ")}`, 'Use ["08:00", "12:00"], com início antes do fim');
  else ok("Horários de atendimento");
  if (!(clinica.duracaoConsultaMin > 0)) erro('"duracaoConsultaMin" precisa ser um número, como 30');
  if (!(clinica.procedimentos ?? []).length) aviso("Nenhum procedimento cadastrado; a assistente vai oferecer só \"Consulta\"");
  const tel = apenasDigitos(clinica.telefoneEquipe);
  if (!tel) aviso('Sem "telefoneEquipe": ninguém será avisado quando a assistente transferir um paciente');
  else if (!tel.startsWith("55") || tel.length < 12) erro(`"telefoneEquipe" parece incompleto: ${clinica.telefoneEquipe}`, "Use DDI + DDD + número, como 5511999999999");
  else ok(`Telefone da equipe: +${tel}`);
}

titulo("3. Claude (Anthropic)");
if (!env("ANTHROPIC_API_KEY")) {
  erro("ANTHROPIC_API_KEY está vazia", "Crie uma chave em https://console.anthropic.com → API Keys");
} else {
  const modelo = env("MODELO") || "claude-opus-5-5";
  try {
    await new Anthropic().models.retrieve(modelo);
    ok(`Chave válida e modelo ${modelo} disponível`);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) erro("A chave foi recusada", "Confira se copiou a chave inteira, sem espaços");
    else if (e instanceof Anthropic.NotFoundError) erro(`Modelo "${modelo}" não encontrado`, "Apague a linha MODELO do .env para usar o padrão");
    else if (e instanceof Anthropic.APIError) erro(`Erro da API (${e.status}): ${e.message}`);
    else erro(`Sem conexão com a Anthropic: ${e.message}`);
  }
}

titulo("4. Agenda");
if ((env("AGENDA") || "arquivo") !== "planilha") {
  aviso('AGENDA=arquivo: a agenda fica em dados/agenda.json. Para usar o Google Sheets, mude para AGENDA=planilha');
} else {
  const faltando = ["PLANILHA_ID", "GOOGLE_EMAIL_CONTA_SERVICO", "GOOGLE_CHAVE_PRIVADA"].filter((n) => !env(n));
  if (faltando.length) {
    erro(`Faltam: ${faltando.join(", ")}`, "Veja o passo 3 do PRIMEIRO-TESTE.md");
  } else {
    const chave = env("GOOGLE_CHAVE_PRIVADA").replace(/\\n/g, "\n");
    if (!chave.includes("BEGIN PRIVATE KEY")) {
      erro("GOOGLE_CHAVE_PRIVADA não parece uma chave", 'Copie o campo "private_key" do JSON inteiro, entre aspas, com os \\n');
    } else {
      try {
        const planilha = new AgendaPlanilha({
          planilhaId: env("PLANILHA_ID"),
          aba: env("PLANILHA_ABA") || "Agendamentos",
          emailContaServico: env("GOOGLE_EMAIL_CONTA_SERVICO"),
          chavePrivada: chave,
        });
        await planilha.prepararCabecalho();
        const linhas = await planilha.todos();
        ok(`Planilha acessada (aba "${planilha.aba}", ${linhas.length} agendamento(s))`);
      } catch (e) {
        const status = e.response?.status ?? e.status;
        const detalhe = e.response?.data?.error?.message ?? e.message;
        if (status === 403 && /has not been used|is disabled/i.test(detalhe)) {
          erro("A Google Sheets API não está ativada no projeto", "Google Cloud Console → APIs e serviços → Biblioteca → Google Sheets API → Ativar");
        } else if (status === 403) {
          erro("A conta de serviço não tem acesso à planilha", `Na planilha, clique em Compartilhar e adicione ${env("GOOGLE_EMAIL_CONTA_SERVICO")} como Editor`);
        } else if (status === 404) {
          erro("Planilha não encontrada", "Confira o PLANILHA_ID: é o trecho da URL entre /d/ e /edit");
        } else {
          erro(`Erro ao acessar a planilha: ${detalhe}`, "Confira o e-mail e a chave da conta de serviço");
        }
      }
    }
  }
}

titulo("5. WhatsApp (Meta)");
const varsWhats = ["WHATSAPP_TOKEN", "WHATSAPP_ID_NUMERO", "WHATSAPP_SEGREDO_APP", "WHATSAPP_TOKEN_VERIFICACAO"];
const faltandoWhats = varsWhats.filter((n) => !env(n));
if (faltandoWhats.length === varsWhats.length) {
  aviso("WhatsApp ainda não configurado (tudo bem para usar o npm run simular)");
} else {
  if (faltandoWhats.length) erro(`Faltam: ${faltandoWhats.join(", ")}`, "Veja o passo 4 do PRIMEIRO-TESTE.md");
  if (env("WHATSAPP_TOKEN") && env("WHATSAPP_ID_NUMERO")) {
    const versao = env("WHATSAPP_VERSAO_API") || "v24.0";
    try {
      const r = await fetch(`https://graph.facebook.com/${versao}/${env("WHATSAPP_ID_NUMERO")}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}` },
      });
      const dados = await r.json();
      if (r.ok) ok(`Número conectado: ${dados.display_phone_number} (${dados.verified_name})`);
      else if (dados.error?.code === 190) erro("Token do WhatsApp expirado ou inválido", "Gere um novo token na página API Setup (o temporário dura 24h)");
      else erro(`A Meta respondeu: ${dados.error?.message ?? r.status}`, "Confira o WHATSAPP_ID_NUMERO (é o ID do número, não o telefone)");
    } catch (e) {
      erro(`Sem conexão com a Meta: ${e.message}`);
    }
  }
}

console.log(
  falhas
    ? `\n${falhas} problema(s) para resolver. Corrija e rode de novo: npm run verificar\n`
    : "\nTudo certo! Próximo passo: npm start (e o túnel, veja o PRIMEIRO-TESTE.md)\n",
);
process.exitCode = falhas ? 1 : 0;
