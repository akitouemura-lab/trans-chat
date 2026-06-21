

# TransChat

**A real-time bilingual chat application powered by local translation and a service-oriented architecture.**

TransChat is a full-stack web application that enables real-time communication between English and Japanese users.

It combines realtime messaging, local machine translation, and persistent message history into a compact, extensible system built with Next.js, Socket.IO, FastAPI, Argos Translate, PostgreSQL, and Prisma.

---

## Demo Video

The demo below shows TransChat running locally, sending messages in real time, translating between English and Japanese, and preserving message history.

https://github.com/user-attachments/assets/fb0062d0-4713-4cc3-b4bd-af9b521339eb

---

## Overview

Modern online communication often crosses language boundaries. However, common translation workflows are still fragmented.

Users often need to copy a message, open a translation tool, paste the text, translate it, and then return to the conversation.

TransChat solves this by embedding translation directly into the chat experience.

When a user sends a message, the system detects whether the text is English or Japanese, sends it to a local translation service, stores both the original and translated text, and broadcasts the result to the room in real time.

---

## Core Value

TransChat is not just a chat UI.

It is designed as a small service-oriented full-stack system with clearly separated responsibilities:

* Realtime communication
* Local translation processing
* Database persistence
* Frontend interaction
* Developer-friendly local startup

This architecture makes the project easy to understand, maintain, extend, and explain as a technical portfolio project.

---

## Key Features

### Real-time Chat

* Room-based realtime messaging
* Socket.IO-based bidirectional communication
* Instant message delivery
* Connection status display
* Separate UI layout for own messages and other users' messages

### Automatic Translation

* English to Japanese translation
* Japanese to English translation
* Simple language detection
* Translation latency measurement
* Local translation using Argos Translate
* No paid translation API required

### Persistent Message History

* PostgreSQL-based message storage
* Prisma ORM integration
* Room-specific message history
* Message reload after page refresh
* Original text and translated text stored together

### Service-Oriented Design

The application is split into independent layers:

* Frontend
* Chat server
* Translation service
* Database

Each layer has a focused responsibility, which keeps the system easier to debug and extend.

---

## Architecture

```mermaid
flowchart LR
    Browser[Browser / Next.js UI]
    ChatServer[Node.js Chat Server]
    TranslateService[FastAPI Translate Service]
    TranslationEngine[Argos Translate]
    Database[(PostgreSQL)]

    Browser <--> ChatServer
    ChatServer --> TranslateService
    TranslateService --> TranslationEngine
    ChatServer --> Database
    Database --> ChatServer
```

---

## Tech Stack

| Area                   | Technology                        |
| ---------------------- | --------------------------------- |
| Frontend               | Next.js, TypeScript, Tailwind CSS |
| Realtime Communication | Socket.IO                         |
| Backend                | Node.js, Express, TypeScript      |
| Translation API        | Python, FastAPI, Uvicorn          |
| Translation Engine     | Argos Translate                   |
| Database               | PostgreSQL                        |
| ORM                    | Prisma                            |
| Package Manager        | pnpm                              |
| Local Infrastructure   | Docker Compose for PostgreSQL     |
| Version Control        | Git, GitHub                       |

---

## Project Structure

```text
trans-chat/
|-- frontend/
|   |-- app/
|   |-- package.json
|   `-- ...
|-- chat-server/
|   |-- src/
|   |   |-- index.ts
|   |   |-- socket.ts
|   |   `-- services/
|   |-- prisma/
|   |   `-- schema.prisma
|   `-- package.json
|-- translate-service/
|   |-- app/
|   |   |-- main.py
|   |   |-- translator.py
|   |   `-- schemas.py
|   `-- requirements.txt
|-- docker-compose.yml
|-- start-dev.ps1
|-- stop-dev.ps1
`-- README.md
```

---

## How It Works

### Message Flow

```text
User sends a message
  -> Frontend emits a Socket.IO event
  -> Chat server receives and validates the message
  -> Chat server requests translation from FastAPI
  -> Translate service translates text using Argos Translate
  -> Chat server saves the message to PostgreSQL
  -> Chat server broadcasts the message to the room
  -> Frontend renders original text, translated text, and metadata
```

---

## Database Model

The main message model stores both the original message and the translated result.

```prisma
model Message {
  id             String   @id @default(uuid())
  roomId         String
  userName       String
  originalText   String
  translatedText String?
  sourceLang     String?
  targetLang     String?
  translationMs  Int?
  createdAt      DateTime @default(now())

  @@index([roomId, createdAt])
}
```

---

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
  "service": "translate-service"
}
```

### Fetch Room Message History

```powershell
curl.exe http://localhost:4000/rooms/room1/messages
```

Example response:

```json
{
  "messages": [
    {
      "id": "uuid",
      "roomId": "room1",
      "userName": "user1",
      "originalText": "Hello, how are you?",
      "translatedText": "こんにちは、お元気ですか？",
      "sourceLang": "en",
      "targetLang": "ja",
      "translationMs": 120,
      "createdAt": "2026-06-21T00:00:00.000Z"
    }
  ]
}
```

---

## Socket.IO Example

Client-side message event:

```ts
socket.emit("send_message", {
  roomId: "room1",
  userName: "user1",
  text: "I want to build a web application."
});
```

Server-side broadcast payload:

```ts
{
  id: "uuid",
  roomId: "room1",
  userName: "user1",
  originalText: "I want to build a web application.",
  translatedText: "Webアプリケーションを作りたいです。",
  sourceLang: "en",
  targetLang: "ja",
  translationMs: 95,
  createdAt: "2026-06-21T00:00:00.000Z"
}
```

---

## Quick Start

### Requirements

Install the following tools:

* Node.js
* pnpm
* Python 3.11
* Docker Desktop
* Git

Check your environment:

```powershell
node -v
pnpm.cmd -v
py -0p
docker --version
docker compose version
git --version
```

---

## Installation

### 1. Clone the Repository

```powershell
git clone https://github.com/akitouemura-lab/trans-chat.git
cd trans-chat
```

### 2. Create Environment File

Create `chat-server/.env`:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
TRANSLATE_SERVICE_URL=http://localhost:5000
DATABASE_URL=postgresql://transchat:transchat_password@localhost:5432/transchat?schema=public
```

### 3. Start PostgreSQL

```powershell
docker compose up -d postgres
```

### 4. Setup Chat Server

```powershell
cd chat-server
pnpm.cmd install
pnpm.cmd exec prisma generate
pnpm.cmd exec prisma migrate dev --name init_messages
```

### 5. Setup Translation Service

```powershell
cd ../translate-service
py -3.11 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 6. Setup Frontend

```powershell
cd ../frontend
pnpm.cmd install
```

---

## Running the Project

### Easy Start for Windows

This repository includes helper scripts for local development.

Start all services:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Stop all services:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-dev.ps1
```

After startup, open:

```text
http://localhost:3000
```

---

## Manual Start

If you prefer to start each service manually, use the following commands.

### PostgreSQL

```powershell
docker compose up -d postgres
```

### Translation Service

```powershell
cd translate-service
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 5000
```

### Chat Server

```powershell
cd chat-server
pnpm.cmd dev
```

### Frontend

```powershell
cd frontend
pnpm.cmd dev
```

---

## Development Commands

### Frontend

```powershell
cd frontend
pnpm.cmd dev
pnpm.cmd build
```

### Chat Server

```powershell
cd chat-server
pnpm.cmd dev
pnpm.cmd type-check
```

### Translation Service

```powershell
cd translate-service
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 5000
```

### Database

```powershell
docker compose up -d postgres
docker compose down
```

---

## Design Notes

### Translation as an Independent Service

The translation logic is intentionally isolated from the Node.js chat server.

Instead of embedding translation directly into the realtime server, the chat server communicates with a dedicated FastAPI service over HTTP.

This makes the translation layer replaceable. Argos Translate could later be replaced with another local model, an external API, or an LLM-based translation service.

### Realtime First, Persistence Second

The system is designed to preserve realtime responsiveness while still storing messages in PostgreSQL.

Each message follows a clear pipeline:

```text
validate
  -> translate
  -> persist
  -> broadcast
```

This approach makes the message flow explicit and easier to debug.

### Failure-Tolerant Messaging

Translation may fail due to model limitations, service startup delay, or unsupported input.

The system is designed so that a translation failure does not completely break the chat experience. The original message can still be handled, and fallback information can be displayed.

### Local-First Translation

Using Argos Translate makes the project suitable for learning, prototyping, and portfolio development without relying on paid translation APIs.

This local-first approach helps reduce cost and keeps the translation layer under developer control.

---

## Screenshots

### Chat UI

A screenshot can be added here:

```markdown
![Chat UI](docs/images/chat-screen.png)
```

Recommended path:

```text
docs/images/chat-screen.png
```

<<<<<<< HEAD
## Demo Video

Click the preview below to watch the TransChat demo video.

[![TransChat Demo](docs/images/chat-screen.png)](docs/videos/demo.mp4)

If the preview image is not displayed, open the video directly:

[Watch demo video](docs/videos/demo.mp4)


https://github.com/user-attachments/assets/fb0062d0-4713-4cc3-b4bd-af9b521339eb


=======
>>>>>>> b226c57 (Finalize README)
---

## Roadmap

* [ ] Improve translation quality for short phrases
* [ ] Add user authentication
* [ ] Add room list management
* [ ] Add message search
* [ ] Add translation cache
* [ ] Add support for more languages
* [ ] Add Docker Compose support for frontend, chat server, and translation service
* [ ] Add production deployment configuration
* [ ] Add demo screenshots and GIFs
* [ ] Improve mobile UI

---

## Contribution

Contributions are welcome.

1. Fork this repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

```powershell
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
```

For larger changes, please open an issue first to discuss the design direction.

---

## Limitations

This project currently focuses on architecture, realtime communication, translation integration, and database persistence.

Translation quality may vary, especially for very short words or phrases. Longer sentences generally produce more stable translation results.

At the moment, Docker Compose is mainly used for PostgreSQL. Frontend, chat server, and translation service are started through local development commands or helper scripts.

---

## License

This project is currently intended for learning and portfolio purposes.

If this project is reused or distributed, an appropriate license should be added.

---

## Author

Developed by **akito uemura**

GitHub: [akitouemura-lab](https://github.com/akitouemura-lab)

---

## Summary

TransChat demonstrates how realtime communication, local translation, and persistent storage can be combined into a practical full-stack application.

The goal is simple:

**Make cross-language communication feel immediate, natural, and technically elegant.**
