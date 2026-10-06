/**
 * Impegni di oggi per la sveglia.
 *
 * Gira nel tuo account Google e risponde a un indirizzo segreto con i soli impegni
 * di oggi: le frasi da leggere a voce e le righe da mostrare sullo schermo.
 * Istruzioni di pubblicazione nel README.
 */

// Scegli una stringa lunga e casuale: è la "password" dell'indirizzo.
const TOKEN = 'CAMBIA-QUESTO-TOKEN';

// Nomi dei calendari da leggere. Lascia vuoto per leggere tutti quelli che hai spuntato
// (cioè visibili) in Google Calendar.
const CALENDARI = [];

// Il TTS rifiuta testi oltre circa 200 caratteri: ogni frase resta sotto questo limite.
const MAX_FRASE = 180;
const MAX_IMPEGNI = 8;
const MAX_TITOLO = 60;

function doGet(e) {
  if (!e || !e.parameter || e.parameter.token !== TOKEN) {
    return rispondi({ ok: false, error: 'token' });
  }
  try {
    const risposta = impegniDiOggi();
    // Aggiungi &debug=1 all'indirizzo per vedere quali calendari vengono letti.
    if (e.parameter.debug) risposta.debug = diagnostica();
    return rispondi(risposta);
  } catch (err) {
    return rispondi({ ok: false, error: String(err) });
  }
}

/** Calendari da leggere: quelli elencati in CALENDARI, altrimenti quelli visibili in Google Calendar. */
function calendariDaLeggere() {
  if (CALENDARI.length) {
    return CALENDARI.map(function (nome) { return CalendarApp.getCalendarsByName(nome)[0]; }).filter(Boolean);
  }
  const visibili = CalendarApp.getAllCalendars().filter(function (cal) {
    return cal.isSelected() && !cal.isHidden();
  });
  return visibili.length ? visibili : [CalendarApp.getDefaultCalendar()];
}

/** Il fuso è quello del calendario, non quello del progetto Apps Script, che può essere diverso. */
function fusoOrario() {
  return CalendarApp.getDefaultCalendar().getTimeZone();
}

function impegniDiOggi() {
  const tz = fusoOrario();
  const adesso = new Date();
  const giorno = Utilities.formatDate(adesso, tz, 'yyyy-MM-dd');

  let impegni = [];
  const visti = {};
  calendariDaLeggere().forEach(function (cal) {
    eventiDelGiorno(cal, adesso, tz).forEach(function (ev) {
      // Lo stesso impegno può comparire in più calendari (per esempio un invito condiviso).
      const chiave = ev.getId() + '|' + ev.getStartTime().getTime();
      if (visti[chiave]) return;
      visti[chiave] = true;
      const tuttoIlGiorno = ev.isAllDayEvent();
      // Un impegno iniziato ieri e non ancora finito non ha un orario di inizio da annunciare.
      const iniziatoPrima = !tuttoIlGiorno && Utilities.formatDate(ev.getStartTime(), tz, 'yyyy-MM-dd') !== giorno;
      impegni.push({
        inizio: tuttoIlGiorno ? 0 : minutiDelGiorno(ev.getStartTime(), giorno, tz, 0),
        fine: tuttoIlGiorno ? 1440 : minutiDelGiorno(ev.getEndTime(), giorno, tz, 1440),
        tuttoIlGiorno: tuttoIlGiorno,
        iniziatoPrima: iniziatoPrima,
        titolo: accorcia(ev.getTitle() || 'Impegno senza titolo', MAX_TITOLO),
      });
    });
  });

  impegni.sort(function (a, b) { return a.inizio - b.inizio; });

  // A voce si leggono solo gli impegni non ancora finiti.
  const oraMinuti = minutiDelGiorno(adesso, giorno, tz, 0);
  const rimasti = impegni.filter(function (i) { return i.fine > oraMinuti; });

  // Sullo schermo resta tutta la giornata; se non ci sta, si tolgono prima quelli già finiti.
  const perSchermo = impegni.slice();
  while (perSchermo.length > MAX_IMPEGNI && perSchermo[0].fine <= oraMinuti) perSchermo.shift();

  return {
    ok: true,
    date: giorno,
    count: rimasti.length,
    total: impegni.length,
    speech: frasi(rimasti.slice(0, MAX_IMPEGNI), rimasti.length, impegni.length),
    events: perSchermo.slice(0, MAX_IMPEGNI).map(function (i) {
      const quando = i.tuttoIlGiorno ? 'Oggi' : i.iniziatoPrima ? 'In corso' : orario(i.inizio);
      return { s: i.inizio, e: i.fine, t: quando + '  ' + i.titolo };
    }),
  };
}

/** Impegni della giornata di oggi nel fuso indicato, da mezzanotte a mezzanotte. */
function eventiDelGiorno(cal, adesso, tz) {
  const giorno = Utilities.formatDate(adesso, tz, 'yyyy-MM-dd');
  const scarto = Utilities.formatDate(adesso, tz, 'XXX');
  const inizio = new Date(giorno + 'T00:00:00' + scarto);
  const fine = new Date(inizio.getTime() + 24 * 60 * 60 * 1000);
  return cal.getEvents(inizio, fine);
}

/** Elenco dei calendari dell'account con quanti impegni hanno oggi: serve a capire cosa viene letto. */
function diagnostica() {
  const tz = fusoOrario();
  const adesso = new Date();
  const letti = calendariDaLeggere().map(function (cal) { return cal.getId(); });
  return {
    ora: Utilities.formatDate(adesso, tz, 'yyyy-MM-dd HH:mm'),
    fuso: tz,
    fusoProgetto: Session.getScriptTimeZone(),
    calendari: CalendarApp.getAllCalendars().map(function (cal) {
      return {
        nome: cal.getName(),
        letto: letti.indexOf(cal.getId()) >= 0,
        visibile: cal.isSelected() && !cal.isHidden(),
        impegniOggi: eventiDelGiorno(cal, adesso, tz).length,
      };
    }),
  };
}

/** Frasi da leggere, raggruppate per fare meno pause ma sempre sotto MAX_FRASE. */
function frasi(impegni, totale, inGiornata) {
  const pezzi = [];
  if (totale === 0) {
    pezzi.push(inGiornata ? 'Per oggi non hai altri impegni.' : 'Oggi non hai impegni in calendario.');
  } else if (totale === 1) {
    pezzi.push('Oggi hai un impegno.');
  } else {
    pezzi.push('Oggi hai ' + totale + ' impegni.');
  }
  impegni.forEach(function (i) {
    const quando = i.tuttoIlGiorno ? 'Per tutto il giorno' : i.iniziatoPrima ? 'Già in corso' : 'Alle ' + orarioParlato(i.inizio);
    // Niente puntini nel testo da leggere: il TTS li pronuncia male.
    pezzi.push(quando + ', ' + i.titolo.replace(/…$/, '') + '.');
  });
  if (totale > impegni.length) {
    pezzi.push('E altri ' + (totale - impegni.length) + '.');
  }

  const out = [];
  let corrente = '';
  pezzi.forEach(function (p) {
    p = accorcia(p, MAX_FRASE);
    if (corrente && (corrente + ' ' + p).length > MAX_FRASE) {
      out.push(corrente);
      corrente = p;
    } else {
      corrente = corrente ? corrente + ' ' + p : p;
    }
  });
  if (corrente) out.push(corrente);
  return out;
}

function minutiDelGiorno(data, giorno, tz, seAltroGiorno) {
  if (Utilities.formatDate(data, tz, 'yyyy-MM-dd') !== giorno) return seAltroGiorno;
  return Number(Utilities.formatDate(data, tz, 'H')) * 60 + Number(Utilities.formatDate(data, tz, 'm'));
}

function orario(minuti) {
  const h = Math.floor(minuti / 60);
  const m = minuti % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function orarioParlato(minuti) {
  const h = Math.floor(minuti / 60);
  const m = minuti % 60;
  return m === 0 ? String(h) : h + ' e ' + m;
}

/** Accorcia a fine parola, così non restano parole troncate a metà. */
function accorcia(testo, max) {
  testo = String(testo).replace(/\s+/g, ' ').trim();
  if (testo.length <= max) return testo;
  const taglio = testo.slice(0, max - 1);
  const spazio = taglio.lastIndexOf(' ');
  return (spazio > max / 2 ? taglio.slice(0, spazio) : taglio).replace(/[\s,;:.]+$/, '') + '…';
}

function rispondi(oggetto) {
  return ContentService.createTextOutput(JSON.stringify(oggetto)).setMimeType(ContentService.MimeType.JSON);
}

/** Da eseguire a mano nell'editor per vedere cosa riceverà la sveglia. */
function prova() {
  Logger.log(JSON.stringify(diagnostica(), null, 2));
  Logger.log(JSON.stringify(impegniDiOggi(), null, 2));
}
