const axios = require("axios");
const express = require("express");
const fs = require("fs");
const path = require('path');
const qrcode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const basicAuth = require("basic-auth");

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

require("dotenv").config();

const APP_BENUTZERNAME = process.env.APP_BENUTZERNAME;
const APP_PASSWORT = process.env.APP_PASSWORT;

async function loescheNachricht(nachricht) {
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

function anmeldung(req, res, next) {
  const benutzer = basicAuth(req);

  if (!benutzer || benutzer.name !== APP_BENUTZERNAME || benutzer.pass !== APP_PASSWORT) {
    res.set("WWW-Authenticate", 'Basic realm="Privater Bereich"');

    return res.status(401).send("Anmeldung erforderlich");
  }

  next();
}

app.use(anmeldung)

// Startseite anzeigen.

app.get("/", async (req, res) => {
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
  const link_bild = await qrcode.toDataURL(link_text);

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

app.get("/verbinden/fertig", async (req, res) => {
  res.sendFile(path.join(__dirname, "verbinden_fertig.html"));
});

// Nachricht erfassen, Schritt 1.

app.get("/erfassen", (req, res) => {
  res.sendFile(path.join(__dirname, "erfassen.html"));
});

// Nachricht erfassen, Schritt 2.

app.post("/erfassen", async (req, res) => {
  const { empfaenger, text, zeitpunkt } = req.body;

  if (!empfaenger || !text || !zeitpunkt) {
    return res.status(400).send("Bitte alle Felder ausfüllen!");
  }

  const nachricht = {
    empfaenger,
    text,
    zeitpunkt
  };

  await fetch("http://localhost:7071/nachrichten", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(nachricht)
  });

  res.redirect("/erfassen/fertig");
});

// Nachricht erfassen, Schritt 3.

app.get("/erfassen/fertig", (req, res) => {
  res.sendFile(path.join(__dirname, "erfassen_fertig.html"));
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

  res.sendFile(path.join(__dirname, "test_fertig.html"));
});

// Nachrichten senden.

setInterval(sendeNachrichten, 10 * 1000);

app.listen(7070, "localhost");
