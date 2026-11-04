import assert from "node:assert/strict";
import { test } from "node:test";
import { horariosLivres, motivoDiaFechado } from "../src/disponibilidade.js";
import { AGORA, CLINICA } from "./ajuda.js";

const livres = (data, duracaoMin = 30, ocupados = []) => horariosLivres({ clinica: CLINICA, data, duracaoMin, ocupados, agora: AGORA });

test("hoje só oferece horários depois da antecedência mínima", () => {
  assert.deepEqual(livres("2026-11-04"), ["11:00", "11:30", "14:00", "14:30", "15:00", "15:30"]);
});

test("pula horários ocupados e respeita a duração do procedimento", () => {
  const ocupados = [{ data: "2026-11-05", hora: "09:00", duracaoMin: 30 }];
  assert.deepEqual(livres("2026-11-05", 30, ocupados), ["08:00", "08:30", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  // 60 minutos não cabem às 08:30 (encosta no das 09:00) nem às 11:30 (passa do fechamento)
  assert.deepEqual(livres("2026-11-05", 60, ocupados), ["08:00", "09:30", "10:00", "10:30", "11:00"]);
});

test("dias fechados", () => {
  assert.deepEqual(livres("2026-11-08"), []); // domingo
  assert.match(motivoDiaFechado(CLINICA, "2026-11-08", AGORA), /dia da semana/);
  assert.match(motivoDiaFechado(CLINICA, "2026-11-20", AGORA), /não atende nessa data/);
  assert.match(motivoDiaFechado(CLINICA, "2026-11-03", AGORA), /já passou/);
  assert.match(motivoDiaFechado(CLINICA, "2027-01-10", AGORA), /próximos 30 dias/);
});
