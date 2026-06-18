FROM python:3.10-slim

WORKDIR /app

# Skopiuj wymagania i zainstaluj
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Skopiuj aplikację
COPY . .

# Wystaw port API
EXPOSE 8000

# Uruchom uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
