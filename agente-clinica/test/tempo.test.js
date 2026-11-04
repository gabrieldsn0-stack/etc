import assert from "node:assert/strict";
import { test } from "node:test";
import { agoraNoFuso, dataBR, dataDeBR, dataValida, diaDaSemana, nomeDoDia, somarDias } from "../src/tempo.js";

test("converte o instante para o fuso da clínica", () => {
  // 02:30 UTC é 23:30 do dia anterior em São Paulo (UTC-3)
  assert.deepEqual(agoraNoFuso("America/Sao_Paulo", new Date("2026-11-05T02:30:00Z")), { data: "2026-11-04", hora: "23:30" });
});

test("dias da semana e contas de datas", () => {
  assert.equal(diaDaSemana("2026-11-04"), 3);
  assert.equal(nomeDoDia("2026-11-04"), "quarta-feira");
  assert.equal(somarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(dataBR("2026-11-04"), "04/11/2026");
  assert.equal(dataDeBR("4/11/2026"), "2026-11-04");
  assert.equal(dataValida("2026-02-30"), false);
});
