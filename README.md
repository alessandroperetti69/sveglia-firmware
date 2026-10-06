# Sveglia

Firmware della sveglia smart da comodino (Waveshare ESP32-S3-Touch-AMOLED-1.75): le versioni
pubblicate, da cui le sveglie si aggiornano, e lo script per collegare Google Calendar.
Il codice sorgente non è qui.

<!-- Questo file viene da esphome/public/README.md del repo privato: si cambia lì, e
     tools/release.py lo copia qui a ogni versione. -->

## Primo avvio

1. Collega la sveglia alla presa.
2. Non conoscendo ancora nessuna rete, apre la rete WiFi **Sveglia setup** (senza password).
   Collegati con il telefono: si apre una pagina dove scegli la tua rete e scrivi la password.
   Se la pagina non si apre da sola, vai su `http://192.168.4.1`.
3. Rimetti il telefono sulla rete di casa e apri l'indirizzo che la sveglia mostra sullo
   schermo, `sveglia-<cifre>.local`. È la pagina di controllo: per prima cosa chiede il tuo
   nome, che diventa anche l'indirizzo definitivo (per esempio `sveglia-giulia.local`), e la
   pagina ci si sposta da sola. Da lì ci sono tutte le impostazioni: città del meteo, sveglie,
   suoni.

Se l'indirizzo con `.local` non si apre (succede con alcuni telefoni Android e con alcuni
router), usa l'indirizzo IP: lo mostrano la pagina WiFi delle impostazioni sulla sveglia e la
sezione "WiFi e alimentazione" della pagina web. Conviene salvarlo nei preferiti.

Per sapere come si usa, tocca il **?** in cima alla prima pagina delle impostazioni (scorri
verso l'alto dall'ora): la sveglia racconta a voce come funziona.

## Calendario Google

La sveglia legge gli impegni di oggi e li dice al risveglio. Si collega dalla pagina web,
sezione "Oggi", "Collega il tuo calendario":

1. Apri [script.google.com](https://script.google.com) con il tuo account Google e crea un nuovo progetto.
2. Al posto del codice che c'è incolla [calendario.gs](calendario.gs), e in cima cambia `TOKEN`
   con una parola lunga e casuale.
3. Esegui una volta la funzione `prova` e concedi l'accesso al calendario.
4. **Esegui il deployment › Nuovo deployment › App web**, con "Esegui come: Me" e
   "Chi ha accesso: Chiunque".
5. Copia l'indirizzo che finisce con `/exec`, aggiungi `?token=` e il tuo token, e incollalo
   nella pagina web della sveglia.

Chi conosce l'indirizzo completo può leggere i titoli dei tuoi impegni di oggi: trattalo come
una password.

## Aggiornamenti

La sveglia controlla da sola se c'è una versione nuova. La pagina web la mostra nella sezione
"Aggiornamenti" con le novità, e la installa solo se lo confermi, mai poco prima di una sveglia.
Se il download si interrompe resta la versione di prima.

## Installare il firmware su una sveglia nuova

Serve una sola volta, via cavo USB, da Chrome o Edge su un computer:

1. Scarica `sveglia-<versione>.factory.bin` dall'[ultima release](../../releases/latest).
2. Apri [web.esphome.io](https://web.esphome.io), collega la sveglia, **Connect** e poi
   **Install**, scegliendo il file scaricato. Se la sveglia non viene vista, tieni premuto
   BOOT mentre colleghi il cavo.

Dopo, gli aggiornamenti passano dal WiFi.
