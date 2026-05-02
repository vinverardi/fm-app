% FutureMessage App

# Entwicklung

Signal-Container starten:

```
$ cd ~/fm-app/bin
$ ./signal
```

App installieren:

```
$ cd ~/fm-app/src
$ npm install
```

App konfigurieren:

```
$ cd ~/fm-app/src
$ cat > .env
APP_BENUTZERNAME=···
APP_PASSWORT=···
^D
```

App starten:

```
$ cd ~/fm-app/src
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
$ cd ~/fm-app/bin
$ ./signal
```

App installieren:

```
# cd
# git clone git@github.com:vinverardi/fm-app.git

# cd ~/fm-app/src
# npm i
```

App konfigurieren:

```
$ cd ~/fm-app/src
$ cat > .env
APP_BENUTZERNAME=···
APP_PASSWORT=···
^D
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
WorkingDirectory=/root/fm-app/src

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
