const axios = require("axios");
const express = require("express");
const fs = require("fs");
const path = require('path');
const qrcode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

// Gerät verbinden, Schritt 1.

app.get("/verbinden", async (req, res) => {
  const antwort = await axios.post("http://127.0.0.1:8080/api/v1/rpc", {
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

  await axios.post("http://127.0.0.1:8080/api/v1/rpc", {
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

app.listen(7070);
