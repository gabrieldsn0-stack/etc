import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function lerJson(caminho, padrao) {
  try {
    return JSON.parse(readFileSync(caminho, "utf8"));
  } catch (erro) {
    if (erro.code === "ENOENT") return padrao;
    throw erro;
  }
}

/** Grava num arquivo temporário e renomeia, para nunca deixar um JSON pela metade. */
export function salvarJson(caminho, valor) {
  mkdirSync(dirname(caminho), { recursive: true });
  const temporario = `${caminho}.tmp`;
  writeFileSync(temporario, JSON.stringify(valor, null, 2));
  renameSync(temporario, caminho);
}
