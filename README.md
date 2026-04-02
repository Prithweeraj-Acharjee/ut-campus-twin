<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:161b22,100:1f6feb&height=200&section=header&text=UT%20Campus%20Twin&fontSize=40&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=Real-Time%20Digital%20Twin%20for%20the%20University%20of%20Toledo&descSize=16&descAlignY=55" width="100%" />

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)]()
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)]()
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)]()

</div>

---

## About

**UT Campus Twin** is a real-time digital twin for the University of Toledo campus. It provides live monitoring of building occupancy, parking availability, and operational incidents through a synchronized WebSocket stream.

The platform serves two audiences:
- **Students** get real-time awareness of building crowding and parking availability
- **Campus Operators** get a command center to manage incidents, parking advisories, and global alerts

---

## Features

- **Real-Time Occupancy Monitoring** - live building crowding data synchronized across all views
- **Parking Availability** - real-time parking lot status and capacity tracking
- **Incident Management** - create, track, and resolve campus operational incidents
- **Global Alerts System** - broadcast advisories to all connected clients
- **SSI Scoring** - Spatial Safety Index for quantifying campus conditions
- **WebSocket Synchronization** - single stream keeps all clients in sync
- **Dual Interface** - separate student and admin views with role-based access

---

## Architecture

```
Python Simulation Engine
         |
    SSI Scoring
         |
   FastAPI Backend
         |
   WebSocket Stream
      /       \
Student View   Admin View
(Next.js)      (Next.js)
```

---

## Tech Stack

<div align="center">

| Category | Technology |
|----------|-----------|
| **Frontend** | Next.js, TypeScript, React |
| **Backend** | FastAPI, Python |
| **Real-Time** | WebSockets |
| **Simulation** | Python Engine with SSI Scoring |
| **Deployment** | Vercel |

</div>

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Prithweeraj-Acharjee/ut-campus-twin.git
cd ut-campus-twin

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

---

## Author

**Prithweeraj Acharjee Porag**

[![GitHub](https://img.shields.io/badge/GitHub-Prithweeraj--Acharjee-181717?style=flat-square&logo=github)](https://github.com/Prithweeraj-Acharjee)
[![Portfolio](https://img.shields.io/badge/Portfolio-prithwee.vercel.app-000000?style=flat-square&logo=vercel)](https://prithwee.vercel.app)

---

## License

This project is open source and available under the [MIT License](LICENSE).

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:161b22,100:1f6feb&height=100&section=footer" width="100%" />
</div>
