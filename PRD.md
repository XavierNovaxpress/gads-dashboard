# PRD — Google Ads MCC Dashboard

## 1. Résumé

Application web de reporting et facturation pour la gestion de 18 comptes Google Ads via un compte MCC (My Client Center). L'application permet le suivi des dépenses média, le calcul automatique des frais de gestion (5%), la comparaison mois-sur-mois (M-1), et la synchronisation automatique des données via Windsor.ai.

## 2. Problème

La gestion de 18 comptes Google Ads répartis sur 5 groupes clients nécessite un outil centralisé pour :

- Consolider les métriques de performance de tous les comptes
- Calculer automatiquement la facturation (spend + 5% frais)
- Suivre la rentabilité par compte (profit = frais − coûts ops)
- Comparer les performances mois par mois
- Produire des rapports cumulés multi-mois
- Synchroniser les données sans intervention manuelle

Les alternatives existantes (Google Ads interface, feuilles Excel) ne permettent pas cette vision consolidée avec calcul de facturation intégré.

## 3. Utilisateurs cibles

**Utilisateur principal** : gestionnaire de comptes Google Ads / responsable MCC qui gère la facturation et le reporting pour plusieurs clients.

**Cas d'usage** :
- Consultation quotidienne des dépenses et performances
- Préparation de la facturation mensuelle
- Analyse des tendances et alertes
- Reporting client par groupe

## 4. Objectifs produit

| Objectif | Métrique de succès |
|----------|-------------------|
| Centraliser le reporting | 18 comptes visibles en un dashboard |
| Automatiser la facturation | Calcul automatique spend + 5% frais |
| Comparer les performances | Delta M-1 sur tous les KPIs |
| Réduire le travail manuel | Sync Windsor.ai en 1 clic |
| Permettre l'analyse historique | Rapport cumulé multi-mois |

## 5. Fonctionnalités

### 5.1 Dashboard principal (Vue d'ensemble)

**Priorité : P0 — Critique**

- 4 KPI cards : Spend MTD, Frais de gestion, Total à facturer, Projection fin de mois
- Chaque KPI affiche le delta M-1 (pourcentage de variation)
- Graphique dépense cumulée (AreaChart)
- Graphique répartition par groupe (PieChart donut)
- Top 5 comptes avec delta M-1
- Tableau récapitulatif par groupe avec colonnes Δ M-1
- Alertes automatiques (comptes sans dépense, dépenses anormales)
- Graphique barres 7 derniers jours

### 5.2 Vue par groupe

**Priorité : P0 — Critique**

- KPI cards du groupe (spend, frais, facturation, clicks/conversions)
- Graphique dépense journalière du groupe
- Graphique stacked par compte (si plusieurs comptes actifs)
- Tableau détaillé comptes avec colonnes : Spend, Frais 5%, À facturer, Coût Ops (éditable), Profit, Clicks, CPC, CTR, Conversions

### 5.3 Vue par compte

**Priorité : P0 — Critique**

- KPI cards : Spend MTD, À facturer, Coût Ops (éditable), Profit, Tendance 7j
- Métriques performance : Clicks, Impressions, CPC moyen, CTR
- Graphique spend cumulé
- Graphique dépense journalière
- Graphique clicks & conversions (dual axis)
- Tableau journalier complet

### 5.4 Comparaison M-1

**Priorité : P1 — Important**

- Chargement automatique des données du mois précédent
- DeltaBadge composant réutilisable (flèche + pourcentage coloré)
- Colonnes Δ M-1 dans les tableaux
- Badges de tendance sur les KPI cards

### 5.5 Rapport cumulé multi-mois

**Priorité : P1 — Important**

- Sélecteur de période (mois de début → mois de fin)
- KPI cards agrégés sur la période
- Graphique barres empilées par groupe et par mois
- Graphique tendances (spend + clicks, dual axis)
- Graphique répartition cumulée (PieChart)
- Top 10 comptes sur la période
- Tableau détail mensuel

### 5.6 Synchronisation Windsor.ai

**Priorité : P0 — Critique**

- Bouton "Sync Windsor" : rafraîchit le mois courant
- Page "Sync historique" : sélection de mois à importer (12 derniers mois)
- Progression visuelle (barre + statut par mois)
- Upsert en base (évite les doublons)
- Gestion d'erreurs avec retry possible

### 5.7 Import JSON

**Priorité : P2 — Nice-to-have**

- Upload de fichier JSON via l'interface
- Parsing et validation côté serveur
- Upsert en base de données

### 5.8 Interface responsive

**Priorité : P1 — Important**

- Sidebar desktop fixe
- Menu hamburger sur mobile avec overlay
- Tables scrollables horizontalement
- Grilles adaptatives (grid-cols responsive)
- Touch targets minimum 36px

### 5.9 Thème sombre/clair

**Priorité : P2 — Nice-to-have**

- Toggle dans la sidebar
- Variables CSS pour les deux thèmes
- Contraste WCAG AA pour le texte

## 6. Architecture technique

### Frontend
- React 19 + TypeScript
- Vite 6 (bundler)
- Tailwind CSS 3 (styling)
- Recharts 2 (graphiques)
- Lucide React (icônes)
- Variables CSS shadcn/ui-style

### Backend
- Express.js 4 + TypeScript
- PostgreSQL 16 (via pg)
- Auto-migration au démarrage
- Windsor.ai REST API connector

### Déploiement
- Docker multi-stage (node:20-alpine)
- docker-compose (app + PostgreSQL)
- Build frontend intégré dans l'image

### Tests
- Vitest + Testing Library React (59 tests unitaires)
- Playwright (tests E2E)

## 7. Modèle de données

### daily_data
Données journalières par compte. Contrainte unique sur (date, account_name) pour permettre l'upsert.

### ops_costs
Coûts opérationnels par compte et par mois. Éditables depuis l'interface.

## 8. Formules de calcul

```
Frais de gestion = Spend × 5%
Total à facturer = Spend + Frais de gestion
Profit = Frais de gestion − Coût Ops
Projection = (Spend MTD / Jours écoulés) × Jours dans le mois × 1.05
CPC = Spend / Clicks
CTR = Clicks / Impressions
Delta M-1 (%) = ((Valeur actuelle − Valeur M-1) / Valeur M-1) × 100
```

## 9. Contraintes et limites

- API Windsor.ai limitée en requêtes (rate limiting)
- Données disponibles uniquement pour les comptes avec gname configuré (8/18 comptes actifs)
- Pas d'authentification utilisateur (usage mono-utilisateur)
- Pas d'export PDF/Excel natif (v1)
- Pas de notifications push

## 10. Évolutions futures (v2)

- Authentification multi-utilisateurs
- Export PDF/Excel des rapports
- Alertes par email (budget dépassé, anomalies)
- Intégration Google Sheets pour la facturation
- Dashboard comparatif N-1 (année précédente)
- Objectifs de performance par compte/groupe
- API publique pour intégrations tierces

## 11. Métriques de succès

| Métrique | Cible |
|----------|-------|
| Temps de chargement dashboard | < 2s |
| Couverture tests unitaires | > 80% sur lib/ |
| Comptes affichés | 18/18 |
| Sync Windsor fiable | > 95% success rate |
| Responsive | Utilisable sur mobile 375px+ |

## 12. Historique des versions

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | Fév 2026 | Dashboard initial, import JSON, sync Windsor |
| 1.1 | Fév 2026 | UX overhaul, animations, sync historique, rapport cumulé |
| 1.2 | Fév 2026 | Comparaison M-1, responsive design, tests unitaires + E2E |
