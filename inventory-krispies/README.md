# Bakery Factory Dispatch Logger

A full-stack web app for logging daily bakery factory dispatch operations.

## Stack
- **Backend**: Node.js + Express + better-sqlite3 (SQLite)
- **Frontend**: React + Vite + Tailwind CSS

## Quick Start

### Backend
```bash
cd backend
npm install
node index.js
```
Runs on http://localhost:3001

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173

## Features
- Daily dispatch sessions per supervisor
- QR code scanning to pre-fill dispatch forms
- Manual item entry with destination and notes
- Session lock/submit workflow
- CSV export per session
- Dispatch history viewer
- Item catalog management with printable QR codes
- Destination management
