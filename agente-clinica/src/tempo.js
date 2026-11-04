// Datas e horas sempre no fuso da clínica, como texto: "AAAA-MM-DD" e "HH:MM".
// Trabalhar com texto evita surpresas de fuso horário do servidor.

export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const NOMES_DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Data e hora atuais no fuso informado. */
export function agoraNoFuso(fuso, instante = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: fuso,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instante)
      .map((p) => [p.type, p.value]),
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

export function dataValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [a, m, d] = data.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function horaValida(hora) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(data) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function nomeDoDia(data) {
  return NOMES_DIAS[diaDaSemana(data)];
}

export function somarDias(data, dias) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function diferencaEmDias(de, ate) {
  const ms = (s) => {
    const [a, m, d] = s.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((ms(ate) - ms(de)) / 86_400_000);
}

export function paraMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function deMinutos(min) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** "2026-11-04" -> "04/11/2026" */
export function dataBR(data) {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

/** "04/11/2026" -> "2026-11-04" (aceita também o formato ISO). */
export function dataDeBR(texto) {
  const t = String(texto ?? "").trim();
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return t;
}
