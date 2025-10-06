# 🕒 Timesheet

**Timesheet** è un applicativo full-stack per la gestione delle attività lavorative (ore, progetti e dipendenti).
L’architettura è basata su **Node.js (Express)** per il backend, **Angular** per il frontend e **MongoDB** come database, il tutto orchestrato con **Docker Compose** per un setup semplice e veloce.

---

## 📁 Struttura del progetto

```
timesheet/
├── api/                  # Backend Node.js + Express
├── web/                  # Frontend Angular
├── mongo/                # Script di inizializzazione del database
│   └── init.js
├── docker-compose.yml    # File di orchestrazione Docker
└── .gitignore
```

---

## ⚙️ Prerequisiti

Assicurati di avere installato:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/)
- (Facoltativo) [MongoDB Compass](https://www.mongodb.com/products/compass) per ispezionare il database

---

## 🚀 Avvio dell’applicativo con Docker

### 1. Avvio completo dell’ambiente

Per avviare **tutti i servizi** (backend, frontend, MongoDB e Mongo Express):

```bash
docker compose up
```

Oppure, per eseguirli in background:

```bash
docker compose up -d
```

---

### 2. Avvio in modalità sviluppo

Volendo puoi eseguire la build in un profilo dedicato allo sviluppo:

```bash
docker compose --profile dev up
```

---

### 3. Arresto dell’ambiente

Per fermare tutti i container:

```bash
docker compose down
```

Per fermarli **rimuovendo anche i volumi e i dati del database**:

```bash
docker compose down -v
```

---

### 4. Pulizia risorse inutilizzate

Per rimuovere container, immagini e volumi non più utilizzati:

```bash
docker system prune -a
```

> ⚠️ Attenzione: questo comando rimuove TUTTE le immagini non in uso.

---

## 🌍 Accesso ai servizi

| Servizio                  | URL / Porta locale                             | Descrizione                       |
| ------------------------- | ---------------------------------------------- | --------------------------------- |
| **Frontend (Angular)**    | [http://localhost:4200](http://localhost:4200) | Interfaccia utente                |
| **Backend (API Node.js)** | [http://localhost:3000](http://localhost:3000) | API REST per la gestione dei dati |
| **MongoDB**               | `mongodb://localhost:27017`                    | Database NoSQL                    |
| **Mongo Express**         | [http://localhost:8081](http://localhost:8081) | Interfaccia web per MongoDB       |

---

## 🧱 Inizializzazione del database

All’avvio del container **MongoDB**, viene eseguito automaticamente lo script `mongo/init.js`
che popola il database `timesheet` con dati iniziali di esempio, pertanto se si vuole aggiornare i dati mockati va fatto nell'apposito file e prima di eseguire il compose.
In alternativa, i dati possono essere modificati una volta eseguito il compose, direttamente dalla GUI di Mongo Compass (se installato) o attraverso CLI Mongosh.

Puoi connetterti a MongoDB utilizzando **MongoDB Compass** o la CLI `mongosh` con la seguente stringa di connessione:

```
mongodb://root:example@localhost:27017/timesheet?authSource=admin
```

Se desideri accedere manualmente al container MongoDB tramite terminale, esegui:

```bash
docker compose exec mongo mongosh
```

Una volta dentro la shell di MongoDB, puoi visualizzare i database disponibili con:

```bash
show dbs
```

e selezionare il database `timesheet` con:

```bash
use timesheet
```

Da qui potrai ispezionare le collezioni con:

```bash
show collections
```

e verificare i dati iniziali importati.

---

## 🧰 Tecnologie utilizzate

- **Frontend:** Angular
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Gestione container:** Docker & Docker Compose
- **GUI database:** Mongo Express

---

## 💻 Avvio manuale senza Docker

Se preferisci avviare il progetto **localmente senza Docker**, segui i passaggi seguenti.

### 1. Clona il repository

```bash
git clone https://github.com/davidemariano/timesheet.git
cd timesheet
```

---

### 2. Avvio del backend (Node.js)

```bash
cd api
npm install
npm run start
```

Il backend sarà disponibile su:

```
http://localhost:3000
```

---

### 3. Avvio del frontend (Angular)

Apri un nuovo terminale nella cartella principale del progetto, poi:

```bash
cd web
npm install
npm run start
```

Il frontend sarà disponibile su:

```
http://localhost:4200
```

---

### 4. Avvio di MongoDB manualmente

Se non usi Docker, puoi eseguire MongoDB localmente tramite una delle seguenti opzioni:

#### a. Da riga di comando (macOS/Linux)

```bash
mongod --dbpath /percorso/alla/cartella/dati
```

#### b. Da servizio installato

Su macOS o Windows, puoi avviare MongoDB tramite il servizio installato o con MongoDB Compass.

---

### 5. Dati iniziali

Per importare manualmente i dati di esempio nel database, puoi eseguire lo script `init.js` presente nella cartella `mongo`:

```bash
mongosh "mongodb://localhost:27017/timesheet" mongo/init.js
```

---

## 🔟 Licenza

Progetto a scopo dimostrativo.
Open source - Free use for any purpose
