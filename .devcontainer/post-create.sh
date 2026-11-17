#!/usr/bin/env bash
set -e

echo "🚀 Setting up OpenSourceMate devcontainer environment..."

# 1. Setup environment files if missing
if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
  echo "📄 Creating backend/.env from backend/.env.example..."
  cp backend/.env.example backend/.env
fi

if [ ! -f "frontend/.env.local" ] && [ -f "frontend/.env.example" ]; then
  echo "📄 Creating frontend/.env.local from frontend/.env.example..."
  cp frontend/.env.example frontend/.env.local
fi

# 2. Upgrade pip and install backend dependencies
echo "📦 Installing backend dependencies (FastAPI, pytest, dev tools)..."
python -m pip install --upgrade pip
pip install -r backend/requirements.txt -r backend/requirements-dev.txt

# 3. Install frontend dependencies
echo "📦 Installing frontend dependencies (Next.js, React, Tailwind)..."
cd frontend && npm install && cd ..

echo "✅ OpenSourceMate setup complete!"
echo ""
echo "To start development:"
echo "  - Frontend: make dev-frontend   (or: cd frontend && npm run dev)"
echo "  - Backend:  make dev-backend    (or: cd backend && uvicorn app.main:app --reload --port 8000)"
echo "  - Tests:    make test           (or: make test-backend / make test-frontend)"
