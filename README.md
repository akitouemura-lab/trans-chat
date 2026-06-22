# TransChat

**A real-time bilingual chat application with local English-Japanese translation, persistent message history, and Docker-based full-stack development.**

TransChat is a full-stack web application that helps English and Japanese users communicate smoothly by translating messages directly inside a real-time chat interface.

The project combines **real-time messaging**, **local machine translation**, **message persistence**, **translation caching**, and a **service-oriented architecture** built with **Next.js**, **Node.js**, **Socket.IO**, **FastAPI**, **Argos Translate**, **PostgreSQL**, **Prisma**, and **Docker Compose**.

---

## Demo Video

The following video demonstrates TransChat running locally, sending messages in real time, translating between English and Japanese, and preserving message history.

https://github.com/user-attachments/assets/bc564862-96a6-43ce-9edb-2756d3ee8cfc

---

## Overview

Modern online communication often crosses language boundaries. However, many translation workflows still require users to leave the conversation, open a translation tool, copy and paste text, translate it, and then return to the chat.

**TransChat** solves this problem by embedding translation directly into the chat flow.

When a user sends a message, the system:

1. Receives the message in real time.
2. Validates the room, user, and message data.
3. Determines the translation direction.
4. Sends the text to a local translation service.
5. Caches repeated translation results.
6. Stores both the original and translated message.
7. Broadcasts the result to users in the same room.

This allows users to communicate across languages more naturally and quickly.

---

## Core Concept

TransChat is designed around one simple idea:

> Make cross-language communication feel immediate, natural, and technically elegant.

The project focuses on:

* Reducing language barriers in chat communication.
* Avoiding paid translation APIs.
* Using local translation with Argos Translate.
* Building a clear full-stack architecture.
* Separating responsibilities between frontend, backend, translation service, and database.
* Creating a portfolio-friendly project that is easy to understand, run, and explain.

---

## Features

### Real-Time Chat

* Room-based real-time messaging
* Socket.IO-based bidirectional communication
* Instant message delivery
* Connection status display
* Message history loading per room
* Separate layout for own messages and other users' messages

### Translation

* English to Japanese translation
* Japanese to English translation
* Auto translation direction detection
* Manual translation direction selection

  * Auto detect
  * English → Japanese
  * Japanese → English
* Local translation using Argos Translate
* Translation latency display
* Translation direction badge
* Fallback display when translation is unavailable

### Translation Cache

* Reuses repeated translation results
* Reduces unnecessary calls to the translation service
* Improves response speed for duplicate messages
* Keeps the chat server more efficient during repeated use

### Message Persistence

* PostgreSQL-based message storage
* Prisma ORM integration
* Room-specific message history
* Message reload after page refresh
* Original and translated text stored together

### Improved User Interface

* App-like chat layout
* Fixed message input area at the bottom
* Sending status display
* Translating status display
* Room ID display in the header
* User name editing
* Room creation and room joining
* Light mode and dark mode toggle
* Character count validation
* Clean English UI for better portfolio presentation

### Validation and Error Handling

* Empty messages are rejected
* Message length is limited
* User name validation
* Room ID validation
* Invalid translation directions are rejected
* Original messages can still be handled even if translation fails

### Docker-Based Development

* Full-service Docker Compose setup
* Frontend container
* Chat server container
* Translation service container
* PostgreSQL container
* One-command startup for the full stack

---

## Tech Stack

| Area                    | Technology                               |
| ----------------------- | ---------------------------------------- |
| Frontend                | Next.js, React, TypeScript, Tailwind CSS |
| Real-time Communication | Socket.IO                                |
| Backend                 | Node.js, Express, TypeScript             |
| Translation API         | Python, FastAPI, Uvicorn                 |
| Translation Engine      | Argos Translate                          |
| Database                | PostgreSQL                               |
| ORM                     | Prisma                                   |
| Package Manager         | pnpm                                     |
| Infrastructure          | Docker Compose                           |
| Version Control         | Git, GitHub                              |

---

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

---

## Message Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Next.js Frontend
    participant Server as Node.js Chat Server
    participant Cache as Translation Cache
    participant Translate as FastAPI Translation Service
    participant DB as PostgreSQL

    User->>Frontend: Send message
    Frontend->>Server: Emit Socket.IO event
    Server->>Server: Validate payload
    Server->>Cache: Check cached translation
    alt Cache hit
        Cache-->>Server: Return cached translation
    else Cache miss
        Server->>Translate: Request translation
        Translate-->>Server: Return translated text
        Server->>Cache: Save translation result
    end
    Server->>DB: Save message
    Server-->>Frontend: Broadcast message
    Frontend-->>User: Display original and translated text
```

---

## Project Structure

```text
trans-chat/
|-- frontend/
|   |-- app/
|   |   |-- page.tsx
|   |   |-- layout.tsx
|   |   `-- globals.css
|   |-- Dockerfile
|   |-- .dockerignore
|   |-- pnpm-workspace.yaml
|   `-- package.json
|
|-- chat-server/
|   |-- src/
|   |   |-- index.ts
|   |   |-- socket.ts
|   |   |-- routes/
|   |   `-- services/
|   |       |-- db.ts
|   |       |-- translation.ts
|   |       `-- messageRepository.ts
|   |-- prisma/
|   |   |-- schema.prisma
|   |   `-- migrations/
|   |-- Dockerfile
|   |-- .dockerignore
|   |-- pnpm-workspace.yaml
|   `-- package.json
|
|-- translate-service/
|   |-- app/
|   |   |-- main.py
|   |   |-- translator.py
|   |   `-- schemas.py
|   |-- Dockerfile
|   |-- .dockerignore
|   `-- requirements.txt
|
|-- docker-compose.yml
|-- start-dev.ps1
|-- stop-dev.ps1
`-- README.md
```

---

## Requirements

Before running the project, install the following tools:

* Docker Desktop
* Git

For local non-Docker development, also install:

* Node.js
* pnpm
* Python 3.11

You can check your environment with:

```powershell
docker --version
docker compose version
git --version
node -v
pnpm.cmd -v
py -0p
```

---

## Quick Start

### 1. Clone the Repository

```powershell
git clone https://github.com/akitouemura-lab/trans-chat.git
cd trans-chat
```

### 2. Start All Services with Docker Compose

```powershell
docker compose up --build
```

This starts:

* Frontend: http://localhost:3000
* Chat server: http://localhost:4000
* Translation service: http://localhost:5000
* PostgreSQL: localhost:5432

The first build may take some time because the translation service installs Python dependencies and prepares Argos Translate.

### 3. Open the App

```text
http://localhost:3000
```

---

## Health Checks

### Chat Server

```powershell
curl.exe http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "chat-server"
}
```

### Translation Service

```powershell
curl.exe http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "translate-service"
}
```

---

## Stopping the Application

To stop all containers:

```powershell
docker compose down
```

To rebuild and start again:

```powershell
docker compose up --build
```

---

## Manual Local Development

Docker Compose is the recommended way to run the project.
However, each service can also be started manually.

### 1. Start PostgreSQL

```powershell
docker compose up -d postgres
```

### 2. Set Up the Chat Server

Create a `.env` file inside `chat-server`.

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
TRANSLATE_SERVICE_URL=http://localhost:5000
DATABASE_URL=postgresql://transchat:transchat_password@localhost:5432/transchat?schema=public
```

Then run:

```powershell
cd chat-server
pnpm.cmd install
pnpm.cmd exec prisma generate
pnpm.cmd exec prisma migrate dev
pnpm.cmd dev
```

### 3. Start the Translation Service

Open another terminal:

```powershell
cd translate-service
py -3.11 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 5000
```

### 4. Start the Frontend

Open another terminal:

```powershell
cd frontend
pnpm.cmd install
pnpm.cmd dev
```

Then open:

```text
http://localhost:3000
```

---

## Usage

### Join a Room

Enter a room ID and click **Join room**.

Room IDs can contain:

* Letters
* Numbers
* Hyphens
* Underscores

Example:

```text
room1
english-japanese
test_room
```

### Create a Room

Click **Create** to generate a random room ID.

### Send a Message

1. Enter your user name.
2. Select a translation direction.
3. Type a message.
4. Click **Send**.

The app displays:

* Original text
* Translated text
* Translation direction
* Translation time
* Cache status when applicable

---

## API Examples

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

### Delete Room Message History

```powershell
curl.exe -X DELETE http://localhost:4000/rooms/room1/messages
```

---

## Socket.IO Events

### Join Room

```ts
socket.emit("join_room", "room1");
```

### Send Message

```ts
socket.emit("send_message", {
  roomId: "room1",
  userName: "user1",
  text: "I want to build a web application.",
  translationDirection: "en-ja",
  clientMessageId: "client-message-id"
});
```

### Receive Message

```ts
socket.on("receive_message", (message) => {
  console.log(message);
});
```

Example payload:

```json
{
  "id": "uuid",
  "roomId": "room1",
  "userName": "user1",
  "originalText": "I want to build a web application.",
  "translatedText": "Webアプリケーションを作りたいです。",
  "sourceLang": "en",
  "targetLang": "ja",
  "translationMs": 95,
  "cacheHit": false,
  "createdAt": "2026-06-21T00:00:00.000Z"
}
```

### Message Status

```ts
socket.on("message_status", (payload) => {
  console.log(payload.status);
});
```

Possible statuses:

```text
translating
saved
error
```

---

## Development Commands

### Docker Compose

```powershell
docker compose up --build
docker compose down
docker compose ps
```

### Frontend

```powershell
cd frontend
pnpm.cmd dev
pnpm.cmd build
pnpm.cmd exec tsc --noEmit
```

### Chat Server

```powershell
cd chat-server
pnpm.cmd dev
pnpm.cmd type-check
pnpm.cmd exec prisma generate
pnpm.cmd exec prisma migrate dev
```

### Translation Service

```powershell
cd translate-service
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 5000
```

---

## Design Notes

### Service-Oriented Architecture

TransChat is divided into four main services:

```text
Frontend
  -> Chat Server
  -> Translation Service
  -> Database
```

Each service has a clear responsibility.

The frontend focuses on user experience.
The chat server handles real-time communication, validation, caching, and persistence.
The translation service provides local translation.
The database stores message history.

### Local-First Translation

The project uses Argos Translate instead of paid translation APIs.

This makes the system suitable for:

* Learning
* Prototyping
* Portfolio development
* Cost-free experimentation

### Translation Cache

Repeated messages do not always need to be translated again.

The chat server keeps a small in-memory translation cache.
This reduces repeated translation requests and improves response speed.

### Failure-Tolerant Messaging

Translation services can fail because of startup delays, unsupported input, or model limitations.

TransChat is designed so that one failed translation does not break the entire chat experience.

### Validation First

Incoming messages are validated before translation and persistence.

This helps prevent invalid room IDs, empty messages, oversized messages, and invalid translation directions from entering the system.

---

## Current Limitations

TransChat is a portfolio and learning project, not a production service.

Current limitations include:

* Translation quality depends on Argos Translate models.
* Very short phrases may produce unstable translation results.
* The current language focus is English and Japanese.
* Translation cache is in-memory and resets when the chat server restarts.
* There is no user authentication yet.
* There is no production deployment configuration yet.

---

## Roadmap

* [x] Real-time room-based chat
* [x] English-Japanese translation
* [x] Japanese-English translation
* [x] Persistent message history
* [x] Docker Compose setup for all services
* [x] Translation cache
* [x] Server-side validation
* [x] Improved chat UI
* [x] Room creation and joining
* [x] Light mode and dark mode
* [ ] User authentication
* [ ] Room list management
* [ ] Message search
* [ ] Support for more languages
* [ ] Production deployment configuration
* [ ] Automated tests
* [ ] CI improvements

---

## Portfolio Highlights

This project demonstrates:

* Full-stack web application development
* Real-time communication with Socket.IO
* Local AI/translation model integration
* REST API design
* WebSocket event design
* PostgreSQL database design
* Prisma ORM usage
* Docker Compose-based service orchestration
* Frontend UI/UX improvement
* Error handling and validation
* Git and GitHub workflow

---

## License

This project is currently intended for learning and portfolio purposes.

No formal open-source license has been added yet. If this project is reused, distributed, or published as an open-source project, an appropriate license such as the MIT License should be added.

---

## Author

Developed by **akito uemura**

GitHub: [akitouemura-lab](https://github.com/akitouemura-lab)

Repository: [trans-chat](https://github.com/akitouemura-lab/trans-chat)

---

## Summary

TransChat demonstrates how real-time communication, local translation, message caching, validation, persistent storage, and Docker-based service orchestration can be combined into a practical full-stack web application.

The goal is simple:

> Make cross-language communication feel immediate, natural, and technically elegant.
