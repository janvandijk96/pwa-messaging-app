# Local Development Setup

This guide will help you set up the PWA Messaging App for local development.

## Prerequisites

- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: v12 or higher ([Download](https://www.postgresql.org/download/))
- **Git**: For version control
- **npm**: Comes with Node.js
- **Code Editor**: VS Code recommended with extensions:
  - Volar (Vue)
  - ESLint
  - Prettier

## Database Setup

### PostgreSQL Installation

**macOS:**
```bash
brew install postgresql
brew services start postgresql
createuser -s postgres
```

**Ubuntu/Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres psql
# Then in psql:
ALTER USER postgres PASSWORD 'postgres';
\q
```

**Windows:**
- Download PostgreSQL installer
- Run installer with default settings
- Note the password you set during installation

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE messaging_app;
CREATE USER messaging_user WITH PASSWORD 'secure_password';
ALTER ROLE messaging_user SET client_encoding TO 'utf8';
ALTER ROLE messaging_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE messaging_user SET default_transaction_deferrable TO on;
ALTER ROLE messaging_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE messaging_app TO messaging_user;

# Exit psql
\q
```

### Initialize Schema

```bash
cd backend
psql -U messaging_user -d messaging_app -f db/init.sql
```

## Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

The backend will run on `http://localhost:3000`

### Environment Variables

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=messaging_app
DB_USER=messaging_user
DB_PASSWORD=secure_password
JWT_SECRET=your-dev-secret-key
FRONTEND_URL=http://localhost:5173
EMAIL_SERVICE=sendgrid
EMAIL_FROM=test@example.com
SENDGRID_API_KEY=
OLLAMA_API_URL=http://localhost:11434
LOG_LEVEL=debug
```

## Frontend Setup

```bash
cd frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

### Environment Variables

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_APP_NAME=Messaging
VITE_RP_ID=localhost
VITE_RP_NAME=Messaging App
VITE_ORIGIN=http://localhost:5173
VITE_INACTIVITY_TIMEOUT=3600000
```

## Ollama Setup (Optional)

For chatbot functionality:

### Installation

**macOS:**
```bash
brew install ollama
ollama serve
```

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
ollama serve
```

**Docker:**
```bash
docker pull ollama/ollama
docker run -d -p 11434:11434 ollama/ollama
```

### Pull a Model

In another terminal:
```bash
ollama pull mistral
ollama pull neural-chat  # Alternative lightweight model
```

### Verify

```bash
curl http://localhost:11434/api/tags
```

## Running Everything

### Option 1: Three Terminal Windows

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Ollama (optional)
ollama serve
```

### Option 2: Using Docker Compose

```bash
# From project root
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Development Workflow

### Create a Feature

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, test, then commit
git add .
git commit -m "feat: add my feature"

# Push to your fork
git push origin feature/my-feature

# Create a pull request on GitHub
```

### Useful Commands

```bash
# Backend
npm run dev          # Start dev server
npm run migrate      # Run database migrations
npm run seed         # Seed database with test data

# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Database
psql -U messaging_user -d messaging_app
# Then in psql:
\dt                  # List tables
\d users             # Describe users table
SELECT COUNT(*) FROM messages;  # Count messages
```

## Troubleshooting

### Database Connection Errors

```bash
# Check PostgreSQL is running
psql -U postgres -d postgres

# Check specific database connection
psql -U messaging_user -d messaging_app
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000      # Backend
lsof -i :5173      # Frontend
lsof -i :5432      # Database

# Kill process (macOS/Linux)
kill -9 <PID>
```

### Frontend Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### WebSocket Connection Issues

- Ensure backend is running
- Check `VITE_SOCKET_URL` matches backend address
- Check browser console for errors

## IDE Configuration

### VS Code

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "vue"
  ]
}
```

## Next Steps

- Read [API.md](API.md) for API documentation
- Review [DATABASE.md](DATABASE.md) for schema details
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- See [SECURITY.md](SECURITY.md) for security guidelines
