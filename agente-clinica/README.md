# Agente de clínica no WhatsApp

Uma assistente virtual que atende os pacientes da clínica no WhatsApp 24 horas por dia:

- tira dúvidas sobre endereço, horários, convênios, preços e preparo, **somente com as informações que você cadastrar**;
- **marca, remarca e cancela consultas** sem nunca marcar dois pacientes no mesmo horário;
- grava tudo numa **planilha do Google** que o médico e a secretária abrem no celular;
- manda **lembrete automático na véspera** da consulta;
- **passa para um humano** quando o assunto é de saúde, quando é uma emergência (orienta ligar 192), quando o paciente pede ou quando não sabe responder. Nesses casos ela avisa a equipe no WhatsApp e fica em silêncio com aquele paciente.

O cérebro é o Claude (Anthropic). A conexão com o WhatsApp usa a **API oficial da Meta (WhatsApp Cloud API)**, que é a forma permitida de colocar um bot de empresa no WhatsApp sem risco de banir o número.

---

> **Começando agora?** Siga o [PRIMEIRO-TESTE.md](PRIMEIRO-TESTE.md): é o passo a passo até o teste real com o seu celular. Em qualquer etapa, rode `npm run verificar` para conferir a configuração.

## 1. Testar no computador (10 minutos, sem WhatsApp)

Você precisa do [Node.js](https://nodejs.org) 20 ou mais novo e de uma chave da API do Claude ([console.anthropic.com](https://console.anthropic.com) → API Keys).

```bash
cd agente-clinica
npm install
cp .env.exemplo .env                # coloque sua ANTHROPIC_API_KEY dentro
cp clinica.exemplo.json clinica.json
npm run simular
```

Converse como se fosse um paciente. Algumas mensagens para testar:

- "Oi, queria marcar uma consulta pra amanhã de manhã"
- "Quanto custa a limpeza de pele? Aceita Unimed?"
- "Preciso remarcar minha consulta para sexta"
- "Estou com dor no peito" (tem que mandar ligar 192 e transferir)
- "Esse remédio que o médico passou pode tomar com álcool?" (não pode responder; tem que transferir)

No simulador a agenda fica em `dados/agenda-simulador.json`.

Para rodar os testes automáticos: `npm test`.

## 2. Configurar a clínica (`clinica.json`)

| Campo | O que é |
|---|---|
| `nome`, `assistente`, `endereco`, `telefone` | Dados que a assistente usa nas respostas. |
| `telefoneEquipe` | WhatsApp da secretária, só números com DDI (ex.: `5511999999999`). Recebe os avisos de transferência. |
| `duracaoConsultaMin` | Intervalo da grade de horários (ex.: 30 → 08:00, 08:30…). |
| `antecedenciaMinimaMin` | Não aceita marcar em cima da hora (ex.: 120 = pelo menos 2h antes). |
| `diasMaximosAFrente` | Até quantos dias à frente a agenda fica aberta. |
| `maxConsultasPorPaciente` | Limite de consultas futuras por número, contra abuso. |
| `horarios` | Turnos de cada dia (`seg` … `dom`). `[]` = fechado. |
| `bloqueios` | Feriados e folgas (`AAAA-MM-DD`). |
| `procedimentos` | Nome, duração e preço (opcional) de cada procedimento. |
| `convenios`, `informacoes` | Tudo o que a assistente pode informar. O que não estiver aqui, ela não inventa: transfere. |
| `politicaPrivacidadeUrl` | Link da política de privacidade (LGPD), citado no primeiro contato. |
| `lembrete` | Nome do modelo de mensagem do lembrete e a partir de que hora enviar. Veja o passo 5. |

## 3. Planilha do Google (onde o médico vê a agenda)

1. Crie uma planilha no Google Sheets com uma aba chamada **Agendamentos**. O cabeçalho é criado sozinho.
2. Acesse o [Google Cloud Console](https://console.cloud.google.com), crie um projeto, ative a **Google Sheets API** e crie uma **conta de serviço**. Na conta de serviço, vá em *Chaves → Adicionar chave → JSON* e baixe o arquivo.
3. Compartilhe a planilha (botão *Compartilhar*) com o e-mail da conta de serviço, como **Editor**.
4. No `.env`, preencha:
   - `AGENDA=planilha`
   - `PLANILHA_ID`: o trecho da URL entre `/d/` e `/edit`;
   - `GOOGLE_EMAIL_CONTA_SERVICO` e `GOOGLE_CHAVE_PRIVADA`: os campos `client_email` e `private_key` do JSON.

Como a equipe usa a planilha:

- Cada consulta vira uma linha: código, data, hora, paciente, telefone, procedimento, observação (convênio etc.) e status.
- **Para bloquear um horário** (almoço, cirurgia, folga), basta adicionar uma linha com data, hora, duração e status `bloqueado`. Qualquer linha que não esteja `cancelado` ocupa a agenda.
- Para cancelar à mão, mude o status para `cancelado`.

## 4. WhatsApp Cloud API (Meta)

1. Em [developers.facebook.com](https://developers.facebook.com), crie um app do tipo **Business** e adicione o produto **WhatsApp**.
2. Em *WhatsApp → Configuração da API*, pegue o **ID do número de telefone** (`WHATSAPP_ID_NUMERO`). Para produção, gere um **token permanente** com um *usuário do sistema* no Gerenciador de Negócios (`WHATSAPP_TOKEN`). O token temporário de teste expira em 24h.
3. Em *Configurações do app → Básico*, copie a **Chave secreta do app** (`WHATSAPP_SEGREDO_APP`). Ela serve para conferir que as mensagens vieram mesmo da Meta.
4. Suba o servidor (passo 6) e, em *WhatsApp → Configuração → Webhook*, coloque:
   - URL de retorno: `https://SEU-ENDERECO/webhook`
   - Token de verificação: a senha que você inventou em `WHATSAPP_TOKEN_VERIFICACAO`
   - Assine o campo **messages**.
5. Para usar o número real da clínica, ele precisa ser registrado na Cloud API. Se a clínica quiser continuar respondendo pelo app WhatsApp Business no mesmo número, verifique com a Meta (ou com o seu provedor) se esse número pode usar o recurso de **coexistência**.

> Desde janeiro de 2026 a Meta proíbe na API os assistentes de IA de uso geral (como um "ChatGPT no WhatsApp"). Um atendente que só cuida da agenda e das dúvidas da clínica é exatamente o tipo de uso permitido.

## 5. Lembrete da véspera (modelo de mensagem)

Fora da janela de 24h desde a última mensagem do paciente, a Meta só deixa enviar **modelos aprovados**. Em *WhatsApp Manager → Modelos de mensagem*, crie:

- Nome: `lembrete_consulta`, categoria **Utilidade**, idioma **Português (BR)**
- Corpo, por exemplo:
  > Olá, {{1}}! Passando para lembrar da sua consulta na {{5}} amanhã, {{2}} ({{3}}), às {{4}}. Se precisar remarcar ou cancelar, é só responder esta mensagem.

Depois que o modelo for aprovado, coloque `"nomeModelo": "lembrete_consulta"` no `clinica.json`. Enquanto o campo estiver vazio, nenhum lembrete é enviado. A partir das 09:00 (campo `lembrete.aPartirDe`), o sistema envia o lembrete de todas as consultas do dia seguinte e marca a coluna *Lembrete enviado* na planilha. Quando o paciente responde, a assistente já consegue remarcar ou cancelar.

O aviso de transferência para a equipe é um texto simples. Ele só chega se o número da equipe tiver conversado com o número da clínica nas últimas 24h. Se isso for um problema, crie também um modelo para esse aviso.

## 6. Colocar no ar

Qualquer serviço que rode Node.js funciona (Railway, Render, Fly.io, uma VPS).

- Comando de início: `npm start`
- Configure as mesmas variáveis do `.env` no painel do serviço e envie também o `clinica.json`.
- O endereço precisa ter HTTPS. Esses serviços já fornecem.
- Use **um servidor por clínica** (cada uma tem seu `.env`, `clinica.json` e planilha).
- A pasta `dados/` guarda o histórico das conversas. Se o serviço apagar o disco a cada deploy, o paciente só perde o contexto da conversa em andamento. A agenda fica segura na planilha.

## 7. LGPD e cuidados com saúde

- A assistente **não dá orientação médica**: não interpreta sintomas, exames ou remédios. Isso está nas instruções dela e foi pensado para proteger você e a clínica.
- Ela pede só nome, procedimento e horário. O telefone vem do próprio WhatsApp. Não pede CPF, documentos nem cartão.
- Agendamento em clínica envolve **dado sensível de saúde**. Faça um contrato com a clínica dizendo que ela é a *controladora* dos dados e você é o *operador*. Cadastre o link da política de privacidade em `politicaPrivacidadeUrl`.
- As mensagens passam pela Meta (WhatsApp), pela Anthropic (Claude) e pelo Google (planilha). Cite isso na política de privacidade da clínica.

## Custos e como cobrar

- **Claude:** cobrado por uso, com valor por mensagem baixo. Rode o simulador e acompanhe o gasto no console da Anthropic antes de definir o preço. O modelo é configurável em `MODELO` (o padrão é `claude-opus-5-5`). Modelos menores custam menos e podem servir; teste antes de trocar.
- **WhatsApp:** responder o paciente dentro de 24h da mensagem dele costuma ser gratuito. Modelos (como o lembrete) são cobrados por mensagem pela Meta.
- **Hospedagem:** um servidor pequeno por clínica.
- **Sugestão de cobrança:** taxa de implantação (configuração, planilha, número, treino da equipe) mais uma mensalidade que cubra os custos acima com margem. Venda pelo resultado: menos faltas por causa dos lembretes e nenhum paciente sem resposta à noite ou no fim de semana.

## Estrutura do código

```
src/
  index.js            liga tudo: servidor, agente, agenda e lembretes
  servidor.js         webhook do WhatsApp (verificação + assinatura)
  atendimento.js      fila por paciente, transferência para humano, comandos da equipe
  agente.js           instruções da assistente, ferramentas e conversa com o Claude
  agenda/servico.js   regras: horários livres, sem marcação dupla, cancelar só as próprias
  agenda/planilha.js  Google Sheets
  agenda/arquivo.js   arquivo JSON (testes e simulador)
  disponibilidade.js  cálculo da grade de horários
  lembretes.js        lembrete da véspera
  conversas.js        histórico de cada paciente
  whatsapp.js         envio de mensagens pela Cloud API
  simulador.js        conversa pelo terminal
test/                 testes automáticos (npm test)
```

## Próximos passos possíveis

- Integrar com o sistema da clínica (Feegow, iClinic, Google Agenda) no lugar da planilha.
- Vários profissionais, cada um com a sua agenda.
- Entender áudios (transcrição) e mandar a localização da clínica.
- Pedir confirmação no lembrete com botões "Confirmo / Preciso remarcar".
- Painel com números do mês para mostrar ao cliente: consultas marcadas pela assistente e atendimentos fora do horário.
