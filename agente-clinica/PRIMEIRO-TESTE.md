# Primeiro teste real, passo a passo

Ao final deste guia você manda "Oi" do seu celular e a assistente responde no WhatsApp, marca a consulta e a consulta aparece na planilha.

Tempo estimado: 1 a 2 horas na primeira vez. Custo: só os créditos do Claude (mínimo de US$ 5, que dura muitos testes). O número de teste da Meta e o Google Sheets são gratuitos.

> **O que já está pronto:** o código, os testes, o verificador de configuração e a planilha da agenda, já criada no seu Google Drive: **"Agenda - Agente Clínica (teste)"**. O ID dela já está no `.env.exemplo`.
>
> **O que só você pode fazer:** criar as contas e chaves (Anthropic, Google Cloud e Meta), porque elas pedem o seu login, e às vezes cartão ou confirmação por SMS.

Os menus dos sites mudam de nome com o tempo. Se algo não estiver exatamente onde o guia diz, procure pelo nome parecido ou me mande um print.

---

## Passo 0: baixar o projeto e instalar o Node.js

1. Instale o **Node.js LTS** em https://nodejs.org (próximo, próximo, concluir).
2. Baixe o projeto. No GitHub, abra o repositório `gabrieldsn0-stack/etc`, troque o branch para `claude/seeker-ai-site-analysis-k5pkfb`, clique em **Code → Download ZIP** e descompacte.
3. Abra um terminal **dentro da pasta `agente-clinica`**:
   - **Windows:** abra a pasta no Explorador, clique na barra de endereço, digite `cmd` e aperte Enter.
   - **Mac:** clique com o botão direito na pasta e escolha *Novo Terminal na Pasta*.
4. Rode:
   ```
   npm install
   ```
5. Crie os seus arquivos de configuração a partir dos exemplos:
   - **Windows:** `copy .env.exemplo .env` e `copy clinica.exemplo.json clinica.json`
   - **Mac/Linux:** `cp .env.exemplo .env` e `cp clinica.exemplo.json clinica.json`

Para editar o `.env` e o `clinica.json`, use o Bloco de Notas ou, melhor, o [VS Code](https://code.visualstudio.com).

Daqui em diante, sempre que terminar um passo, rode `npm run verificar`. Ele confere tudo e diz exatamente o que falta.

---

## Passo 1: chave do Claude (cerca de 10 min)

1. Entre em https://console.anthropic.com e crie a conta.
2. Em **Billing**, adicione créditos (US$ 5 já bastam para testar bastante).
3. Em **API Keys → Create Key**, dê o nome `agente-clinica` e copie a chave. Ela começa com `sk-ant-` e só aparece uma vez.
4. No `.env`, cole a chave depois de `ANTHROPIC_API_KEY=`, sem espaços.
5. Rode `npm run verificar`. O item 3 deve ficar ✅.
6. Teste a conversa pelo terminal:
   ```
   npm run simular
   ```

## Passo 2: dados da clínica de teste (cerca de 10 min)

Edite o `clinica.json`. Para o teste você pode inventar a clínica, mas preste atenção em dois campos:

- `telefoneEquipe`: coloque **o seu WhatsApp**, só números com 55 e DDD (ex.: `5511987654321`). É para ele que vão os avisos quando a assistente transferir um paciente.
- `lembrete.nomeModelo`: deixe `""` (vazio) por enquanto. O lembrete exige um modelo aprovado pela Meta, que fica para depois do primeiro teste.

## Passo 3: ligar a planilha (cerca de 15 min)

A planilha já existe no seu Drive. Falta criar uma "conta de serviço", uma espécie de usuário-robô do Google que o programa usa para escrever nela.

1. Entre em https://console.cloud.google.com com o mesmo Gmail da planilha.
2. No topo, clique no seletor de projeto, depois em **Novo projeto**. Nome: `agente-clinica`. Clique em **Criar** e selecione o projeto.
3. Menu ☰ → **APIs e serviços → Biblioteca**. Procure **Google Sheets API** e clique em **Ativar**.
4. Menu ☰ → **IAM e administrador → Contas de serviço → Criar conta de serviço**. Nome: `agente`. Clique em **Criar e continuar** e depois em **Concluir** (não precisa dar papel nenhum).
5. Clique na conta criada e vá em **Chaves → Adicionar chave → Criar nova chave → JSON → Criar**. Um arquivo `.json` será baixado. **Guarde-o bem e nunca o publique.**
6. Abra esse arquivo no Bloco de Notas e copie dois campos para o `.env`:
   ```
   AGENDA=planilha
   GOOGLE_EMAIL_CONTA_SERVICO=agente@agente-clinica-XXXX.iam.gserviceaccount.com
   GOOGLE_CHAVE_PRIVADA="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```
   O `client_email` vai em `GOOGLE_EMAIL_CONTA_SERVICO`. O `private_key` vai em `GOOGLE_CHAVE_PRIVADA`, **inteiro, entre aspas, com os `\n`**, exatamente como está no arquivo.
7. Abra a planilha [Agenda - Agente Clínica (teste)](https://docs.google.com/spreadsheets/d/1HvtWRnMJNBFIPy1wHRGKqmn4i0YoSHAxq1oJwkXUUeM/edit), clique em **Compartilhar**, cole o `client_email` e dê permissão de **Editor**. Se preferir, me mande só o `client_email` (nunca a chave) que eu compartilho por você.
8. Rode `npm run verificar`. O item 4 deve ficar ✅, e a aba **Agendamentos** com o cabeçalho aparece sozinha na planilha.

## Passo 4: WhatsApp com o número de teste da Meta (cerca de 30 min)

A Meta dá um **número de teste gratuito**, que pode conversar com até 5 celulares cadastrados. Não precisa usar o número de nenhuma clínica ainda.

1. Entre em https://developers.facebook.com com seu Facebook e aceite os termos de desenvolvedor, se for a primeira vez.
2. **Meus apps → Criar app.** Escolha o caso de uso de **WhatsApp** (algo como "Conectar-se com clientes pelo WhatsApp"). Se pedir um portfólio empresarial, crie um com seu nome.
3. No menu do app, vá em **WhatsApp → Configuração da API** (*API Setup*). Lá você vai ver:
   - um **número de teste** já criado;
   - **ID do número de telefone** (*Phone number ID*): cole em `WHATSAPP_ID_NUMERO`;
   - botão **Gerar token de acesso**: o token vai em `WHATSAPP_TOKEN`. **Ele dura 24 horas.** Para testar está ótimo; quando expirar, é só gerar outro.
   - campo **Para** (*To*): adicione **o seu WhatsApp** e confirme com o código que chegar.
4. Clique em **Enviar mensagem** nessa mesma página. Você deve receber um "Hello World" no celular. Salve esse número de teste nos seus contatos.
5. Menu do app → **Configurações do app → Básico → Chave secreta do app → Mostrar**. Cole em `WHATSAPP_SEGREDO_APP`.
6. Em `WHATSAPP_TOKEN_VERIFICACAO`, invente uma senha qualquer, por exemplo `minha-senha-123`. Você vai repeti-la no passo 6.
7. Rode `npm run verificar`. O item 5 deve mostrar ✅ com o número de teste.

## Passo 5: ligar o servidor e abrir um "túnel" para a internet

A Meta precisa de um endereço `https://` público para entregar as mensagens. No teste, um túnel gratuito da Cloudflare expõe o seu computador. Não precisa de conta.

1. Instale o `cloudflared` (só uma vez):
   - **Windows:** `winget install --id Cloudflare.cloudflared` (depois feche e abra o terminal)
   - **Mac:** `brew install cloudflared`
2. **Terminal 1**, na pasta `agente-clinica`:
   ```
   npm start
   ```
   Deve aparecer: `Agente da ... ouvindo na porta 3000`.
3. **Terminal 2** (abra outro):
   ```
   cloudflared tunnel --url http://localhost:3000
   ```
   Ele mostra um endereço como `https://palavras-aleatorias.trycloudflare.com`. Copie.
4. No navegador, abra `https://SEU-ENDERECO.trycloudflare.com/saude`. Tem que aparecer **ok**.

Deixe os dois terminais abertos durante o teste. Se você fechar o túnel, o endereço muda e o passo 6 precisa ser refeito.

## Passo 6: cadastrar o webhook na Meta

1. No app da Meta: **WhatsApp → Configuração** (*Configuration*), seção **Webhook → Editar**.
   - URL de callback: `https://SEU-ENDERECO.trycloudflare.com/webhook`
   - Token de verificação: o mesmo de `WHATSAPP_TOKEN_VERIFICACAO`
   - Clique em **Verificar e salvar**.
2. Logo abaixo, em **Campos do webhook**, clique em **Gerenciar** e assine **messages**.

## Passo 7: o teste de verdade 🎉

Do seu celular, mande mensagens para o número de teste:

1. "Oi, queria marcar uma consulta pra amanhã de manhã". Siga a conversa até ela confirmar e mandar o código. **Abra a planilha: a consulta tem que estar lá.**
2. "Quais consultas eu tenho marcadas?"
3. "Quero remarcar para outro dia" (a linha antiga deve virar `cancelado` e aparecer uma nova).
4. "Quanto custa? Aceita Unimed?" (só pode responder com o que está no `clinica.json`).
5. "Quero falar com uma pessoa". Você recebe o aviso da equipe (no teste, é o seu próprio número), e a assistente fica em silêncio. Para devolver, mande `#devolver 55SEUNUMERO`.
6. Na planilha, adicione uma linha com data, hora, duração `60` e status `bloqueado`. Depois peça esse horário: ela não pode oferecer.

Anote o que achou estranho nas respostas e me mande. Ajustar o jeito de falar é rápido.

---

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| "Verificar e salvar" falha na Meta | Confira se o `npm start` e o túnel estão rodando, se o endereço termina em `/webhook` e se o token é idêntico ao do `.env`. |
| Mensagem chega, mas ninguém responde, e o terminal não mostra nada | Falta assinar o campo **messages** no passo 6, ou o túnel mudou de endereço. |
| Terminal mostra erro **401** | `WHATSAPP_SEGREDO_APP` está errado (é a chave secreta do app, não o token). |
| Erro com **code 190** | O token de 24h expirou. Gere outro no passo 4.3 e reinicie o `npm start`. |
| Erro **131030** (número não permitido) | Seu celular não está na lista **Para** do passo 4.3. |
| "problema técnico" no WhatsApp | Veja o erro no Terminal 1. Quase sempre é a chave do Claude ou falta de créditos. |
| Qualquer outra coisa | Rode `npm run verificar` e me mande o resultado (ele não mostra suas chaves). |

**Nunca me mande:** a chave do Claude, o token do WhatsApp, a chave secreta do app ou o arquivo JSON do Google. Se precisar de ajuda, mande o erro, que já basta.

## Depois do teste: rumo à primeira clínica

1. **Token permanente** da Meta (usuário do sistema no Gerenciador de Negócios), para não expirar a cada 24h.
2. **Número real** da clínica registrado na API, com o nome da empresa verificado.
3. **Modelo de lembrete** aprovado (veja o README, passo 5) e `nomeModelo` preenchido.
4. **Hospedagem** 24h (Railway, Render ou uma VPS) no lugar do seu computador com túnel.
5. **Contrato e LGPD** com a clínica (veja o README, seção 7).

Posso fazer cada um desses passos com você quando chegar a hora.
