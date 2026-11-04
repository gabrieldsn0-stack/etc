import { agoraNoFuso, dataBR, nomeDoDia, somarDias } from "./tempo.js";

/**
 * Envia, uma vez por consulta, um lembrete na véspera, a partir da hora configurada.
 * Usa um modelo de mensagem aprovado pela Meta, com 5 variáveis no corpo:
 * {{1}} nome do paciente, {{2}} dia da semana, {{3}} data, {{4}} hora, {{5}} nome da clínica.
 */
export async function enviarLembretes({ agenda, whatsapp, clinica, instante = new Date() }) {
  const modelo = clinica.lembrete;
  if (!modelo?.nomeModelo) return 0;

  const agora = agoraNoFuso(clinica.fuso, instante);
  if (agora.hora < (modelo.aPartirDe ?? "09:00")) return 0;

  const amanha = somarDias(agora.data, 1);
  let enviados = 0;
  for (const a of await agenda.pendentesDeLembrete(amanha)) {
    try {
      await whatsapp.enviarModelo(a.telefone, modelo.nomeModelo, modelo.idioma ?? "pt_BR", [
        a.paciente.split(" ")[0],
        nomeDoDia(a.data),
        dataBR(a.data),
        a.hora,
        clinica.nome,
      ]);
      await agenda.marcarLembreteEnviado(a.id);
      enviados++;
    } catch (erro) {
      console.error(`[lembretes] falha ao lembrar a consulta ${a.id}:`, erro.message);
    }
  }
  return enviados;
}

export function iniciarLembretes({ intervaloMin = 15, ...dependencias }) {
  const rodar = () =>
    enviarLembretes(dependencias)
      .then((n) => n && console.log(`[lembretes] ${n} lembrete(s) enviado(s)`))
      .catch((erro) => console.error("[lembretes] erro:", erro));
  rodar();
  return setInterval(rodar, intervaloMin * 60 * 1000);
}
