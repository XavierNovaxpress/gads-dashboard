# Google Ads MCC Dashboard

Dashboard de reporting et facturation pour la gestion multi-comptes Google Ads (MCC), avec synchronisation automatique via Windsor.ai.

## Fonctionnalités

- **Vue d'ensemble** : KPIs mensuels (spend, frais 5%, facturation, projection), graphiques cumulés, répartition par groupe, comparaison M-1
- **Vue par groupe** : détail des comptes d'un groupe, graphiques journaliers, tableau de facturation avec coûts opérationnels éditables
- **Vue par compte** : métriques détaillées (spend, clicks, impressions, CPC, CTR, conversions), graphiques journaliers, tendance 7j
- **Rapport cumulé** : analyse multi-mois avec sélecteur de période, évolution mensuelle, top 10 comptes
- **Sync historique** : import batch de 12 mois depuis Windsor.ai avec suivi de progression
- **Sync Windsor** : rafraîchissement du mois courant en un clic
- **Import JSON** : upload manuel de données
- **Mode sombre/clair** avec toggle
- **Responsive design** : sidebar mobile avec overlay, tables scrollables

## Architecture

```
gads-dashboard/
├── src/                    # Frontend React + TypeScript
│   ├── components/         # Composants UI
│   │   ├── Dashboard.tsx   # Vue d'ensemble avec M-1
│   │   ├── GroupView.tsx   # Vue par groupe
│   │   ├── AccountDetail.tsx # Vue par compte
│   │   ├── CumulativeReport.tsx # Rapport multi-mois
│   │   ├── HistorySync.tsx # Import historique
│   │   ├── KpiCard.tsx     # Carte KPI réutilisable
│   │   └── Sidebar.tsx     # Navigation latérale
│   ├── lib/
│   │   ├── data.ts         # Agrégation et formatage
│   │   ├── api.ts          # Client API REST
│   │   └── accounts.ts     # Configuration des 18 comptes
│   ├── __tests__/          # Tests unitaires (Vitest)
│   └── App.tsx             # Composant racine
├── server/                 # Backend Express.js
│   ├── index.ts            # Serveur + auto-migration
│   ├── db.ts               # Pool PostgreSQL
│   ├── routes/
│   │   ├── data.ts         # GET/POST /api/data
│   │   ├── ops.ts          # GET/PUT /api/ops
│   │   ├── upload.ts       # POST /api/upload
│   │   └── refresh.ts      # POST /api/refresh (Windsor.ai)
│   └── migrate.ts          # Création tables
├── e2e/                    # Tests E2E (Playwright)
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # App + PostgreSQL
└── vitest.config.ts        # Config tests unitaires
```

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 3 |
| Graphiques | Recharts 2 (AreaChart, BarChart, PieChart, LineChart) |
| Icônes | Lucide React |
| Backend | Express.js 4, Node.js 20, TypeScript |
| Base de données | PostgreSQL 16 |
| API externe | Windsor.ai (Google Ads connector) |
| Conteneurisation | Docker, docker-compose |
| Tests | Vitest + Testing Library (unitaires), Playwright (E2E) |

## Prérequis

- Node.js 20+
- PostgreSQL 16+ (ou Docker)
- Clé API Windsor.ai

## Installation

```bash
# Cloner le repo
git clone https://github.com/XavierNovaxpress/gads-dashboard.git
cd gads-dashboard

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos credentials
```

### Variables d'environnement

```env
DATABASE_URL=postgres://gads:gads@localhost:5432/gads
PORT=3001
WINDSOR_API_KEY=votre_cle_api_windsor
```

## Développement

```bash
# Lancer le serveur + client en parallèle
npm run dev

# Client seul (port 5173)
npm run dev:client

# Serveur seul (port 3001)
npm run dev:server
```

## Tests

```bash
# Tests unitaires
npm test

# Tests unitaires en mode watch
npm run test:watch

# Tests avec couverture
npm run test:coverage

# Tests E2E (nécessite l'app en cours d'exécution)
npm run test:e2e
```

## Production avec Docker

```bash
# Lancer l'application complète
docker-compose up -d

# L'application sera accessible sur http://localhost:3001
```

## Schéma de données

### Table `daily_data`

| Colonne | Type | Description |
|---------|------|-------------|
| date | DATE | Jour de la donnée |
| account_name | VARCHAR(255) | Nom du compte Google Ads (gname) |
| spend | NUMERIC(12,4) | Dépense média |
| clicks | INTEGER | Nombre de clics |
| impressions | INTEGER | Nombre d'impressions |
| conversions | NUMERIC(10,2) | Nombre de conversions |
| average_cpc | NUMERIC(10,4) | Coût par clic moyen |
| ctr | NUMERIC(10,6) | Taux de clic |

### Table `ops_costs`

| Colonne | Type | Description |
|---------|------|-------------|
| account_label | VARCHAR(255) | Label du compte |
| month | VARCHAR(7) | Mois (YYYY-MM) |
| cost | NUMERIC(12,2) | Coût opérationnel |

## Comptes gérés

18 comptes Google Ads organisés en 5 groupes :

- **Ondoxa** : Ondoxa
- **Liremia** : Liremia, PDF Time
- **Groupe Umami / Seablue** : Umami (PDFZEN), Headsy, QUICK PDF, Seablue (IQBOOST), Seablue (IQMIND)
- **Groupe Wizorg** : Wizorg (Reco24), WHOCALL, FACTEUR24, Passfly, Recoline
- **Autres** : Willow Luxe (REHYPE), Cellopop (Talkto), Clickbuster (Psona), Clickbuster (Psona New), NordDigital (DataOpp)

## Modèle de facturation

- **Spend média** : dépense Google Ads brute
- **Frais de gestion** : 5% du spend média
- **Total à facturer** : spend + frais
- **Coût Ops** : coût opérationnel par compte (éditable)
- **Profit** : frais de gestion - coût ops

## API REST

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/data?month=YYYY-MM` | Données journalières d'un mois |
| GET | `/api/data/months` | Liste des mois disponibles |
| GET | `/api/data/range?from=&to=` | Données agrégées multi-mois |
| POST | `/api/data` | Insérer des données |
| GET | `/api/ops?month=YYYY-MM` | Coûts opérationnels |
| PUT | `/api/ops` | Mettre à jour un coût ops |
| POST | `/api/upload` | Upload fichier JSON |
| POST | `/api/refresh?month=YYYY-MM` | Sync depuis Windsor.ai |
| GET | `/api/health` | Health check |

## Licence

Privé — Usage interne uniquement.
