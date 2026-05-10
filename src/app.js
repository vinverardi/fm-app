const axios = require("axios");
const express = require("express");
const fs = require("fs");
const path = require('path');
const qrcode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const basicAuth = require("basic-auth");

require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/public", express.static(path.join(__dirname, "public")));

async function loescheNachricht(nachricht) {
  console.log("lösche " + nachricht); // XXX
  await axios.delete("http://localhost:7071/nachrichten/" + nachricht.id);
}

async function sendeNachricht(absender, nachricht) {
  const antwort = await axios.post("http://localhost:8080/api/v1/rpc", {
    id: uuidv4(),
    jsonrpc: "2.0",
    method: "send",
    params: {
      account: absender,
      message: nachricht.text,
      recipients: [nachricht.empfaenger]
    }
  });

  console.log(antwort.data);
}

async function sendeNachrichten() {
  try {
    const absender = await waehleAbsender();

    if (absender) {
      const nachrichten = await axios.get("http://localhost:7071/nachrichten/pendent");

      for (const nachricht of nachrichten.data) {
          await sendeNachricht(absender, nachricht);
          await loescheNachricht(nachricht);
      }
    }
  } catch (err) {
    console.error("Fehler aufgetreten:", err.message);
  }
}

async function waehleAbsender() {
  const antwort = await axios.post("http://localhost:8080/api/v1/rpc", {
    id: uuidv4(),
    jsonrpc: "2.0",
    method: "listAccounts"
  });

  console.log(antwort.data);

  if (antwort.data.result) {
    absender = antwort.data.result.at(-1);

    return absender.number;
  }
}

// Benutzer anmelden.

app.use((req, res, next) => {
  const benutzer = basicAuth(req);

  if (!benutzer || benutzer.name !== process.env.APP_BENUTZERNAME || benutzer.pass !== process.env.APP_PASSWORT) {
    res.set("WWW-Authenticate", 'Basic realm="Privater Bereich"');

    return res.status(401).send("Anmeldung erforderlich");
  }

  next();
});


// Startseite anzeigen.

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "start.html"));
});

// Gerät verbinden, Schritt 1.

app.get("/verbinden", async (req, res) => {
  const antwort = await axios.post("http://localhost:8080/api/v1/rpc", {
    id: uuidv4(),
    jsonrpc: "2.0",
    method: "startLink"
  });

  const link_text = antwort.data.result.deviceLinkUri;
  const link_bild = await qrcode.toDataURL(link_text, {
    margin: 0
  });

  fs.readFile(path.join(__dirname, "verbinden.html"), "utf8", (err, data) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      data = data.replace("{link_bild}", link_bild);
      data = data.replace("{link_text}", link_text);

      res.send(data);
    }
  });
});

// Gerät verbinden, Schritt 2.

app.post("/verbinden/warten", async (req, res) => {
  const { link } = req.body;

  await axios.post("http://localhost:8080/api/v1/rpc", {
    id: uuidv4(),
    jsonrpc: "2.0",
    method: "finishLink",
    params: {
      deviceLinkUri: link,
      deviceName: "FutureMessage"
    }
  });

  res.json({ status: "OK" });
});

// Gerät verbinden, Schritt 3.

app.get("/verbinden-fertig", (req, res) => {
  res.sendFile(path.join(__dirname, "verbinden-fertig.html"));
});

// Kontakte abfragen.

app.get("/kontakte", async (req, res) => {
  const absender = await waehleAbsender();

  const antwort = await axios.post("http://localhost:8080/api/v1/rpc", {
    id: uuidv4(),
    jsonrpc: "2.0",
    method: "listContacts",
    params: {
      account: absender,
    }
  });

  const kontakte = [];

  for (const contact of antwort.data.result) {
    if (contact.name && contact.number) {
      kontakte.push({
        "name": contact.name,
        "nummer": contact.number
      });
    }
  }

  res.json(kontakte);
});

// Nachricht erfassen, Schritt 1.

app.get("/erfassen", (req, res) => {
  res.sendFile(path.join(__dirname, "erfassen.html"));
});

// Nachricht erfassen, Schritt 2.

app.post("/erfassen", async (req, res) => {
  const { empfaenger, text, datum, zeit } = req.body;

  if (!empfaenger || !text || !datum || !zeit) {
    return res.status(400).send("Bitte alle Felder ausfüllen!");
  }

  const nachricht = {
    empfaenger,
    text,
    zeitpunkt: `${datum}T${zeit}`
  };

  await fetch("http://localhost:7071/nachrichten", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(nachricht)
  });

  res.redirect("/erfassen-fertig");
});

// Nachricht erfassen, Schritt 3.

app.get("/erfassen-fertig", (req, res) => {
  res.sendFile(path.join(__dirname, "erfassen-fertig.html"));
});

// Nachrichten ansehen.

app.get("/ansehen", async (req, res) => {
  const nachrichten = await axios.get("http://localhost:7071/nachrichten");

  var tabelle = "";

  for (const nachricht of nachrichten.data) {
    const loeschen = '<a class="loeschen" href="loeschen/' + nachricht.id + '">Löschen</a>'

    tabelle += '<div class="tabellenzeile">';

    tabelle += '<div class="tabellenspalte">' + nachricht.empfaenger + "</div>";
    tabelle += '<div class="tabellenspalte">' + nachricht.zeitpunkt + "</div>";
    tabelle += '<div class="tabellenspalte">' + nachricht.text + "</div>";
    tabelle += '<div class="tabellenspalte">' + loeschen + "</div>";

    tabelle += "</div>";
  }

  fs.readFile(path.join(__dirname, "ansehen.html"), "utf8", (err, data) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      data = data.replace("{tabelle}", tabelle);

      res.send(data);
    }
  });
});

// Nachricht löschen, Schritt 1.

app.get("/loeschen/:id", async (req, res) => {
  const nachricht = req.params.id;

  await loescheNachricht({id: nachricht});

  res.redirect("/loeschen-fertig");
});

// Nachricht löschen, Schritt 2.

app.get("/loeschen-fertig", (req, res) => {
  res.sendFile(path.join(__dirname, "loeschen-fertig.html"));
});

// Testseite anzeigen, Schritt 1.

app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "test.html"));
});

// Testseite anzeigen, Schritt 2.

app.post("/test", async (req, res) => {
  const antwort = await axios.post("http://localhost:8080/api/v1/rpc", {
    id: uuidv4(),
    jsonrpc: "2.0",
    method: "send",
    params: {
      account: req.body.absender,
      message: req.body.text,
      recipients: [req.body.empfaenger]
    }
  });

  console.log(antwort.data);

  res.sendFile(path.join(__dirname, "test-fertig.html"));
});

// Nachrichten senden.

setInterval(sendeNachrichten, 10 * 1000);

app.listen(7070, "localhost");
