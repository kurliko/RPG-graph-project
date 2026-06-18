FROM node:20-alpine

WORKDIR /app

# Kopiuj package.json i zainstaluj zależności
COPY package*.json ./
RUN npm install

# Kopiuj resztę plików
COPY . .

# Wystaw port używany przez Vite
EXPOSE 5173

# Uruchom Vite tak, by nasłuchiwał na wszystkich interfejsach
CMD ["npm", "run", "dev", "--", "--host"]
