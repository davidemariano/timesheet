# 🕒 Timesheet

Applicativo full-stack per la gestione delle attività lavorative (ore, progetti e dipendenti).  
L’architettura è basata su **Node.js (Express)** per il backend, **Angular** per il frontend e **MongoDB** come database, il tutto orchestrato con **Docker Compose** per un setup semplice e veloce.

---

## 📖 Presupposti sulla base del documento fornito

L'applicativo si limita alla visualizzazione dei dati forniti che sono stati opportunamente caricati in un DB NoSQL (Mongo in questo caso) per velocità di sviluppo di una POC e per permettere l'ampliamento e la versatilità delle richieste da parte vostra.

---

## 📁 Struttura del progetto

timesheet/
├── api/ # Backend Node.js + Express
├── web/ # Frontend Angular
├── mongo/ # Script di inizializzazione del database
│ └── init.js
├── docker-compose.yml # File di orchestrazione Docker
└── .gitignore

---

## ⚙️ Prerequisiti

Assicurati di avere installato:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/)
- (Facoltativo) [MongoDB Compass](https://www.mongodb.com/products/compass) per ispezionare il database

---

## 🚀 Avvio dell’applicativo con Docker

### 1. Avvio completo dell’ambiente

Per avviare **tutti i servizi** (backend, frontend, MongoDB e Mongo Express) in modalità dev:

```bash
docker compose --profile dev up
```

Oppure, per eseguirli in background:

```bash
docker compose up -d
```

### 2. Arresto dell'ambiente

Per fermare tutti i container:

```bash
docker compose down
```

Per fermarli **rimuovendo anche i volumi e i dati del database**:

```bash
docker compose down -v
```

## 🌍 Accesso ai servizi

| Servizio                  | URL / Porta locale                             | Descrizione                       |
| ------------------------- | ---------------------------------------------- | --------------------------------- |
| **Frontend (Angular)**    | [http://localhost:4200](http://localhost:4200) | Interfaccia utente                |
| **Backend (API Node.js)** | [http://localhost:3000](http://localhost:3000) | API REST per la gestione dei dati |
| **MongoDB**               | `mongodb://localhost:27017`                    | Database NoSQL                    |
| **Mongo Express**         | [http://localhost:8081](http://localhost:8081) | Interfaccia web per MongoDB       |

## 🧱 Inizializzazione del database

All’avvio del container **MongoDB**, viene eseguito automaticamente lo script `mongo/init.js`  
che popola il database `timesheet` con dati iniziali di esempio.

Puoi connetterti a MongoDB utilizzando **MongoDB Compass** o la CLI `mongosh` con la seguente stringa di connessione:

mongodb://root:example@localhost:27017/timesheet?authSource=admin
