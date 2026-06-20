# Graf Zależności w Świecie RPG (Mitologia Nordycka)

**Projekt z przedmiotu:** Bazy Danych 2  
**Główna technologia bazy danych:** Neo4j (Grafowa Baza Danych)  
**Stos aplikacyjny:** FastAPI (Python) + React (TypeScript)  

---

## 1. Opis i Założenia Projektu

Projekt polega na zaprojektowaniu i implementacji systemu zarządzania oraz wizualizacji złożonych zależności w grze fabularnej (RPG). Wykorzystując natywną grafową bazę danych **Neo4j**, system pozwala na odejście od klasycznego podejścia relacyjnego na rzecz elastycznego i wydajnego modelowania powiązań między bytami takimi jak: zadania (questy), system rzemiosła (crafting), krainy i postacie.

Wszelkie nazwy lokacji, postaci oraz przedmiotów zostały osadzone w **Mitologii Nordyckiej** (np. Odyn, Fenrir, Mjolnir), co nadaje projektowi spójny charakter oraz pozwala na logiczne wygenerowanie bazy danych testowych.

Głównym celem aplikacji jest dostarczenie interfejsu (SPA) umożliwiającego interaktywną, graficzną eksplorację relacji w świecie gry za pomocą tzw. *Force-Directed Graph*.

---

## 2. Architektura Danych (Model Grafu)

Graf strukturalnie dzieli się na silnie powiązane ze sobą węzły, reprezentujące obiekty w grze. 

### Węzły (Nodes)

| Etykieta (Label) | Opis | Główne Atrybuty (Properties) |
| --- | --- | --- |
| `(:Item)` | Ekwipunek, bronie, pancerze | `id`, `name`, `rarity`, `level_required` |
| `(:Material)` | Surowce rzemieślnicze | `id`, `name`, `category`, `weight` |
| `(:Monster)` | Przeciwnicy i bossowie | `id`, `name`, `type`, `level` |
| `(:Quest)` | Zadania fabularne | `id`, `title`, `exp_reward` |
| `(:NPC)` | Postacie niezależne (zleceniodawcy)| `id`, `name`, `faction` |
| `(:Zone)` | Regiony świata gry | `id`, `name`, `min_level` |

### Relacje (Relationships)

Zastosowanie bazy grafowej pozwala na naturalne zapytania w oparciu o poniższe kierunkowe relacje:
* `(:Item)-[:REQUIRES {quantity}]->(:Material)` – Wymagania rzemieślnicze do stworzenia przedmiotu.
* `(:Monster)-[:DROPS {chance}]->(:Material)` – System łupów z przeciwników.
* `(:NPC)-[:GIVES]->(:Quest)` – Przypisanie zadania do konkretnego NPC.
* `(:Quest)-[:TAKES_PLACE_IN]->(:Zone)` – Obszar wykonywania misji.
* `(:Quest)-[:PRE_REQUISITE]->(:Quest)` – Łańcuch zależności misji fabularnych.

---

## 3. Stos Technologiczny

Projekt implementuje architekturę trójwarstwową (Database -> REST API -> SPA):

1. **Baza Danych: Neo4j (Docker)**
   * Silnik bazodanowy z natywnym wsparciem dla grafów.
   * Używany język zapytań: **Cypher**.
   * Rozszerzenia: **APOC** (Awesome Procedures on Cypher) do zaawansowanych operacji.

2. **Backend: FastAPI (Python)**
   * Asynchroniczny framework REST API.
   * Połączenie z bazą przez oficjalny `neo4j Python Driver` (Protokół Bolt).
   * Transformacja struktury węzłów do formatu czytelnego dla bibliotek renderujących.

3. **Frontend: React + Vite (TypeScript)**
   * Single Page Application (SPA).
   * Wizualizacja grafu z wykorzystaniem biblioteki `react-force-graph-2d` (symulacja fizyki przyciągania i odpychania węzłów).
   * Komunikacja z API poprzez bibliotekę `Axios`.

---

## 4. Struktura Projektu

```text
RPG-graph-project/
├── docker-compose.yml       # Konfiguracja kontenera bazy danych Neo4j
├── README.md                # Niniejsza dokumentacja
├── backend/                 # Serwer REST API
│   ├── main.py              # Definicja endpointów (FastAPI)
│   ├── database.py          # Konfiguracja sterownika Neo4j
│   └── requirements.txt     # Zależności Pythona
└── frontend/                # Aplikacja kliencka
    ├── src/
    │   ├── App.tsx          # Główny komponent z wizualizacją grafu
    │   └── index.css        # Główne style UI
    ├── package.json         # Zależności Node.js
    └── vite.config.ts       # Konfiguracja bundlera
```

---

## 5. Instrukcja Uruchomienia (Local Development)

### Krok 1: Baza danych Neo4j (Docker)
W głównym katalogu projektu znajduje się plik `docker-compose.yml`. Aby uruchomić bazę danych:
```bash
docker compose up -d
```
*Panel administracyjny bazy będzie dostępny pod adresem: http://localhost:7474*

### Krok 2: Uruchomienie Backendu (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
*Dokumentacja API (Swagger UI) wygenerowana automatycznie jest dostępna pod: http://localhost:8000/docs*

### Krok 3: Uruchomienie Frontendu (React)
```bash
cd frontend
npm install
npm run dev
```
*Aplikacja graficzna będzie dostępna pod adresem: http://localhost:5173*

---

## 6. Kluczowe zapytania Cypher (Przykłady)

W ramach implementacji API zrealizowano m.in. następujące zoptymalizowane zapytania do bazy danych:

**Pobieranie całego grafu mapy startowej (MVP):**
```cypher
MATCH (n)-[r]->(m)
RETURN n, r, m
LIMIT 100
```

*(Dokumentacja będzie rozszerzana o kolejne zaawansowane zapytania wraz z rozwojem funkcjonalności, np. szukanie najkrótszej ścieżki (Shortest Path) dla craftingu czy rozszerzanie pojedynczych węzłów).*