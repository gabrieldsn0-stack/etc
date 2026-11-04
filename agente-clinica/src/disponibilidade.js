import { DIAS_SEMANA, diaDaSemana, diferencaEmDias, deMinutos, paraMinutos } from "./tempo.js";

/** Duração de um procedimento pelo nome (ou a duração padrão da clínica). */
export function duracaoDoProcedimento(clinica, nomeProcedimento) {
  const alvo = String(nomeProcedimento ?? "").trim().toLowerCase();
  const proc = (clinica.procedimentos ?? []).find((p) => p.nome.toLowerCase() === alvo);
  return proc?.duracaoMin ?? clinica.duracaoConsultaMin;
}

/**
 * Motivo pelo qual a clínica não atende nesse dia, ou null se o dia é aberto.
 * `agora` é { data, hora } no fuso da clínica.
 */
export function motivoDiaFechado(clinica, data, agora) {
  const distancia = diferencaEmDias(agora.data, data);
  if (distancia < 0) return "Essa data já passou.";
  if (distancia > (clinica.diasMaximosAFrente ?? 60)) {
    return `A agenda só está aberta para os próximos ${clinica.diasMaximosAFrente ?? 60} dias.`;
  }
  if ((clinica.bloqueios ?? []).includes(data)) return "A clínica não atende nessa data.";
  const turnos = clinica.horarios?.[DIAS_SEMANA[diaDaSemana(data)]] ?? [];
  if (turnos.length === 0) return "A clínica não atende nesse dia da semana.";
  return null;
}

/**
 * Horários livres ("HH:MM") de um dia para uma consulta de `duracaoMin` minutos.
 * `ocupados` é a lista de agendamentos (com data, hora, duracaoMin) que ocupam a agenda.
 */
export function horariosLivres({ clinica, data, duracaoMin, ocupados, agora }) {
  if (motivoDiaFechado(clinica, data, agora)) return [];

  const passo = clinica.duracaoConsultaMin;
  const limiteHoje =
    data === agora.data ? paraMinutos(agora.hora) + (clinica.antecedenciaMinimaMin ?? 60) : -1;
  const doDia = ocupados
    .filter((a) => a.data === data)
    .map((a) => {
      const inicio = paraMinutos(a.hora);
      return { inicio, fim: inicio + (Number(a.duracaoMin) || passo) };
    });

  const livres = [];
  for (const [abre, fecha] of clinica.horarios[DIAS_SEMANA[diaDaSemana(data)]]) {
    for (let inicio = paraMinutos(abre); inicio + duracaoMin <= paraMinutos(fecha); inicio += passo) {
      if (inicio < limiteHoje) continue;
      const fim = inicio + duracaoMin;
      if (doDia.some((o) => inicio < o.fim && o.inicio < fim)) continue;
      livres.push(deMinutos(inicio));
    }
  }
  return livres;
}
