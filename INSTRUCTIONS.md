# Fitness Records Tracker - Instrukcije

## OPIS APLIKACIJE

Aplikacija služi za praćenje sportskih/fitnes rekorda među kolegama (npr. sklekovi u kancelariji).

## Primeri:

- najviše sklekova iz jedne serije
- najviše sklekova ukupno u jednom danu
- sklekovi na jednoj ruci
- druge vežbe (čučnjevi, plank, zgibovi, itd.)

## FUNKCIONALNOSTI – OBAVEZNO

### 1. Učesnici

- Dodavanje, izmena i brisanje učesnika
- Ime, prezime / nadimak
- Opciona profilna slika

### 2. Vežbe

- Dodavanje novih vežbi (npr. sklekovi, plank, čučnjevi)
- Slika ili ilustracija vežbe
- Kratak opis vežbe

### 3. Kategorije / rekordi

- Kreiranje proizvoljnih kategorija po vežbi (npr. „iz jedne serije", „ukupno na dan", „na jednoj ruci", „za 3 minuta")
- Svaka kategorija ima:
  - tip vrednosti (broj ponavljanja, vreme u sekundama, distance itd.)

### 4. Unos rezultata

- Biranje učesnika
- Biranje vežbe i kategorije
- Unos broja serija
- Unos vrednosti
- Datum i vreme pokušaja
- Automatsko prepoznavanje da li je oboren rekord

### 5. Timer i Stopwatch

- Stopwatch (ručno start/stop)
- Timer (npr. 3 minuta → odbrojava do nule)
- Kada timer dođe do nule: zvučni signal, vizuelna animacija (kraj vremena)

### 6. Rang liste i izveštaji

- Top liste po: vežbi, kategoriji
- Pregled rekorda po učesniku
- Vizuelni prikaz (tabele + kartice)

## UX / UI ZAHTEVI

- Moderan, clean dizajn
- Mobile-friendly (responsive)
- Kartice za rekorde
- Ikonice i ilustracije za vežbe
- Dark / Light mode
- Animacije za: novi rekord, kraj timera

## TEHNIČKI ZAHTEVI

### Frontend

- React
- Moderne komponente
- State management (Context)
- Čist i pregledan kod

### Backend

- REST API
- Node.js + Express
- MySQL baza

### Baza (entiteti)

- users (učesnici)
- exercises
- categories
- results
- records
