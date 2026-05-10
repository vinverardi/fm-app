const empfaengerEingabefeld = document.getElementById("empfaenger-eingabe");

const kontakteSchalter = document.getElementById("kontakte-schalter");
const kontakteFenster = document.getElementById("kontakte-fenster");
const kontakteListe = document.getElementById("kontakte-liste");
const kontakteEingabefeld = document.getElementById("kontakte-eingabe");

// Kontakte laden.

let kontakte = [];

async function kontakteLaden() {
  const antwort = await fetch("/kontakte");

  return await antwort.json();
}

// Kontaktefenster anzeigen.

function kontakteAnordnen() {
  const rechteck = empfaengerEingabefeld.getBoundingClientRect();

  kontakteFenster.style.left = `${window.scrollX + rechteck.left}px`;
  kontakteFenster.style.top = `${window.scrollY + rechteck.bottom + 4}px`;
}

function kontakteAnzeigen(kontakte) {
  kontakteListe.innerHTML = "";

  for (const kontakt of kontakte) {
    const eintrag = document.createElement("li");

    eintrag.textContent = `${kontakt.name} (${kontakt.nummer})`;

    eintrag.addEventListener("click", () => {
      empfaengerEingabefeld.value = kontakt.nummer;

      kontakteVerstecken();
    });

    kontakteListe.appendChild(eintrag);
  }
}

kontakteEingabefeld.addEventListener("input", () => {
  const suchEingabe = kontakteEingabefeld.value.toLowerCase();

  const suchAusgabe = kontakte.filter(kontakt =>
    kontakt.name.toLowerCase().includes(suchEingabe) ||
    kontakt.nummer.toLowerCase().includes(suchEingabe)
  );

  kontakteAnzeigen(suchAusgabe);
});

kontakteSchalter.addEventListener("click", async () => {
  kontakteAnordnen();

  kontakteFenster.classList.remove("hidden");

  if (kontakte.length === 0) {
    kontakte = await kontakteLaden();

    kontakteAnzeigen(kontakte);
  }

  kontakteEingabefeld.focus();
});

window.addEventListener("resize", kontakteAnordnen);
window.addEventListener("scroll", kontakteAnordnen);

// Kontaktefenster verstecken.

function kontakteVerstecken() {
  kontakteFenster.classList.add("hidden");
}

document.addEventListener("click", (event) => {
  const fensterGeklickt = kontakteFenster.contains(event.target);
  const schalterGeklickt = kontakteSchalter.contains(event.target);

  if (!fensterGeklickt && !schalterGeklickt) {
    kontakteVerstecken();
  }
});
