# 📈 Investments Belfort

Plataforma integral de análisis de inversiones en criptomonedas. Cuenta con un motor de análisis técnico de patrones (candelas, figuras gráficas, soporte/resistencia, confluencias, etc.), un motor de backtesting masivo con VectorBT y DuckDB, y una interfaz web moderna en Next.js.

---

## 📸 Capturas de Pantalla (Interface Web)

Aquí puedes ver la interfaz de usuario de Belfort en acción:

### 📊 Dashboard Principal (Mercados y Rankings)
![Dashboard](docs/images/dashboard.png)

### 📈 Análisis Técnico Detallado (Patrones, Estructura y Confluencias)
![Análisis Técnico](docs/images/technical.png)

### 🧪 Backtesting de Estrategias y Optimización de Grid
![Backtest](docs/images/strategy.png)

### 💬 Análisis de Sentimiento (Noticias, Reddit y RSS)
![Sentimiento](docs/images/sentiment.png)

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu sistema:
* **Python 3.10 o superior** (se recomienda usar `uv` o `venv`)
* **Node.js 18 o superior** y **pnpm** (para el frontend)
* **TA-Lib** (librería de C requerida por el motor de backend)

### Instalación de TA-Lib en Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install build-essential libta-lib-dev || (
  wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz &&
  tar -xzf ta-lib-0.4.0-src.tar.gz && cd ta-lib &&
  ./configure --prefix=/usr && make && sudo make install
)
```

---

## 🚀 Inicio Rápido (Quick Start)

Sigue estos pasos para poner en marcha la aplicación localmente:

### 1. Configurar e Instalar el Backend

```bash
cd backend

# Copiar archivo de entorno de ejemplo y ajustarlo si es necesario
cp .env.example .env

# Instalar dependencias del backend (incluyendo TA-Lib y dependencias de test)
uv pip install -e ".[talib,test]"
# O bien si usas pip convencional:
pip install -e ".[talib,test]"

# Verificar que la instalación del backend sea correcta
belfort doctor
```

### 2. Descargar Datos e Iniciar el Servidor API

Antes de utilizar el cliente web, debes descargar datos históricos y encender la API de FastAPI:

```bash
# Descargar datos históricos de velas (OHLCV) de Binance para BTC y ETH (ej. 2 años con velas de 4h)
belfort data fetch BTCUSDT --tf 4h --since 2y
belfort data fetch ETHUSDT --tf 4h --since 2y

# (Opcional) Ejecutar el pipeline de análisis de patrones y el backtesting inicial
belfort analyze BTCUSDT --tf 4h
belfort backtest all BTCUSDT --tf 4h --workers 4

# Iniciar el servidor API de FastAPI en el puerto 8000
source activate.sh
belfort serve --port 8000
```

### 3. Configurar e Iniciar el Frontend (UI)

En una **nueva terminal**, navega a la carpeta del frontend y levanta la aplicación:

```bash
cd frontend

# Configurar variables de entorno locales
cp .env.local.example .env.local

# Instalar las dependencias e iniciar el servidor de desarrollo en Next.js
pnpm install
pnpm dev
```

Una vez iniciado, abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 💻 Uso de la CLI (Línea de Comandos)

El comando `belfort` ofrece múltiples herramientas útiles desde la terminal:

* **Diagnóstico de dependencias:** `belfort doctor`
* **Descarga de velas:** `belfort data fetch <Symbol> --tf <Timeframe> --since <Period>`
* **Análisis de patrones:** `belfort analyze BTCUSDT --tf 4h`
* **Listado de patrones:** `belfort patterns list`
* **Ejecutar un Backtest simple:**
  ```bash
  belfort backtest run BTCUSDT --tf 4h --pattern cdl_engulfing --sl-atr 1.5 --tp-rr 2
  ```
* **Optimización en lote (Grid Backtest de todos los patrones y parámetros):**
  ```bash
  belfort backtest all BTCUSDT --tf 4h --workers 4
  ```
* **Reporte de los mejores resultados:**
  ```bash
  belfort backtest report BTCUSDT --tf 4h --top 20 --sort sharpe
  ```

---

## 📂 Estructura del Proyecto

El monorepo está organizado de la siguiente manera:

* [`backend/`](backend/) — Motor principal Belfort escrito en Python (FastAPI, CLI, TA-Lib, VectorBT, DuckDB).
* [`frontend/`](frontend/) — Aplicación de usuario moderna escrita en Next.js (React 19, TypeScript, Tailwind, Lightweight Charts).
* [`contracts/`](contracts/) — Definición de OpenAPI compartida entre el backend y frontend.

---

## 🛡️ Licencia

Experimento personal sin licencia comercial explícita. Todos los derechos reservados.
