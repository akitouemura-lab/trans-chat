# TransChat

TransChat is a real-time English/Japanese translation chat application built to make bilingual conversation feel immediate, natural, and technically elegant.

It combines a Next.js frontend, a Node.js/Express/Socket.IO chat server, a FastAPI translation service, Argos Translate, PostgreSQL, Prisma, Docker Compose, and GitHub Actions CI into one small but complete full-stack system.


JP
https://github.com/user-attachments/assets/482f79f0-6f85-431f-98a4-01c6d492b4a5
EN










<a id="readme-navigation"></a>

## Table of Contents

- [Project Title](#transchat)
- [Project Overview](#project-overview)
- [Demo Video](#demo-video)
- [Overview](#overview)
- [Core Concept](#core-concept)
- [Features](#features)
  - [Real-time Chat](#real-time-chat)
  - [English/Japanese Translation](#englishjapanese-translation)
  - [Persistent Message History](#persistent-message-history)
  - [Async Translation UX](#async-translation-ux)
  - [UI and Local Persistence](#ui-and-local-persistence)
  - [Operations and Safety](#operations-and-safety)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Service Responsibilities](#service-responsibilities)
- [Message Flow](#message-flow)
- [Project Structure](#project-structure)
- [Setup](#setup)
  - [Docker Compose Startup](#docker-compose-startup)
  - [Local Development Startup](#local-development-startup)
- [Access from Another Device on the Same LAN](#access-from-another-device-on-the-same-lan)
- [Environment Variables](#environment-variables)
- [Security Notes](#security-notes)
- [Usage](#usage)
- [API Examples](#api-examples)
- [Socket.IO Events](#socketio-events)
- [Development Commands](#development-commands)
- [CI](#ci)
- [Design Notes](#design-notes)
- [Completed](#completed)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Portfolio Highlights](#portfolio-highlights)
- [License](#license)
- [Author](#author)
- [Summary](#summary)

## Project Overview

TransChat is a portfolio-focused full-stack project that demonstrates realtime communication, local translation model integration, persistent chat history, service boundaries, Docker-based local infrastructure, and production-minded reliability improvements.

The application lets users create or join chat rooms, send messages, translate between English and Japanese, view original and translated text together, and reload recent room history from PostgreSQL. It is designed to be understandable as a practical architecture sample rather than a toy single-file demo.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Demo Video

[Watch the demo video](docs/videos/demo.mp4)

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Overview

Modern online communication often crosses language boundaries, but many translation workflows still require users to leave a conversation, open another tool, copy text, translate it, and paste the result back into chat.

TransChat removes that friction by embedding translation directly into the chat flow. When a user sends a message, the chat server validates the payload, requests a local translation, stores the result, and broadcasts the message to users in the same room.

This project was built to solve a concrete communication problem while also showcasing engineering skills that matter in real applications:

- realtime bidirectional communication
- frontend state and component design
- backend validation and safe failure handling
- local AI/translation integration without paid APIs
- database persistence and ORM usage
- containerized service orchestration
- CI-based project verification

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Core Concept

> Make cross-language communication feel immediate, natural, and technically elegant.

TransChat focuses on keeping the user experience simple while making the internal architecture explicit. The frontend is responsible for interaction and optimistic UI, the chat server owns realtime coordination and persistence, the translation service owns language translation, and PostgreSQL stores durable message history.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Features

### Real-time Chat

- Room-based realtime messaging with Socket.IO
- Server-created rooms backed by PostgreSQL
- Secure room IDs and invite tokens generated with Node crypto APIs
- Room creation and room joining from the UI
- Invite link copying with a secure invite token in the URL
- Connection status display
- Separate rendering for your messages and messages from other users
- Safe room switching so a socket leaves the previous room before joining the next one

### English/Japanese Translation

- English to Japanese translation
- Japanese to English translation
- Auto translation direction based on lightweight Japanese/English character counting
- Manual translation direction selection
- Local translation with Argos Translate
- Translation latency shown per message when available
- In-memory translation cache in the chat server to avoid repeated translation work for the same normalized text and language direction
- Clear translation failure states for timeout, unavailable service, invalid response, and missing model cases

### Persistent Message History

- PostgreSQL storage through Prisma
- Original text and translated text stored together
- Room/User data model foundation for future authentication and room ownership
- Source language, target language, translation latency, translation status, room ID, user name, and timestamp metadata
- Latest 100 messages loaded for each room
- History is returned in chronological display order

### Async Translation UX

- Pending message state while a message is being sent and translated
- Original messages are saved and broadcast before translation finishes
- `message_updated` events update the translated text when translation completes
- `message_status` events for `translating`, `saved`, and `error` states
- `clientMessageId` support so pending messages are replaced by the matching server broadcast instead of guessing by text content
- More stable behavior when the same user sends the same message multiple times

### UI and Local Persistence

- Dark/light mode
- Local browser persistence for user name, room ID, theme, and translation direction
- Local translation history for recently translated messages
- Saved phrases for frequently used bilingual expressions
- Automatic scroll-to-bottom for new messages
- Message input validation
- Responsive chat layout

### Operations and Safety

- Docker Compose for the full stack
- GitHub Actions CI for frontend, chat server, and translation service checks
- In-memory Socket.IO rate limiting per socket and per room
- Translation request timeout with safe fallback
- Argos model installation moved to an explicit setup script and Docker build step
- Generic FastAPI error responses that do not expose raw internal exceptions
- Destructive room-history deletion disabled by default unless admin actions are explicitly enabled

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Realtime client | Socket.IO Client |
| Chat server | Node.js, Express, Socket.IO, TypeScript |
| Translation service | Python, FastAPI, Uvicorn |
| Translation engine | Argos Translate |
| Database | PostgreSQL |
| ORM | Prisma |
| Package manager | pnpm |
| Local infrastructure | Docker Compose |
| CI | GitHub Actions |

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Architecture

```mermaid
flowchart LR
    Browser["Browser / Next.js UI"]
    ChatServer["Node.js Chat Server<br/>Express + Socket.IO + Prisma"]
    TranslateService["FastAPI Translation Service"]
    TranslationEngine["Argos Translate"]
    Database[("PostgreSQL")]

    Browser <--> ChatServer
    ChatServer --> TranslateService
    TranslateService --> TranslationEngine
    ChatServer --> Database
    Database --> ChatServer
```

### Service Responsibilities

| Layer | Responsibility |
| --- | --- |
| `frontend/` | Renders the chat UI, manages local settings, handles optimistic messages, and talks to Socket.IO |
| `chat-server/` | Validates messages, creates rooms, resolves invite tokens, rate-limits clients, calls translation service, persists messages, and broadcasts events |
| `translate-service/` | Validates translation requests, checks model readiness, and translates English/Japanese text with Argos Translate |
| PostgreSQL | Stores rooms, invite tokens, guest users, message history, and translation metadata |
| Docker Compose | Runs the full local service graph |

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Message Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Next.js Frontend
    participant Socket as Socket.IO Chat Server
    participant Translate as FastAPI Translation Service
    participant DB as PostgreSQL

    User->>Frontend: Create or join room
    Frontend->>Socket: create_room or join_room
    Socket->>DB: Create/resolve Room and Guest User
    DB-->>Socket: Room with invite token
    Socket-->>Frontend: joined_room and room_history
    User->>Frontend: Type and send message
    Frontend->>Frontend: Create pending message with clientMessageId
    Frontend->>Socket: send_message
    Socket->>Socket: Validate room, user, text, languages, and rate limits
    Socket->>DB: Save original message as translationStatus=pending
    DB-->>Socket: Stored original message
    Socket-->>Frontend: receive_message with original text
    Socket-->>Frontend: message_status translating
    Socket->>Translate: POST /translate asynchronously
    Translate-->>Socket: translated text or clear failure
    Socket->>DB: Update message translation status/result
    Socket-->>Frontend: message_updated
```

If translation times out, the translation service is unreachable, the response is invalid, or a required local model is missing, the original message remains visible and the chat server updates the message as `translationStatus=failed`.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Project Structure

```text
trans-chat/
|-- frontend/
|   |-- app/
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- features/
|   |   `-- chat/
|   |       |-- components/
|   |       |   |-- ChatHeader.tsx
|   |       |   |-- RoomControls.tsx
|   |       |   |-- TranslationMemoryPanel.tsx
|   |       |   |-- MessageList.tsx
|   |       |   |-- MessageBubble.tsx
|   |       |   `-- MessageInput.tsx
|   |       |-- hooks/
|   |       |   |-- useChatSocket.ts
|   |       |   |-- useLocalChatSettings.ts
|   |       |   |-- useRoomInviteLink.ts
|   |       |   `-- useTranslationMemory.ts
|   |       `-- lib/
|   |           |-- types.ts
|   |           `-- validation.ts
|   |-- Dockerfile
|   `-- .env.example
|
|-- chat-server/
|   |-- src/
|   |   |-- index.ts
|   |   |-- socket.ts
|   |   `-- services/
|   |       |-- db.ts
|   |       |-- messageRepository.ts
|   |       |-- rateLimiter.ts
|   |       |-- roomRepository.ts
|   |       `-- translation.ts
|   |-- prisma/
|   |   |-- migrations/
|   |   `-- schema.prisma
|   |-- Dockerfile
|   `-- .env.example
|
|-- translate-service/
|   |-- app/
|   |   |-- main.py
|   |   |-- schemas.py
|   |   `-- translator.py
|   |-- scripts/
|   |   `-- install_argos_models.py
|   |-- tests/
|   |   `-- test_translator.py
|   |-- Dockerfile
|   `-- requirements.txt
|
|-- .github/
|   `-- workflows/
|       `-- ci.yml
|-- docker-compose.yml
|-- .env.example
|-- start-dev.ps1
|-- stop-dev.ps1
`-- README.md
```

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Setup

### Requirements

- Node.js
- pnpm
- Python 3.11
- Docker Desktop
- Git

### Environment Files

Use the example environment files as local templates:

```powershell
Copy-Item .\chat-server\.env.example .\chat-server\.env
Copy-Item .\frontend\.env.example .\frontend\.env.local

# Optional: Docker Compose LAN access settings
Copy-Item .\.env.example .\.env
```

Do not commit real `.env` files. The example files are safe templates for local development. If you copy the root `.env.example`, replace the sample LAN IP address before using Docker Compose from another device.

### Docker Compose Startup

The easiest way to run the full stack is Docker Compose:

```powershell
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432` on the development PC
- FastAPI translation service on `http://localhost:5000` on the development PC
- Node.js chat server on `http://localhost:4000`
- Next.js frontend on `http://localhost:3000`

For same-machine development, the default Compose settings are enough. For LAN access, set `LAN_HOST` in the root `.env` file before building so the browser bundle points to the development PC instead of `localhost`.

Stop the stack:

```powershell
docker compose down
```

The Docker image installs the required Argos Translate language packages during build, not during FastAPI startup. This keeps normal service startup independent of network availability.

### Local Development Startup

Prepare dependencies and database locally:

```powershell
docker compose up -d postgres

cd chat-server
pnpm.cmd install
pnpm.cmd exec prisma generate
pnpm.cmd exec prisma migrate dev
cd ..

cd translate-service
py -3.11 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe .\scripts\install_argos_models.py
cd ..

cd frontend
pnpm.cmd install
cd ..
```

Start all local development services on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Stop local development services:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-dev.ps1
```

The helper scripts derive the project root from the script location, so they do not depend on a hard-coded checkout path. Local development requires the Argos setup script above before translation can succeed; otherwise `/health` reports missing models and translation requests return HTTP 503.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Access from Another Device on the Same LAN

`localhost` always points to the device that is opening the page. If you open `http://localhost:3000` on a phone, the phone looks for a server running on the phone itself, not on the development PC.

To test TransChat from another PC or smartphone on the same trusted Wi-Fi/LAN, use the development PC's LAN IPv4 address.

1. Find the development PC's IPv4 address:

```powershell
ipconfig
```

Look for `IPv4 Address` on the active Wi-Fi or Ethernet adapter. Example:

```text
192.168.1.20
```

2. Open the frontend from another device:

```text
http://192.168.1.20:3000
```

3. Make sure the frontend connects to the chat server using the same LAN host:

```text
http://192.168.1.20:4000
```

### Docker Compose LAN Startup

Create a root `.env` file from the example and set `LAN_HOST`:

```powershell
Copy-Item .\.env.example .\.env
notepad .\.env
```

Example:

```env
LAN_HOST=192.168.1.20
```

Then rebuild and start the stack:

```powershell
docker compose up --build
```

`NEXT_PUBLIC_CHAT_SERVER_URL` is read at Next.js build time, so rebuild the frontend container after changing `LAN_HOST`, `NEXT_PUBLIC_CHAT_SERVER_URL`, or `CLIENT_ORIGIN`.

### Local Development LAN Startup

The Windows helper script binds the frontend to `0.0.0.0`, detects a private LAN IPv4 address when possible, and passes the matching chat server URL to Next.js:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

You can override automatic detection explicitly:

```powershell
$env:LAN_HOST = "192.168.1.20"
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

The chat server allows CORS from `localhost`, `127.0.0.1`, and `http://<LAN_HOST>:3000`. You can also provide a comma-separated `CLIENT_ORIGIN` value when you need exact control.

### Firewall Notes

- Allow inbound TCP `3000` and `4000` on the development PC if Windows Defender Firewall prompts you.
- Ports `5000` and `5432` are bound to `127.0.0.1` in Docker Compose because browsers on other devices do not need direct access to the translation service or database.
- Use this only on a trusted local network. Do not expose this development setup directly to the internet.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Environment Variables

### Root `.env.example`

The root `.env.example` is optional and is mainly for Docker Compose LAN access:

```env
LAN_HOST=192.168.1.20
# NEXT_PUBLIC_CHAT_SERVER_URL=http://192.168.1.20:4000
# CLIENT_ORIGIN=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.20:3000
```

| Variable | Purpose |
| --- | --- |
| `LAN_HOST` | Development PC IPv4 address used to derive LAN-friendly defaults |
| `NEXT_PUBLIC_CHAT_SERVER_URL` | Optional direct override for the frontend's browser-facing chat server URL |
| `CLIENT_ORIGIN` | Optional comma-separated list of frontend origins allowed by chat-server CORS |

### `chat-server/.env.example`

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
# LAN_HOST=192.168.1.20
# CLIENT_ORIGIN=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.20:3000
TRANSLATE_SERVICE_URL=http://localhost:5000
TRANSLATE_TIMEOUT_MS=15000

MESSAGE_RATE_LIMIT_WINDOW_MS=10000
MESSAGE_RATE_LIMIT_MAX=5
ROOM_RATE_LIMIT_WINDOW_MS=10000
ROOM_RATE_LIMIT_MAX=30

# Development-only database credentials. Change these before any production use.
DATABASE_URL=postgresql://transchat:transchat_password@localhost:5432/transchat?schema=public
ENABLE_ADMIN_ACTIONS=false
```

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP and Socket.IO server port |
| `CLIENT_ORIGIN` | Allowed frontend origins for CORS. Multiple origins can be comma-separated. |
| `LAN_HOST` | Optional LAN IPv4 address. When present, `http://<LAN_HOST>:3000` is added to allowed origins. |
| `TRANSLATE_SERVICE_URL` | FastAPI translation service URL |
| `TRANSLATE_TIMEOUT_MS` | Timeout for translation HTTP requests |
| `MESSAGE_RATE_LIMIT_WINDOW_MS` | Per-socket message rate limit window |
| `MESSAGE_RATE_LIMIT_MAX` | Maximum messages per socket in the window |
| `ROOM_RATE_LIMIT_WINDOW_MS` | Per-room aggregate message rate limit window |
| `ROOM_RATE_LIMIT_MAX` | Maximum messages per room in the window |
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `ENABLE_ADMIN_ACTIONS` | Enables destructive admin-only endpoints when set to `true` |

`ENABLE_ADMIN_ACTIONS=false` is the safe default. With this setting, `DELETE /rooms/:roomId/messages` returns HTTP 403 and does not delete history. Set it to `true` only in a trusted local/admin environment.

The default `transchat_password` value is for local development only. Change database credentials before production use, do not commit real `.env` files, and use a secret manager or deployment platform secret storage in production.

### `frontend/.env.example`

```env
NEXT_PUBLIC_CHAT_SERVER_URL=http://localhost:4000

# LAN access example:
# NEXT_PUBLIC_CHAT_SERVER_URL=http://192.168.1.20:4000
```

This value tells the browser where the Socket.IO chat server is running. When testing from another device, it must use the development PC's LAN IP address instead of `localhost`.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Security Notes

- This is a local-first portfolio prototype, not a production chat service.
- Change PostgreSQL user names and passwords before production use.
- Do not commit real `.env` or `.env.local` files.
- Use deployment secrets or a secret manager for production configuration.
- The current Room/User model is a privacy foundation, but it is not a full authentication or authorization system yet.
- In-memory rate limiting protects local demos but should be replaced with Redis-backed limiting for multi-instance production deployments.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Usage

1. Open `http://localhost:3000`.
2. Enter a user name.
3. Click `Create` to create a secure server-backed room, or paste a room ID / invite token and click `Join room`.
4. Click `Copy invite` to share an invite URL with the active room token.
5. Select translation direction:
   - `Auto detect`
   - `English -> Japanese`
   - `Japanese -> English`
6. Type a message and click `Send`.
7. The UI shows a pending state while the original message is saved.
8. The original message appears quickly, then updates when translation completes.
9. Use `Save phrase` or the translation memory panel to store frequently used expressions locally.

Room history is loaded automatically after joining a room. The chat server returns the latest 100 messages in chronological display order.

Translation history and saved phrases are stored in the browser with `localStorage`. They are useful for personal reuse during demos, but they are not synchronized between devices.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## API Examples

### Chat Server Health Check

```powershell
curl.exe http://localhost:4000/health
```

Example response:

```json
{
  "status": "ok",
  "service": "chat-server"
}
```

### Translation Service Health Check

```powershell
curl.exe http://localhost:5000/health
```

Example response:

```json
{
  "status": "ok",
  "service": "translate-service",
  "modelsReady": true,
  "missingPairs": []
}
```

### Fetch Room History

```powershell
curl.exe http://localhost:4000/rooms/5d8b2f78-6b1e-4e9f-9b86-5e0f48c62c44/messages
```

Example response:

```json
{
  "messages": [
    {
      "id": "uuid",
      "roomId": "5d8b2f78-6b1e-4e9f-9b86-5e0f48c62c44",
      "userName": "user1",
      "originalText": "Hello, how are you?",
      "translatedText": "Japanese translation text",
      "sourceLang": "en",
      "targetLang": "ja",
      "translationMs": 120,
      "translationStatus": "completed",
      "translationError": null,
      "createdAt": "2026-06-21T00:00:00.000Z",
      "updatedAt": "2026-06-21T00:00:00.500Z"
    }
  ]
}
```

### Delete Room History

By default, deletion is blocked:

```powershell
curl.exe -X DELETE http://localhost:4000/rooms/5d8b2f78-6b1e-4e9f-9b86-5e0f48c62c44/messages
```

Default response:

```json
{
  "message": "admin actions disabled"
}
```

To enable this endpoint in a trusted local/admin environment:

```env
ENABLE_ADMIN_ACTIONS=true
```

When enabled, the endpoint keeps the existing room ID validation and deletes messages for the requested room.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Socket.IO Events

### `create_room`

Client to server:

```ts
socket.emit("create_room", {
  userName: "user1"
});
```

Server behavior:

- validates the display name
- creates a secure Room ID and invite token
- creates or reuses a guest User record
- joins the socket to the new room
- emits `room_created`
- emits `joined_room`
- emits empty `room_history`

### `join_room`

Client to server:

```ts
socket.emit("join_room", {
  roomIdOrInvite: "invite-token-or-room-id"
});
```

Server behavior:

- resolves the invite token or room ID against PostgreSQL
- rejects missing or unknown rooms
- leaves the previous active room if needed
- stores the current room ID on `socket.data.roomId`
- joins the requested room
- emits `joined_room` with room ID, display name, and invite token
- emits `room_history`

### `send_message`

Client to server:

```ts
socket.emit("send_message", {
  roomId: "5d8b2f78-6b1e-4e9f-9b86-5e0f48c62c44",
  userName: "user1",
  text: "I want to build a web application.",
  translationDirection: "en-ja",
  clientMessageId: "client-..."
});
```

### `receive_message`

Server to clients in the room:

```json
{
  "id": "uuid",
  "roomId": "5d8b2f78-6b1e-4e9f-9b86-5e0f48c62c44",
  "userName": "user1",
  "originalText": "I want to build a web application.",
  "translatedText": null,
  "sourceLang": null,
  "targetLang": "ja",
  "translationMs": null,
  "translationStatus": "pending",
  "translationError": null,
  "clientMessageId": "client-...",
  "createdAt": "2026-06-21T00:00:00.000Z",
  "updatedAt": "2026-06-21T00:00:00.000Z"
}
```

`clientMessageId` is optional for backward compatibility, but when present it allows the frontend to replace the exact pending message. Translation continues asynchronously after this event.

### `message_updated`

Server to clients in the room:

```json
{
  "id": "uuid",
  "roomId": "5d8b2f78-6b1e-4e9f-9b86-5e0f48c62c44",
  "userName": "user1",
  "originalText": "I want to build a web application.",
  "translatedText": "Japanese translation text",
  "sourceLang": "en",
  "targetLang": "ja",
  "translationMs": 95,
  "translationStatus": "completed",
  "translationError": null,
  "cacheHit": false,
  "createdAt": "2026-06-21T00:00:00.000Z",
  "updatedAt": "2026-06-21T00:00:00.500Z"
}
```

If translation fails, `translationStatus` becomes `failed`, `translatedText` remains `null`, and `translationError` contains a user-safe explanation.

### `message_status`

Server to sender:

```json
{
  "clientMessageId": "client-...",
  "status": "translating"
}
```

Possible statuses:

- `translating`
- `saved`
- `error`

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Development Commands

### Frontend

```powershell
cd frontend
pnpm.cmd install --frozen-lockfile
pnpm.cmd lint
pnpm.cmd build
```

### Chat Server

```powershell
cd chat-server
pnpm.cmd install --frozen-lockfile
pnpm.cmd exec prisma generate
pnpm.cmd type-check
pnpm.cmd build
```

### Translation Service

```powershell
cd translate-service
python scripts/install_argos_models.py
python -m compileall app scripts tests
python -m unittest discover -s tests
```

### Docker Compose Validation

```powershell
docker compose config
```

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## CI

GitHub Actions runs on `push` and `pull_request`.

The workflow validates each subproject independently:

- `frontend`
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - `pnpm build`
- `chat-server`
  - `pnpm install --frozen-lockfile`
  - `pnpm exec prisma generate`
  - `pnpm type-check`
  - `pnpm build`
- `translate-service`
  - install Python dependencies
  - `python -m compileall app scripts tests`
  - `python -m unittest discover -s tests`

The CI workflow does not require PostgreSQL or the translation runtime to be running, which keeps it lightweight and suitable for pull requests.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Design Notes

### Service-oriented Architecture

TransChat separates the user interface, realtime server, translation service, and database. This makes each layer easier to test, explain, replace, and operate.

Rooms and users are now first-class database records. The current user model is still a guest-user foundation rather than production authentication, but it gives the application a cleaner path toward room ownership, membership, and authorization.

### Maintainable Frontend Refactor

The frontend is split by chat feature responsibility:

- components render UI
- hooks manage Socket.IO and local settings
- lib files hold shared types and validation helpers

This keeps `frontend/app/page.tsx` small and makes the chat feature easier to extend.

### Local-first Translation

Argos Translate keeps the project usable without paid translation APIs. This is useful for portfolio review because the app can demonstrate translation behavior without requiring external API keys.

Required Argos packages are installed by `translate-service/scripts/install_argos_models.py`. Docker builds run this setup step during image build, and FastAPI startup only checks model readiness.

### Translation Timeout and Safe Fallback

The chat server wraps translation requests with `AbortController`. Timeout, network failure, non-OK responses, invalid responses, and missing language models produce user-safe translation failure states instead of crashing the socket handler.

Fallback shape:

```ts
{
  translatedText: null,
  translationMs: null,
  cacheHit: false,
  errorCode: "timeout",
  errorMessage: "Translation service timed out."
}
```

### Async Translation

The chat server saves and broadcasts the original message before translation finishes. This keeps chat responsive even when local translation is slow. A later `message_updated` event fills in the translated text or marks translation as failed.

### In-memory Rate Limiting

Socket.IO message sends are rate-limited per socket and per room. The defaults are 5 messages per socket and 30 messages per room every 10 seconds. This protects the local translation service during demos; production deployments should use a shared Redis-backed limiter.

### Validation First

The system validates input at multiple boundaries:

- frontend form validation
- Socket.IO message payload validation
- FastAPI schema validation for text length and supported languages
- room ID and invite token validation for room joins and history APIs

### Security Guard for Destructive API

Room-history deletion is intentionally disabled by default. This avoids exposing a destructive endpoint in normal local/demo runs and documents the difference between regular user behavior and admin actions.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Completed

- Server-created rooms with secure UUID room IDs and invite tokens
- Guest User model and Message-to-Room/User relationships in Prisma
- No automatic fallback to `room1`
- Invite links based on secure invite tokens
- Async translation flow with `receive_message` followed by `message_updated`
- Translation status tracking with `pending`, `completed`, and `failed`
- In-memory message rate limiting for sockets and rooms
- Argos model installation moved out of FastAPI startup
- Lightweight Japanese/English detection with unit tests
- Automatic scroll-to-bottom for new messages
- Local translation history and saved phrases in browser storage

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Known Limitations

- Authentication and user authorization are not implemented yet.
- Room invite tokens are required for invite links, but there is not yet a full membership table or per-user authorization policy.
- Rate limiting is in-memory, so it resets on server restart and is not shared across multiple server instances.
- The current language focus is English and Japanese.
- Argos Translate quality can vary, especially for short phrases, informal chat text, and ambiguous wording.
- Local development requires Argos model installation before translation is fully ready.
- Translation history and saved phrases are local to the current browser because authentication and user accounts are not implemented yet.
- The local PostgreSQL credentials in `.env.example` and `docker-compose.yml` are development credentials, not production credentials.
- Room deletion is a coarse admin operation, not a full permission model.
- Docker image builds can take time because Argos packages are installed during build.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Roadmap

- Add authentication and room ownership
- Add room membership and role-based permissions
- Add room list management for authenticated users
- Add message search
- Add user-level authorization for destructive actions
- Add retry translation action for failed translations
- Improve mobile UI polish
- Add more demo screenshots or GIFs
- Add support for more languages
- Add production deployment hardening
- Add more automated tests around pure validation and message handling logic

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Portfolio Highlights

TransChat demonstrates:

- full-stack development across frontend, backend, service, and database layers
- realtime communication with Socket.IO
- Room/User data modeling with secure invite-token room access
- async translation updates that keep original messages visible
- local AI/translation model integration through Argos Translate
- PostgreSQL persistence with Prisma
- Docker Compose orchestration for a multi-service app
- GitHub Actions CI across TypeScript and Python projects
- error handling around network calls and service failures
- in-memory rate limiting and destructive-action guards
- safe defaults for destructive API behavior
- maintainable frontend refactoring with components, hooks, and shared libraries
- practical documentation for setup, architecture, usage, APIs, and limitations

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## License

This project is currently intended for learning and portfolio purposes.

No formal open-source license has been added yet. If this project is reused, distributed, or published as an open-source project, an appropriate license such as the MIT License should be added.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Author

Developed by **akito uemura**

GitHub: [akitouemura-lab](https://github.com/akitouemura-lab)

Repository: [trans-chat](https://github.com/akitouemura-lab/trans-chat)

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>

## Summary

TransChat shows how realtime messaging, local translation, PostgreSQL persistence, Docker Compose, and CI can be combined into a practical full-stack application.

The project is intentionally small enough to understand, but complete enough to demonstrate real engineering concerns: service boundaries, validation, optimistic UI, safe fallbacks, destructive-action guards, and maintainable frontend structure.

<p align="right"><a href="#readme-navigation">Back to Table of Contents</a></p>
