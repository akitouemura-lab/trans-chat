# TransChat

TransChat is a real-time English/Japanese translation chat app. It combines a Next.js frontend, a Node.js/Express/Socket.IO chat server, a FastAPI translation service, PostgreSQL, Prisma, and Docker Compose.

The goal is to make cross-language chat feel immediate while keeping the architecture understandable for portfolio review and local development.

## Features

- Room-based real-time chat with Socket.IO
- English to Japanese and Japanese to English translation
- Auto language direction selection plus manual direction selection
- Local translation through Argos Translate, with no paid translation API required
- PostgreSQL message persistence through Prisma
- Latest 100 room messages loaded in chronological display order
- Optimistic pending messages matched by `clientMessageId`
- Dark and light mode with local browser persistence
- Docker Compose support for PostgreSQL, translation service, chat server, and frontend
- GitHub Actions CI for frontend, chat server, and translation service checks

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Realtime server | Node.js, Express, Socket.IO, TypeScript |
| Translation service | Python, FastAPI, Argos Translate |
| Database | PostgreSQL, Prisma |
| Package manager | pnpm |
| Local infrastructure | Docker Compose |

## Architecture

```mermaid
flowchart LR
    Browser[Browser / Next.js UI]
    ChatServer[Node.js Chat Server]
    TranslateService[FastAPI Translation Service]
    TranslationEngine[Argos Translate]
    Database[(PostgreSQL)]

    Browser <--> ChatServer
    ChatServer --> TranslateService
    TranslateService --> TranslationEngine
    ChatServer --> Database
    Database --> ChatServer
```

## Architecture Notes

- The frontend is split into chat components, localStorage-backed settings, Socket.IO state, validation helpers, and shared message types under `frontend/features/chat`.
- The chat server owns Socket.IO room membership, message validation, persistence, optimistic-message IDs, translation-service calls, and the HTTP room-history API.
- The translation service owns language schema validation, Argos Translate integration, and generic error responses that do not expose raw internal exceptions.
- PostgreSQL stores original text, translated text, language metadata, translation latency, room ID, user name, and timestamps.

## Project Structure

```text
trans-chat/
├── frontend/
│   ├── app/
│   ├── features/chat/
│   ├── Dockerfile
│   └── .env.example
├── chat-server/
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── .env.example
├── translate-service/
│   ├── app/
│   ├── Dockerfile
│   └── requirements.txt
├── .github/workflows/ci.yml
├── docker-compose.yml
├── start-dev.ps1
└── stop-dev.ps1
```

## Requirements

- Node.js
- pnpm
- Python 3.11
- Docker Desktop
- Git

## Environment Files

Copy the example files before local development:

```powershell
Copy-Item .\chat-server\.env.example .\chat-server\.env
Copy-Item .\frontend\.env.example .\frontend\.env.local
```

`chat-server/.env.example` includes:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
TRANSLATE_SERVICE_URL=http://localhost:5000
TRANSLATE_TIMEOUT_MS=5000
DATABASE_URL=postgresql://transchat:transchat_password@localhost:5432/transchat?schema=public
ENABLE_ADMIN_ACTIONS=false
```

`ENABLE_ADMIN_ACTIONS=false` disables destructive room-history deletion by default. Set it to `true` only in a trusted local/admin environment where the delete-history endpoint should be available.

`frontend/.env.example` includes:

```env
NEXT_PUBLIC_CHAT_SERVER_URL=http://localhost:4000
```

## Quick Start

Install dependencies and prepare the database:

```powershell
docker compose up -d postgres

cd chat-server
pnpm.cmd install
pnpm.cmd exec prisma generate
pnpm.cmd exec prisma migrate dev --name init_messages
cd ..

cd translate-service
py -3.11 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..

cd frontend
pnpm.cmd install
cd ..
```

Start all local dev services on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Stop local dev services:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-dev.ps1
```

Open:

```text
http://localhost:3000
```

## Docker Compose

Build and run the full stack:

```powershell
docker compose up --build
```

The frontend runs on `http://localhost:3000`, the chat server on `http://localhost:4000`, the translation service on `http://localhost:5000`, and PostgreSQL on `localhost:5432`.

Stop services:

```powershell
docker compose down
```

## Development Commands

Frontend:

```powershell
cd frontend
pnpm.cmd lint
pnpm.cmd build
```

Chat server:

```powershell
cd chat-server
pnpm.cmd type-check
pnpm.cmd build
```

Translation service:

```powershell
cd translate-service
.\venv\Scripts\python.exe -m compileall app
```

## API Examples

Chat server health check:

```powershell
curl.exe http://localhost:4000/health
```

Translation service health check:

```powershell
curl.exe http://localhost:5000/health
```

Fetch room history:

```powershell
curl.exe http://localhost:4000/rooms/room1/messages
```

Delete room history is disabled unless `ENABLE_ADMIN_ACTIONS=true`:

```powershell
curl.exe -X DELETE http://localhost:4000/rooms/room1/messages
```

Default response:

```json
{ "message": "admin actions disabled" }
```

## CI

GitHub Actions runs on `push` and `pull_request`:

- `frontend`: `pnpm install`, `pnpm lint`, `pnpm build`
- `chat-server`: `pnpm install`, `pnpm type-check`, `pnpm build`
- `translate-service`: install Python dependencies and run `python -m compileall app`

CI does not require PostgreSQL or the translation runtime to be running.

## Known Limitations

- There is no full authentication or authorization yet.
- Local and Docker Compose credentials are for development only and are not production credentials.
- Argos Translate quality can vary, especially for short phrases or informal chat text.
- The delete-history endpoint is a coarse admin action, not a user-level permission system.
- Only English and Japanese are currently supported.

## Roadmap

- Add authentication and room ownership
- Add room list management
- Add message search
- Add support for more languages
- Add production deployment hardening
- Add screenshots and GIFs
- Improve mobile UI polish

## Demo Video

[Watch the demo video](docs/videos/demo.mp4)

## License

This project is currently intended for learning and portfolio purposes. No formal open-source license has been added yet.

## Author

Developed by **akito uemura**

GitHub: [akitouemura-lab](https://github.com/akitouemura-lab)

Repository: [trans-chat](https://github.com/akitouemura-lab/trans-chat)
