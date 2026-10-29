# Prompt: tela de login no estilo da referência

> **De onde vieram os dados:** um único print de celular (iPhone, ~390px de largura lógica). As medidas foram estimadas a partir do print, convertidas para px CSS e arredondadas para a grade de 4px. As fontes e cores foram identificadas visualmente (não foi possível acessar o código do site), então valem como ponto de partida e devem ser ajustadas no olho.
> Troque o logo, os textos e os ícones de marca por **[MARCA]**, **[TEXTO]** e **[IMAGEM]**. O foco aqui é o layout e o comportamento, não o conteúdo do site original.

---

## 0. BASE GLOBAL

VAMOS IMPLEMENTAR A BASE GLOBAL DO PROJETO. ELA SERÁ ESTRUTURADA DA SEGUINTE FORMA.

**Paleta (variáveis CSS):**

```css
:root {
  --bg:            #0B0A14; /* fundo da página, quase preto com leve tom roxo */
  --bg-card:       #08070E; /* card de login, um tom mais escuro que o fundo */
  --bg-input:      #11101C; /* fundo dos campos */
  --border:        #1F1C2E; /* bordas sutis (divisória do header, card, linhas do "ou") */
  --border-input:  #2A2740; /* borda dos inputs */
  --text:          #F5F4FA; /* títulos */
  --text-muted:    #A9A6B8; /* parágrafos */
  --text-soft:     #8C89A0; /* "ou", textos auxiliares */
  --accent:        #8B5CF6; /* roxo da marca (ícone do logo, ponto final do logo) */
  --accent-soft:   #B9A4F8; /* eyebrows, labels e links ("Esqueci minha senha") */
  --glow:          rgba(124, 58, 237, .22); /* brilho roxo atrás do título */
  --white:         #FFFFFF; /* botão do Google */
}
```

**Tipografia:** uma única família geométrica sem serifa. Recomendo **DM Sans** (Google Fonts, pesos 400/500/600/700). Alternativas parecidas: Plus Jakarta Sans e Outfit.

| Uso | Tamanho (mobile) | Tamanho (desktop) | Peso | Detalhes |
|---|---|---|---|---|
| Eyebrow (ex.: "SEU PRÓXIMO PASSO…") | 11px | 12px | 600 | caixa alta, `letter-spacing: .2em`, cor `--accent-soft` |
| Título do hero (H1) | 32px / line-height 1.1 | 56–64px | 600 | `letter-spacing: -0.03em`, cor `--text` |
| Título do card (H2) | 26px / 1.15 | 32px | 600 | `letter-spacing: -0.03em` |
| Parágrafo | 15–16px / 1.6 | 17px | 400 | cor `--text-muted` |
| Label | 14px | 14px | 500 | cor `--accent-soft` |
| Botão | 15–16px | 16px | 600 | |
| Link pequeno | 14px | 14px | 400–500 | cor `--accent-soft` |

**Margens e grid:**
- Gutter lateral de **16px** no mobile e **24px** no desktop. O conteúdo fica num container de no máximo **1120px**.
- Ritmo vertical de 8px, com espaços grandes entre blocos (40–56px no mobile).

**Fundo:** `--bg` sólido mais um **brilho radial roxo** no canto superior esquerdo, atrás do título:

```css
body {
  background:
    radial-gradient(60% 40% at 15% 25%, var(--glow), transparent 70%),
    var(--bg);
}
```

O brilho é sutil e se dissolve antes do card.

**Componentes reutilizáveis:** eyebrow, input com label, botão branco (OAuth), divisória com texto ("ou") e card com borda de 1px.

---

## 1. HEADER

VAMOS IMPLEMENTAR O HEADER. ELE SERÁ ESTRUTURADO DA SEGUINTE FORMA.

- Linha única com altura de ~64px e padding vertical de 20px. Logo à esquerda, link "Voltar ao início" à direita, centralizados verticalmente.
- **Logo [MARCA]:** ícone de ~24px na cor `--accent` (no original, uma lupa/planeta com órbita) mais o wordmark em minúsculas, 22–24px, peso 700, `letter-spacing: -0.04em`, cor `--text`. O **ponto final do wordmark fica na cor `--accent`**. Esse detalhe vale a pena copiar.
- **Link "← [TEXTO de voltar]":** seta de 16px seguida do texto em 14px, cor `--text-muted`, gap de 10px.
  - Hover: cor muda para `--text` e a seta desliza 3px para a esquerda (`transform: translateX(-3px)`, `transition: .2s ease`).
- **Divisória:** `border-bottom: 1px solid var(--border)` logo abaixo, com a mesma largura do conteúdo (respeita o gutter, não vai de borda a borda).
- O header **não é fixo**: rola junto com a página.

---

## 2. HERO (bloco de texto acima do formulário)

VAMOS IMPLEMENTAR O HERO. ELE SERÁ ESTRUTURADO DA SEGUINTE FORMA.

- Margem superior de ~32px depois da divisória.
- **Eyebrow:** "[TEXTO EYEBROW]" com o estilo da tabela.
- **H1 em três linhas curtas**, cada frase terminando com ponto e quebrada manualmente (`<br>` ou `display:block` por frase). Exemplo de estrutura: "Mais [X]. / Mais [Y]. / Novas [Z]." A margem do eyebrow até o título é de ~20px.
- **Parágrafo** com até ~2 linhas e largura máxima de ~560px no desktop. A margem acima é de ~28px.
- **Animação de entrada (sugerida, não verificada no original):** eyebrow, cada linha do H1 e o parágrafo entram com `opacity 0 → 1` e `translateY(16px → 0)`, 600ms, `cubic-bezier(.2,.7,.2,1)`, com stagger de 80ms. Pode ser feito em CSS puro com `animation-delay`, ou com GSAP e SplitText por linha.

---

## 3. CARD DE LOGIN

VAMOS IMPLEMENTAR O CARD DE LOGIN. ELE SERÁ ESTRUTURADO DA SEGUINTE FORMA.

- **Container:** fundo `--bg-card`, `border: 1px solid var(--border)`, `border-radius: 20px`, padding de **20px** no mobile e **40px** no desktop, ocupando a largura do conteúdo no mobile. A margem acima é de ~40px.
- **Conteúdo, de cima para baixo:**
  1. Eyebrow "[TEXTO]" (ex.: mensagem de boas-vindas).
  2. H2 "[TÍTULO CURTO]." com margem superior de 20px.
  3. Parágrafo de uma linha, `--text-muted`, com margem superior de 16px.
  4. **Botão "Continuar com Google"**, com margem superior de 28px:
     - Largura de 100%, altura de **48px**, fundo `--white`, texto `#111` em 16px peso 600, `border-radius: 12px`.
     - Logo "G" colorido de 20px à esquerda do texto, gap de 12px, conjunto centralizado.
     - Hover: fundo `#F1F0F5` e uma sombra leve (`0 6px 20px rgba(0,0,0,.25)`). Active: `scale(.98)`. Transição de 150ms.
  5. **Divisória "ou":** linha `--border` de cada lado, com o texto "ou" (14px, `--text-soft`) no centro e gap de 24px. A margem vertical é de 24px. Pode ser feita com flex mais dois `::before`/`::after` usando `flex:1; height:1px`.
  6. **Campo E-mail:** label acima (14px, peso 500, `--accent-soft`, margem inferior de 12px) e input com altura de **48px**, fundo `--bg-input`, `border: 1px solid var(--border-input)`, `border-radius: 12px`, padding horizontal de 16px, texto `--text` em 16px (16px evita o zoom do iOS).
     - Foco: borda `--accent` e `box-shadow: 0 0 0 3px rgba(139,92,246,.25)`, transição de 150ms. Sem `outline` padrão.
  7. **Campo Senha:** mesmo estilo, margem superior de 24px. O **ícone de olho** de 20px fica dentro do input, à direita (16px da borda), com cor `--text-soft`. O clique alterna `type="password"` ↔ `type="text"` e troca o ícone (olho ↔ olho riscado). O hover deixa o ícone na cor `--text`.
  8. **"Esqueci minha senha"** alinhado à direita, 14px, `--accent-soft`, margem superior de 16px. O hover adiciona sublinhado.
  9. **Botão principal de entrar** (fica coberto pela barra do Safari no print, então **não foi verificado**): siga o mesmo tamanho do botão do Google, com fundo `--accent`, texto branco e hover um pouco mais claro. Margem superior de 24px.
  10. **Rodapé do card:** links pequenos "[Privacidade] · [Ajuda]" (12–13px, `--text-soft`, sublinhados), centralizados ou à direita. Também estão parcialmente cobertos no print.

---

## 4. COMPORTAMENTO RESPONSIVO

- **Mobile (< 768px):** tudo em uma coluna, como no print. Hero em cima, card embaixo, gutter de 16px.
- **Desktop (≥ 1024px), sugestão:** duas colunas. O hero fica à esquerda (≈55%, alinhado verticalmente ao centro, H1 de 56–64px) e o card à direita (largura fixa de ~440px), com gap de 64px. O header continua no topo com o mesmo layout. O brilho radial fica atrás da coluna do hero.
  - Essa versão desktop é uma **sugestão**: o print mostra só o mobile.

---

## 5. MAPA DE PRÓXIMAS TELAS

| Tela | Conteúdo provável | Status |
|---|---|---|
| Login (este prompt) | Header, hero, card com Google e e-mail/senha | Coberto |
| Cadastro | Provavelmente o mesmo layout com nome, e-mail e senha | Não visto |
| Esqueci minha senha | Card com campo de e-mail | Não visto |
| App logado (`/app`) | Painel com oportunidades e próximos passos | Não visto |
| Página inicial (link "Voltar ao início") | Landing page | Não visto |

---

## 6. STACK RECOMENDADA

- **Original:** não verificado (o domínio estava bloqueado para análise).
- **Sugestão:** Next.js (App Router) + Tailwind CSS. As variáveis acima vão para `globals.css` e são mapeadas no `tailwind.config`. Use `next/font` com DM Sans.
- **Autenticação:** Supabase Auth, Clerk ou NextAuth (Auth.js) cobrem Google OAuth mais e-mail/senha com pouco código.
- **Animações:** CSS é suficiente. Use GSAP apenas se quiser o SplitText por linha no H1.
- Não há nada difícil de replicar: nada de WebGL ou canvas. O brilho é um `radial-gradient`.
