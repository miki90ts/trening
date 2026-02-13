# 🏋️ Fitness Records Tracker

Aplikacija za praćenje sportskih/fitnes rekorda među kolegama.

## 📂 Struktura projekta

```
trening/
├── database/
│   └── schema.sql          # MySQL šema baze + seed podaci
├── backend/
│   ├── .env                # Konfiguracija baze
│   ├── package.json
│   ├── uploads/            # Upload folder za slike
│   └── src/
│       ├── server.js       # Express server
│       ├── db/
│       │   └── connection.js
│       └── routes/
│           ├── users.js
│           ├── exercises.js
│           ├── categories.js
│           ├── results.js
│           └── leaderboard.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── services/
        │   └── api.js
        ├── context/
        │   ├── AppContext.jsx
        │   └── ThemeContext.jsx
        ├── components/
        │   ├── common/
        │   │   ├── Card.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Loading.jsx
        │   │   └── RecordBadge.jsx
        │   └── layout/
        │       └── Navbar.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── UsersPage.jsx
        │   ├── UserDetailPage.jsx
        │   ├── ExercisesPage.jsx
        │   ├── ResultsPage.jsx
        │   ├── LeaderboardPage.jsx
        │   └── TimerPage.jsx
        └── styles/
            └── index.css
```

## 🚀 Kako pokrenuti aplikaciju

### 1. Pripremi bazu podataka

Potrebno je imati MySQL instaliran. Pokrenite SQL skriptu:

```bash
mysql -u root -p < database/schema.sql
```

Ili otvorite `database/schema.sql` u MySQL Workbench-u i izvršite ga.

### 2. Podesi backend

```bash
cd backend

# Instaliraj zavisnosti
npm install

# Podesi .env fajl (izmeni DB_PASSWORD ako je potrebno)
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=tvoja_lozinka
# DB_NAME=fitness_records
# PORT=5000

# Pokreni server
npm run dev
```

Backend će biti na `http://localhost:5000`

### 3. Podesi frontend

```bash
cd frontend

# Instaliraj zavisnosti
npm install

# Pokreni dev server
npm run dev
```

Frontend će biti na `http://localhost:3000`

## 📡 API Rute

### Users (Učesnici)

| Metod  | Ruta                   | Opis                |
| ------ | ---------------------- | ------------------- |
| GET    | /api/users             | Lista svih učesnika |
| GET    | /api/users/:id         | Detalji učesnika    |
| POST   | /api/users             | Kreiraj učesnika    |
| PUT    | /api/users/:id         | Izmeni učesnika     |
| DELETE | /api/users/:id         | Obriši učesnika     |
| GET    | /api/users/:id/records | Rekordi učesnika    |

### Exercises (Vežbe)

| Metod  | Ruta               | Opis                        |
| ------ | ------------------ | --------------------------- |
| GET    | /api/exercises     | Lista vežbi sa kategorijama |
| GET    | /api/exercises/:id | Detalji vežbe               |
| POST   | /api/exercises     | Kreiraj vežbu               |
| PUT    | /api/exercises/:id | Izmeni vežbu                |
| DELETE | /api/exercises/:id | Obriši vežbu                |

### Categories (Kategorije)

| Metod  | Ruta                          | Opis                |
| ------ | ----------------------------- | ------------------- |
| GET    | /api/categories               | Lista kategorija    |
| GET    | /api/categories?exercise_id=1 | Filtrirano po vežbi |
| POST   | /api/categories               | Kreiraj kategoriju  |
| PUT    | /api/categories/:id           | Izmeni kategoriju   |
| DELETE | /api/categories/:id           | Obriši kategoriju   |

### Results (Rezultati)

| Metod  | Ruta             | Opis                                                  |
| ------ | ---------------- | ----------------------------------------------------- |
| GET    | /api/results     | Lista rezultata (filteri: user_id, category_id, date) |
| POST   | /api/results     | Unesi rezultat (automatska provera rekorda)           |
| DELETE | /api/results/:id | Obriši rezultat                                       |

### Leaderboard (Rang lista)

| Metod | Ruta                           | Opis                       |
| ----- | ------------------------------ | -------------------------- |
| GET   | /api/leaderboard?category_id=1 | Rang lista po kategoriji   |
| GET   | /api/leaderboard/exercise/:id  | Rang lista po vežbi        |
| GET   | /api/leaderboard/user/:id      | Profil i rekordi korisnika |
| GET   | /api/leaderboard/summary       | Sumarni pregled            |

## 🗄️ Baza podataka (Entiteti)

- **users** - učesnici (ime, prezime, nadimak, profilna slika)
- **exercises** - vežbe (naziv, opis, ikonica, slika)
- **categories** - kategorije rekorda po vežbi (tip vrednosti, dnevni/ukupni)
- **results** - svi uneti rezultati (vrednost, datum, da li je rekord)

## ✨ Funkcionalnosti

- ✅ CRUD za učesnike sa profilnim slikama
- ✅ CRUD za vežbe sa ikonicama i kategorijama
- ✅ Proizvoljne kategorije rekorda (reps, seconds, meters, kg...)
- ✅ Unos rezultata sa automatskom detekcijom rekorda
- ✅ Stopwatch (ručno start/stop merenje)
- ✅ Timer sa odbrojavanjem i zvučnim signalom
- ✅ Rang liste po vežbi, kategoriji, korisniku
- ✅ Dashboard sa statistikama
- ✅ Dark / Light mode
- ✅ Responsive dizajn (mobile-friendly)
- ✅ Animacije za novi rekord i kraj timera
- ✅ Moderni UI sa karticama

## 🛠️ Tehnologije

- **Frontend:** React 18 + Vite + React Router + React Icons + React Toastify
- **Backend:** Node.js + Express + mysql2
- **Baza:** MySQL 8
- **State Management:** React Context + useReducer
- **Styling:** Custom CSS sa CSS Variables (dark/light)
