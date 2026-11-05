# Retiro Efraim '26 — Identidade Visual

Casa de Oração Efraim · 11, 12 e 13 de dezembro · tema **Eu fui encontrado** (Lucas 15:6).
Tudo parte do cartaz oficial: pasto com sombras, a ovelha sozinha, papel, nota verde com clipe e patches bordados.

Abra `index.html` no navegador para ver o manual completo.

## Pastas

| Pasta | Conteúdo |
|---|---|
| `logo/` | letreiro "retiro efraim '26" em SVG: `completo`, `sem-tagline`, `so-nome` × `creme`, `verde`, `vermelho` (texto em curvas) |
| `elementos/` | patches bordados (oval, nuvem 2026, arco com ovelha), clipe dourado, ovelha no pasto, cordeiro no papel, logo da Casa de Oração (PNG transparente) |
| `fundos/` | pasto e paisagem desfocada, em feed (1080×1350) e story (1080×1920) |
| `artes/` | modelos em HTML (edite o texto) + `artes/png/` com as artes prontas |

## Cores

| Nome | HEX | Uso |
|---|---|---|
| Pasto | `#1F360C` | sombra da grama, títulos verdes |
| Folha | `#24500F` | nota com clipe |
| Manteiga | `#F6E3A1` | letreiro sobre o pasto |
| Papel | `#F3E6D0` | folhas, fundo dos patches |
| Bordado | `#8E1210` | patches e um destaque por arte |
| Ouro | `#C29B27` | clipe e fio separador |
| Capim | `#7D9230` | apoio |
| Céu | `#A3BFD9` | paisagem |

## Fontes (Google Fonts)

- **Outfit ExtraBold**: só o letreiro e números grandes, em minúsculas
- **Montserrat**: ExtraBold caixa-alta para títulos e notas; Regular espaçada para frases e datas
- **Lobster**: só dentro dos patches

## Gerar os PNGs de novo

Depois de editar um HTML em `artes/`, abra no navegador e exporte o quadro `.arte`
(1080×1350 ou 1080×1920), ou rode um screenshot com Playwright.

## Observações

- Os fundos de pasto e a ovelha foram recortados do cartaz enviado. Se tiver a foto original em alta, troque `fundos/pasto-*.jpg` mantendo os nomes.
- O logo da Casa de Oração foi extraído do cartaz; o til de "Oração" ficou fraco. Prefira o arquivo original da igreja.

## Carrossel "Faltam poucos dias"

`artes/carrossel-faltam-poucos-dias/` — 5 slides 1080×1350 (HTML editável + `png/`):

1. Faltam poucos dias / O que fazer antes do retiro?
2. É hora de preparar o coração (celular tocando a playlist do retiro, Salmo 23)
3. Ore pelo que ainda vai acontecer (semana de oração)
4. O que tem alimentado o seu coração? (música, vídeos, conteúdo)
5. Preparar o coração é criar espaço (janela com a paisagem, Tiago 4:8)

Legenda sugerida: "FALTAM POUCOS DIAS! Arrasta pro lado e vem preparar o coração com a gente. 11, 12 e 13 de dezembro."
