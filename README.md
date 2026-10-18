# VisionGuard AI

**Intelligent Visual Safety & Incident Detection Platform**

A professional computer-vision safety monitoring platform built for the CraftAI Physical AI Hackathon (Track A — PipeGen).

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-COCO--SSD-ff6f00)

---

## 🎯 Overview

VisionGuard AI combines real-time computer vision with a professional incident management workflow to improve safety monitoring in warehouses, laboratories, workshops, and industrial facilities.

### Core Capabilities

- **Real Computer Vision**: TensorFlow.js + COCO-SSD for genuine person/object detection
- **Live Camera Access**: Browser webcam with explicit permission, device selection, and stream management
- **Restricted Zone Monitoring**: Interactive polygon zone editor with point-in-polygon intrusion detection
- **Incident Management**: Full lifecycle (Open → Investigating → Resolved → Closed) with evidence, notes, and activity timeline
- **Manual + AI Incidents**: Create incidents manually or automatically from verified AI detections
- **Multi-Role Access**: Admin, Operator, and Viewer roles with role-based navigation
- **Analytics Dashboard**: Real data-driven charts (severity, status, trends, origins)
- **Audit Logging**: Append-only action history for accountability
- **Notifications**: In-app alerts for incidents and system events
- **Zero-Demo Compliance**: Starts empty, no fabricated data — every record comes from real user actions or inference

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebGL support (for TensorFlow.js)
- HTTPS or localhost (required for camera access)

### Installation

```bash
# Clone the repository
git clone https://github.com/muzamillp20-ai/vision-guard-ai.git
cd vision-guard-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

### First-Time Setup

1. **Create Admin Account**: On first launch, you'll be prompted to create an administrator account.
2. **Configure Sources**: Go to "Sources & Zones" and add a monitoring source (webcam or video file).
3. **Define Zones**: Draw restricted zones over the video frame using the interactive polygon editor.
4. **Start Monitoring**: Go to "Live Monitoring", select a source, and click "Start Webcam" or "Upload Video".
5. **Create Incidents**: Use the "+ Create Incident" button on the Incidents page to manually report safety events.

---

## 📁 Project Structure

```
vision-guard-ai/
├── src/
│   ├── App.tsx                    # Main app with auth routing
│   ├── components/
│   │   ├── IncidentForm.tsx       # Incident creation modal
│   │   └── TopBar.tsx             # Top navigation bar
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication state management
│   ├── db/
│   │   └── index.ts               # IndexedDB schema (Dexie.js)
│   ├── pages/
│   │   ├── OverviewPage.tsx       # Dashboard with charts
│   │   ├── MonitoringPage.tsx     # Live camera + detection
│   │   ├── IncidentsPage.tsx      # Incident management
│   │   ├── AnalyticsPage.tsx      # Data analytics
│   │   ├── SourcesPage.tsx        # Sources & zone editor
│   │   ├── HealthPage.tsx         # System health
│   │   ├── SettingsPage.tsx       # App configuration
│   │   ├── AuditLogPage.tsx       # Audit trail
│   │   ├── NotificationsPage.tsx  # Notification center
│   │   ├── UserManagementPage.tsx # Admin user management
│   │   └── LoginPage.tsx          # Authentication
│   ├── services/
│   │   ├── auth.ts                # PBKDF2 password hashing
│   │   ├── detection.ts           # TensorFlow.js inference
│   │   ├── video.ts               # Video processing pipeline
│   │   ├── zones.ts               # Zone evaluation logic
│   │   ├── incidents.ts           # Incident management
│   │   ├── audit.ts               # Audit logging
│   │   └── notifications.ts       # Notification system
│   └── types/
│       ├── index.ts               # Core type definitions
│       └── auth.ts                # Auth type definitions
├── backend/                       # FastAPI backend scaffolding
├── .github/workflows/             # CI/CD pipelines
├── docker-compose.yml             # Full-stack deployment
├── vite.config.js                 # Vite configuration
└── package.json
```

---

## 🔐 Authentication & Roles

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: user management, system config, audit logs, all incidents |
| **Operator** | Monitoring, incident creation/management, source configuration |
| **Viewer** | Read-only access to incidents, analytics, and monitoring |

### Security Features

- PBKDF2 password hashing (100,000 iterations)
- Secure session tokens with expiration
- Role-based access control (enforced in UI)
- Audit logging for all sensitive actions
- No hardcoded credentials or default passwords

---

## 📊 Incident Management

### Incident Lifecycle

```
Open → Investigating → Resolved → Closed
```

### Incident Fields

- **Title**: Brief summary
- **Category**: Zone Intrusion, Safety Violation, Unauthorized Access, Equipment Hazard, Environmental, PPE Violation, Other
- **Severity**: Low, Medium, High, Critical
- **Origin**: Manual (user-created) or AI Detected (from verified inference)
- **Location**: Physical location or monitored zone
- **Description**: Detailed observations
- **Evidence**: Image attachments (upload or camera capture)
- **Tags**: Custom labels for filtering
- **Assignment**: Assign to authorized users
- **Activity Timeline**: Chronological history of status changes and notes

### Creating Incidents

**Manual**: Click "+ Create Incident" on the Incidents page or Dashboard.

**AI-Generated**: Automatically created when a person enters a configured restricted zone for the required consecutive frames (configurable in Settings).

---

## 🎥 Computer Vision Pipeline

### Detection Model

- **Model**: COCO-SSD (MobileNet v2) via TensorFlow.js
- **Classes**: 80 COCO classes including person, vehicle, animals, objects
- **Inference**: Real-time in-browser using WebGL acceleration
- **Confidence**: Configurable threshold (default: 50%)

### Zone Intrusion Detection

1. **Zone Definition**: Draw polygon over video frame
2. **Reference Point**: Bottom-center of person bounding box
3. **Algorithm**: Ray-casting point-in-polygon test
4. **Confirmation**: Configurable consecutive-frame requirement (default: 3 frames)
5. **Cooldown**: Prevents duplicate incidents (default: 10 seconds)
6. **Severity**: Based on duration in zone (configurable thresholds)

### Camera Access

- Explicit user permission required (browser prompt)
- Device selection when multiple cameras available
- Stream cleanup on disconnect/stop
- Works on HTTPS or localhost only
- No audio recording

---

## 📈 Analytics & Dashboard

### Dashboard Widgets

- **KPI Cards**: Total incidents, open, critical/high, resolved
- **Incident Trend**: Line chart showing last 7 days
- **Severity Distribution**: Pie chart
- **Status Distribution**: Pie chart
- **Origin Comparison**: Bar chart (Manual vs AI)
- **System Status**: Active sessions, sources, model, database

### Analytics Page

- Time-series incident trends
- Severity and status breakdowns
- Source distribution
- Summary statistics

All charts use **real persisted data** — no fabricated values.

---

## ⚙️ Configuration

### Detection Settings (Settings Page)

- **Target Class**: Which object class to detect (default: person)
- **Confidence Threshold**: Minimum score to register detection (10-95%)
- **Consecutive Frame Confirmation**: Frames required before triggering (1-30)
- **Incident Cooldown**: Minimum time between incidents per zone (1-120s)
- **Severity Rules**: Duration thresholds for high/critical severity
- **Evidence Retention**: Days to keep evidence (1-365)

### Data Management

- **Delete All Data**: Permanently clear all sources, zones, incidents, and users (with confirmation)
- **Reset Settings**: Restore default detection configuration

---

## 🐳 Deployment

### Static Frontend (GitHub Pages)

The frontend is deployed to GitHub Pages at:
**https://muzamillp20-ai.github.io/vision-guard-ai/**

All data is stored in browser IndexedDB (per-device, per-browser).

### Full-Stack Deployment (Docker)

For production with backend API and database:

```bash
# Clone repository
git clone https://github.com/muzamillp20-ai/vision-guard-ai.git
cd vision-guard-ai

# Configure environment
cp .env.example .env
# Edit .env with your database URL and secrets

# Start all services
docker-compose up -d
```

Access at `http://localhost`

### Backend API (FastAPI)

The `backend/` directory contains a complete FastAPI scaffolding for:
- Authentication and user management
- Incident CRUD operations
- Source and zone configuration
- Analytics aggregation
- Audit logging
- Health checks

**Note**: The backend requires separate deployment (not hosted on GitHub Pages).

---

## 🔒 Security & Privacy

### Data Storage

- **Frontend**: All data stored locally in browser IndexedDB
- **Backend**: PostgreSQL (when deployed)
- **Evidence**: Images stored as data URLs (frontend) or files (backend)

### Privacy

- No data transmitted to external servers
- Camera access requires explicit permission
- No audio recording
- No facial recognition or identity tracking
- No cloud uploads without explicit configuration

### Security Best Practices

- Never commit `.env` files with real credentials
- Use strong, unique passwords
- Enable HTTPS in production
- Configure CORS restrictions
- Regular security audits
- Monitor audit logs for suspicious activity

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with admin account
- [ ] Create monitoring source
- [ ] Connect webcam (permission prompt)
- [ ] Draw restricted zone
- [ ] Start monitoring session
- [ ] Detect person in zone
- [ ] Incident created automatically
- [ ] Create manual incident
- [ ] Attach evidence image
- [ ] Acknowledge incident
- [ ] Resolve incident
- [ ] Export incidents to CSV
- [ ] View analytics charts
- [ ] Check system health
- [ ] Review audit log
- [ ] Receive notifications

### Automated Tests

Backend tests are located in `backend/tests/` (requires backend deployment).

---

## 🛠️ Technology Stack

### Frontend

- **React 18** — UI framework
- **TypeScript 5** — Type safety
- **Vite 6** — Build tool
- **Tailwind CSS 4** — Styling
- **React Router 6** — Client-side routing
- **Recharts** — Data visualization
- **TensorFlow.js** — Computer vision inference
- **COCO-SSD** — Object detection model
- **Dexie.js** — IndexedDB wrapper
- **Lucide React** — Icons

### Backend (Scaffolding)

- **FastAPI** — Python web framework
- **SQLAlchemy** — ORM
- **PostgreSQL** — Production database
- **Pydantic** — Data validation
- **Passlib** — Password hashing
- **python-jose** — JWT tokens

### Deployment

- **GitHub Actions** — CI/CD
- **Docker Compose** — Container orchestration
- **Nginx** — Reverse proxy
- **GitHub Pages** — Static frontend hosting

---

## 📝 License

CraftAI Physical AI Hackathon — Track A: PipeGen

---

## 👥 Credits

Built for the CraftAI Physical AI Hackathon.

**Computer Vision**: TensorFlow.js + COCO-SSD  
**Framework**: React + TypeScript + Vite  
**Styling**: Tailwind CSS  
**Database**: Dexie.js (IndexedDB) / PostgreSQL (production)

---

## 🤝 Contributing

This is a hackathon project. For questions or issues, please open a GitHub issue.

---

## 📞 Support

- **Documentation**: This README
- **Issues**: GitHub Issues
- **Hackathon**: CraftAI Physical AI Hackathon — Track A

---

**Version**: 1.0.0  
**Last Updated**: 2026  
**Status**: Production-Ready Frontend, Backend Scaffolding Complete
