% FutureMessage App

# Entwicklung

Signal-Container starten:

```
$ bin/signal
```

App installieren:

```
$ npm install
```

App starten:

```
$ npm run dev
```

# Live-Betrieb

Pakete installieren:

```
# curl -fsSL https://deb.nodesource.com/setup_25.x | bash -
# apt-get install -y caddy docker.io npm
```

Signal-Container starten:

```
$ bin/signal
```

App installieren:

```
# cd
# git clone git@github.com:vinverardi/fm-app.git
# cd fm-app
# npm i
```

App als Hintergrunddienst hinzufügen:

```
# cat > /etc/systemd/system/fm-app.service
[Install]
WantedBy=multi-user.target

[Service]
Environment=NODE_ENV=production
ExecStart=/usr/bin/node app.js
Restart=on-failure
RestartSec=5
Type=simple
User=root
WorkingDirectory=/root/fm-app

[Unit]
After=network.target
Description=FutureMessage App
^D

# systemctl daemon-reload
# systemctl enable fm-app
```

App als Hintergrunddienst starten:

```
# systemctl start fm-app
```
