#!/bin/bash
echo "Rozpoczynam konfigurację środowiska RPG Graph (Docker)..."

# Sprawdzenie czy zainstalowany jest docker i docker-compose
if ! command -v docker &> /dev/null
then
    echo "Błąd: Docker nie jest zainstalowany. Zainstaluj go, aby kontynuować."
    exit 1
fi

echo "1. Zatrzymywanie starych instancji..."
docker compose down

echo "2. Budowanie i uruchamianie kontenerów..."
docker compose up -d --build

echo "3. Oczekiwanie na pełne uruchomienie bazy Neo4j (ok 15-20 sek)..."
sleep 20

echo "4. Inicjalizacja bazy danych testowymi węzłami..."
docker compose exec backend python seed.py

echo ""
echo "======================================"
echo "Środowisko uruchomione pomyślnie!"
echo "Backend (FastAPI): http://localhost:8000"
echo "Frontend (React): http://localhost:5173"
echo "Baza Neo4j: http://localhost:7474 (neo4j / rpg-password123)"
echo "======================================"
