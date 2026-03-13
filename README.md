# Vermogensdashboard

Een privé vermogensdashboard voor de Raspberry Pi. Beheer rekeningen, volg rendement, en plan toekomstig vermogen — alles in een luxe dark-mode interface.

## Vereisten

- Raspberry Pi 4 of 5 (arm64)
- Docker Engine ≥ 24
- Docker Compose ≥ 2.20

Installeer Docker op de Pi:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

## Installatie

1. **Kopieer de bestanden naar je Pi:**
   ```bash
   git clone https://github.com/jouw-gebruikersnaam/vermogensdashboard.git
   cd vermogensdashboard
   ```

2. **Configureer omgevingsvariabelen (optioneel):**
   ```bash
   cp .env.example .env
   ```

3. **Bouw en start de containers:**
   ```bash
   docker compose up -d --build
   ```

4. **Open het dashboard:**
   Ga naar `http://<pi-ip-adres>` in je browser.

   Vind het IP-adres van je Pi:
   ```bash
   hostname -I
   ```

## Stoppen en starten

```bash
docker compose down       # stoppen
docker compose up -d      # starten
docker compose restart    # herstarten
```

## Logs bekijken

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

## Database backup

De database wordt opgeslagen in `./data/vermogen.db`.

**Backup maken:**
```bash
cp ./data/vermogen.db ./data/vermogen_backup_$(date +%Y%m%d).db
```

**Of via rsync vanaf een andere machine:**
```bash
rsync -avz pi@<pi-ip-adres>:/pad/naar/vermogensdashboard/data/vermogen.db ./backup/
```

**Automatische backup via cron (op de Pi):**
```bash
# Voeg toe aan crontab (crontab -e):
0 2 * * * cp /pad/naar/vermogensdashboard/data/vermogen.db /pad/naar/backups/vermogen_$(date +\%Y\%m\%d).db
```

## Poorten

| Service  | Poort |
|----------|-------|
| Frontend | 80    |
| Backend  | 8000  |

## Projectstructuur

```
vermogensdashboard/
├── docker-compose.yml
├── .env.example
├── data/                  ← SQLite database (aangemaakt automatisch)
├── backend/               ← FastAPI + SQLModel
└── frontend/              ← React + Vite + Tailwind
```
