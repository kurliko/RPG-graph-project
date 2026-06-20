# RPG Graph Universe (Mitologia Nordycka)

**Wizualizacja i zarządzanie złożonymi zależnościami w grze fabularnej za pomocą grafowej bazy danych.**

Projekt zbudowany wokół koncepcji powiązań w świecie gier RPG (takich jak system rzemiosła, zależności między potworami, żywiołami, misjami oraz ekwipunkiem). Całość osadzona jest w mrocznym klimacie Mitologii Nordyckiej.

---

## 🌟 Główne Funkcjonalności

Aplikacja łączy w sobie potężny silnik grafowy ze stylizowanym interfejsem graficznym, oferując narzędzia zarówno dla graczy (eksploracja), jak i twórców gry (Game Master Mode).

1. **Interaktywny Graf (Force-Directed Graph)**
   * Symulacja fizyki 2D pozwalająca na intuicyjne przeciąganie, przybliżanie i eksplorowanie świata gry.
   * Każdy typ węzła (NPC, Potwór, Przedmiot) ma własną unikalną ikonę SVG, co znacząco poprawia czytelność.

2. **Game Master Mode (Tryb Mistrza Gry)**
   * Pełny zestaw operacji **CRUD** na grafie prosto z poziomu interfejsu przeglądarki.
   * Dodawanie nowych elementów, edycja właściwości węzłów (np. opisy, nazwy), usuwanie bytów.
   * Interaktywne tworzenie relacji (Links) między węzłami poprzez wskazanie źródła i celu na grafie.

3. **Pathfinder (Wyszukiwanie Najkrótszej Ścieżki)**
   * Możliwość wybrania punktu początkowego i końcowego, aby odkryć optymalną ścieżkę powiązań między dwoma dowolnymi elementami gry.
   * Oparte na natywnym algorytmie najkrótszej ścieżki w Neo4j (`shortestPath()`).

4. **Dynamiczne Pobieranie Połączeń (Expand Node)**
   * Użytkownik nie jest zalewany setkami węzłów na raz. Przez podwójne kliknięcie węzła pobierani są z bazy danych tylko jego najbliżsi sąsiedzi.

5. **Inteligentny Panel Detali & Logika RPG**
   * Kliknięcie węzła wyświetla szczegółowe statystyki w bocznym panelu.
   * **Rekomendacje Ekwipunku:** Na podstawie słabości (żywiołów) danego potwora system dobiera odpowiednią broń.
   * **Przepisy (Crafting):** Możliwość sprawdzenia jakie materiały są potrzebne do stworzenia przedmiotu i z jakich potworów one wypadają (Drop Chance).

6. **Wyszukiwarka (Search Bar)**
   * Błyskawiczne filtrowanie elementów na mapie za pomocą tekstowych zapytań Cypher.

---

## 🏗️ Architektura Systemu i Stos Technologiczny

Aplikacja składa się z trzech ściśle współpracujących warstw, osadzonych w środowisku Docker.

### 1. Baza Danych: Neo4j (Grafowa)
Zamiast tradycyjnych relacyjnych tabel (SQL), wszystkie obiekty są modelowane jako węzły, a interakcje jako krawędzie (kierunkowe relacje). 
* Rozszerzenia: Zainstalowana wtyczka **APOC**.
* Przykładowe Etykiety (Labels): `Item`, `Material`, `Monster`, `Quest`, `NPC`, `Skill`, `Element`.
* Przykładowe Relacje: `REQUIRES`, `DROPS`, `WEAK_AGAINST`, `USES_ELEMENT`, `IMBUED_WITH`.

### 2. Backend: FastAPI (Python 3)
Wysoce zoptymalizowany serwer API bazujący na asynchroniczności, obsługujący zapytania Cypher przy pomocy oficjalnego sterownika Neo4j.
* Zrefaktoryzowana architektura oparta o moduły (Routers):
  * `routers/graph.py` – Globalne pobieranie grafu, wyszukiwarka i Pathfinder.
  * `routers/nodes.py` – Operacje CRUD dla węzłów (Game Master).
  * `routers/links.py` – Zarządzanie relacjami.
  * `routers/game_logic.py` – Złożone zapytania dedykowane mechanikom RPG (Crafting, słabości, zlecenia).

### 3. Frontend: React + Vite (TypeScript)
Zoptymalizowane pod kątem wydajności Single Page Application.
* `react-force-graph-2d`: Silnik renderowania grafów oparty na Canvas.
* Modułowa struktura komponentów (oddzielne panele, wyszukiwarka, logika API).
* Customowy design wykorzystujący koncepcje ciemnego fantasy i RPG (np. czcionki `Cinzel Decorative`).

---

## 🚀 Instalacja i Uruchomienie

Projekt został w pełni skonteneryzowany. Wystarczy jeden skrypt, aby podnieść całe środowisko wraz z załadowaniem danych startowych (tzw. seed data).

**Wymagania:** `Docker` oraz `Docker Compose`.

### Uruchomienie "One-Click"
W głównym katalogu projektu wywołaj dostarczony skrypt:
```bash
./setup.sh
```
Skrypt automatycznie:
1. Uruchomi i skonfiguruje kontenery (Neo4j, FastAPI Backend, Vite Frontend).
2. Poczeka na start bazy danych Neo4j.
3. Zasili bazę początkowymi informacjami ze świata RPG (plik `seed_data.json`).

### Adresy Aplikacji:
* **Frontend (Aplikacja RPG Graph):** [http://localhost:5173](http://localhost:5173)
* **Backend API (Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Neo4j Browser (Baza Danych):** [http://localhost:7474](http://localhost:7474) (Logowanie wyłączone / no-auth).

---

## 📘 Struktura Katalogów

```text
RPG-graph-project/
├── docker-compose.yml       # Orkiestracja całego stosu (Front, Back, DB)
├── setup.sh                 # Skrypt inicjujący (w tym seeding bazy)
├── README.md                # Niniejsza dokumentacja
│
├── backend/                 # Serwer API (FastAPI)
│   ├── main.py              # Punkt wejściowy, inicjalizacja CORS i Routerów
│   ├── database.py          # Połączenie ze sterownikiem Neo4j
│   ├── seed_data.json       # Baza początkowa do wczytania w skrypcie
│   ├── schemas/             # Modele wejścia/wyjścia Pydantic
│   ├── services/            # Logika biznesowa i serializacja z bazy
│   └── routers/             # Endpointy podzielone domenowo
│
└── frontend/                # Interfejs Użytkownika (React)
    ├── package.json         # Zależności NPM
    ├── vite.config.ts       # Ustawienia bundlera
    └── src/
        ├── App.tsx          # Główny kontener stanu
        ├── index.css        # Arkusz stylów (RPG Theme)
        ├── components/      # Komponenty UI (GraphViewer, SearchBar, Sidebar)
        ├── services/        # Wywołania API (Axios)
        ├── utils/           # Pomocnicze funkcje translacji i kolorów
        └── assets/          # Grafiki SVG do grafu
```

---

## 🔍 Przydatne Zapytania (Cypher)

Baza z powodzeniem przetwarza skomplikowane łańcuchy powiązań. Oto przykład logiki stojącej za "Pathfinderem":

**Wyznaczanie najkrótszej ścieżki (Algorytm Dijkstra w Neo4j):**
```cypher
MATCH (start) WHERE elementId(start) = $source
MATCH (end) WHERE elementId(end) = $target
MATCH p = shortestPath((start)-[*]-(end))
RETURN nodes(p) as path_nodes, relationships(p) as path_rels
```

**Generowanie drzewa craftingu z uwzględnieniem szansy dropu potworów:**
```cypher
MATCH (i:Item)-[req:REQUIRES]->(mat:Material)
WHERE elementId(i) = $item_id
OPTIONAL MATCH (mat)<-[drop:DROPS]-(m:Monster)
RETURN elementId(mat), mat.name, req.quantity, m.name, drop.chance
```