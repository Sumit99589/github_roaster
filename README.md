# 🐙 GitHub Profile Roaster (Savage Edition)

A high-performance, responsive full-stack application that analyzes any GitHub profile and delivers brutally honest, AI-powered developer roasts. Equipped with a global leaderboard, database persistence, low-latency caching, and an advanced resilient generation pipeline to withstand heavy user loads.

---

## 🚀 Key Features

*   **Savage AI Diagnostics**: Deep-dives into a user's repositories, commits, languages, followers, and profile metrics to generate highly personalized, stinging developer feedback.
*   **Aesthetic Terminal UI**: Built with a custom retro-cyberpunk dark interface, fluid layout animations (using `motion`), responsive micro-interactions, and visual status charts.
*   **Dual-Layer Resilient Roast Engine**:
    1.  **Smart AI Retry & Fallback**: Handles high traffic or Google API rate limits (`503/429 UNAVAILABLE`) using randomized exponential backoff.
    2.  **Graceful Model Downgrade**: If `gemini-3.5-flash` is overloaded, the system seamlessly downgrades to high-capacity `gemini-3.1-flash-lite`.
    3.  **Procedural Backup**: In case of complete network/API blackouts, a deterministic procedural generator takes over to ensure zero user downtime.
*   **Ultra-Fast Performance**:
    *   **PostgreSQL**: Secure, dynamic persistence for saving roasted user histories and rendering global score tables.
    *   **Redis Caching**: Prevents duplicate API overhead and serves cached roast files in milliseconds.
    *   **Graceful Degradation**: Fully operational in "In-Memory Fallback" mode if databases are disconnected.
*   **Smarter Leaderboard**: Tracks global developers and displays rankings sorted by real, calculated developer performance score averages.

---

## 🛠️ Stack & Technologies

*   **Frontend**: React (v19) + Vite (v6) + Tailwind CSS (v4) + Motion
*   **Backend Server**: Express.js (v4) + tsx
*   **AI Engine**: Google GenAI SDK (`@google/genai`)
*   **Storage & Caching**: PostgreSQL (`pg` pool) + Redis client

---

## 🗺️ How to Deploy Into the Real World

Deploying to production requires:
1.  **Pushing your code to GitHub.**
2.  **Provisioning your Cloud Databases** (Postgres and Redis).
3.  **Deploying the server** to a Node.js hosting platform (like Render, Railway, or Fly.io).

Follow this comprehensive, step-by-step guide:

### Step 1: Push Your Code to GitHub

First, you need to store your code in a personal GitHub repository.

1.  **Initialize Git locally** (if not already done):
    ```bash
    git init
    ```
2.  **Create/verify your `.gitignore`**:
    Ensure `node_modules`, `.env`, and `dist` are ignored so your secrets and heavy dependencies are not uploaded.
3.  **Stage and commit your files**:
    ```bash
    git add .
    git commit -m "feat: initial release of github roaster with robust fallback engine"
    ```
4.  **Create a new public/private repository on GitHub**:
    *   Go to [GitHub](https://github.com) and click **New Repository**.
    *   Name it something like `github-profile-roaster` and click **Create repository** (do not add a README, `.gitignore`, or license).
5.  **Link your local repository to GitHub and push**:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/github-profile-roaster.git
    git branch -M main
    git push -u origin main
    ```

---

### Step 2: Provision Production Services

Deploying requires cloud-hosted databases and an API key.

#### 1. Gemini API Key
*   Go to [Google AI Studio](https://aistudio.google.com/).
*   Generate a new free-tier key and save it.

#### 2. PostgreSQL Database (Free / Low Cost)
*   Go to [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/).
*   Create a new project.
*   Copy your **Postgres Connection URI** string. It will look similar to this:
    `postgresql://neondb_owner:pAsSwOrD@ep-cool-breeze-1234.us-east-2.aws.neon.tech/neondb?sslmode=require`

#### 3. Redis Cache (Optional / Highly Recommended)
*   Go to [Upstash](https://upstash.com/) (provides a generous free-tier serverless Redis).
*   Create a Redis database.
*   Copy your **Redis Connection URL** (`redis://default:password@your-endpoint.upstash.io:6379`).

---

### Step 3: Deploy the Server (e.g., Render, Railway, Fly.io)

For full-stack custom servers, **Render** or **Railway** are excellent, fast platforms.

#### Option A: Deploy on Render (Recommended)
1.  Sign in to [Render](https://render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub account and select your `github-profile-roaster` repository.
4.  Configure the Service Settings:
    *   **Name**: `github-roaster`
    *   **Region**: Select the closest region.
    *   **Branch**: `main`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
5.  Go to **Advanced** -> **Environment Variables** and add:
    *   `PORT` = `3000` (The internal routing will match. Render handles mapping to the web).
    *   `NODE_ENV` = `production`
    *   `GEMINI_API_KEY` = `[Your Google Gemini API Key]`
    *   `DATABASE_URL` = `[Your Neon/Supabase Connection URI]`
    *   `REDIS_URL` = `[Your Upstash Redis connection string optional]` (If you don't provide this, the server will gracefully run without cache logs).
6.  Click **Deploy Web Service**.

#### Option B: Deploy on Railway
1.  Sign in to [Railway](https://railway.app/).
2.  Click **New Project** -> **Deploy from GitHub repo**.
3.  Select your repository.
4.  Configure your environment variables under the **Variables** tab (`GEMINI_API_KEY`, `DATABASE_URL`, `REDIS_URL`).
5.  Railway automatically reads the `start` script from `package.json` and spins up your bundled server!

---

## ⚡ Local Development

Want to test modifications or run the system locally on your machine?

### 1. Prerequisite Installations
*   Ensure **Node.js** (v18+) is installed on your computer.

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Local Environments
Create a file named `.env` in the root folder, and fill in your keys:
```env
GEMINI_API_KEY="AI_STUDIO_API_KEY_HERE"
DATABASE_URL="postgresql://postgres:password@localhost:5432/github_roaster"
REDIS_URL="redis://localhost:6379"
```

### 4. Run the Dev Server
```bash
npm run dev
```
The server bootloader will run on port `3000`. Open your browser to `http://localhost:3000` to interact with your local development setup.

---

## 🐳 Running with Docker Compose

Running the entire stack with local databases is a breeze.

1.  Make sure you have **Docker** and **Docker Compose** installed.
2.  Create your `.env` file containing your `GEMINI_API_KEY`.
3.  Boot the services:
    ```bash
    docker-compose up --build
    ```
    This single command spins up a local PostgreSQL container, a Redis container, compiles your application, and mounts everything on `http://localhost:3000`.

---

## 📝 Licence
This project is open-source. Roast at your own risk! 🔥
