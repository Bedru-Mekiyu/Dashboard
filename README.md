# Hedera Certification Platform Dashboard

[![CI Build & Type Check](https://github.com/darblockchain/hedera-certification-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/darblockchain/hedera-certification-platform/actions/workflows/ci.yml)

A centralized internal dashboard operating system for the **Hedera Certification Program**. The platform provides analytics, automated developer data ingestion, fraud detection insights, community invoicing, and AI-driven ecosystem reports.

---

## 🚀 Key Features

* **Analytics & Metrics Overview**: Track total certified developers, active certification badges, growth trajectories, and regional/partner distribution.
* **Batch CSV Data Ingestion & Dataset Versioning**: Upload certification records with version control and real-time Firebase sync.
* **Role-Based Access Control (RBAC)**: Support for Global Super Admins and scoped partner roles.
* **Community Invoicing & Financial Operations**: Manage agreements, payment tracking, and automated community invoices.
* **Outreach Campaign Management**: Track developer engagement, outreach channels, and conversion metrics.
* **AI Ecosystem Insights**: Integrated AI analysis using Google Gemini (`@google/genai`) to generate automated context summaries for certification batches.
* **Dark / Light Theme Support**: Custom styled UI with Tailwind CSS and Lucide React icons.

---

## 🛠️ Technology Stack

* **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build Tool**: [Vite 5](https://vitejs.dev/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) + PostCSS + Autoprefixer
* **Icons & Visualization**: [Lucide React](https://lucide.dev/) + [Recharts](https://recharts.org/)
* **Backend & Authentication**: [Firebase App / Auth / Firestore](https://firebase.google.com/)
* **AI Integration**: [@google/genai SDK](https://www.npmjs.com/package/@google/genai)
* **Web Server Configuration**: Nginx (`nginx.conf`)

---

## 📂 Project Structure

```text
├── components/          # Modular UI views (Dashboard, Invoicing, UserTable, etc.)
├── services/            # Firebase, Gemini AI, Email, and Data Processing modules
├── .github/
│   └── workflows/       # GitHub Actions CI workflow (ci.yml)
├── App.tsx              # Application entry, global state, and routing logic
├── constants.ts          # Application constants & default mock datasets
├── firebaseConfig.ts    # Firebase initialization & configuration
├── firestore.rules      # Firestore security rules
├── index.html           # Main HTML entrypoint
├── index.tsx            # React DOM root render
├── metadata.json        # Platform metadata configuration
├── nginx.conf           # Production web server configuration
├── package.json         # Project dependencies and script definitions
├── tsconfig.json        # TypeScript compiler configuration
└── vite.config.ts       # Vite bundler configuration
```

---

## 🛠️ Local Development

### Prerequisites

* Node.js (v18 or higher recommended)
* npm (v9 or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/darblockchain/hedera-certification-platform.git
   cd hedera-certification-platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```

---

## ⚙️ Environment Variables & Configuration

The application requires Firebase authentication and Firestore credentials. To configure local environment settings, set up the following keys (e.g. in a `.env.local` file or directly in your environment configuration):

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

## 🧪 Testing & Quality Assurance

To perform type checking and produce a production build:

```bash
# Run TypeScript compilation check
npm run typecheck

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🤖 CI/CD Integration

Automated Continuous Integration runs on every push and pull request via **GitHub Actions** (`.github/workflows/ci.yml`). The pipeline checks out the repository, installs dependencies, runs TypeScript type verification, and executes a production build using Vite.
