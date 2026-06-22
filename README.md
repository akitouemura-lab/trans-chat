# TransChat

**TransChat** is a real-time bilingual chat application that helps English and Japanese users communicate smoothly by translating messages directly inside the chat experience.

The project combines **real-time messaging**, **local machine translation**, and **persistent message storage** into a small full-stack system built with **Next.js**, **Node.js**, **Socket.IO**, **FastAPI**, **Argos Translate**, **PostgreSQL**, and **Prisma**.

---

## Table of Contents

* [Overview](#overview)
* [Core Concept](#core-concept)
* [Features](#features)
* [Tech Stack](#tech-stack)
* [Architecture](#architecture)
* [Project Structure](#project-structure)
* [Requirements](#requirements)
* [Quick Start](#quick-start)
* [Running the Application](#running-the-application)
* [Usage Examples](#usage-examples)
* [Development Commands](#development-commands)
* [Design Notes](#design-notes)
* [Roadmap](#roadmap)
* [Contributing](#contributing)
* [Limitations](#limitations)
* [License](#license)
* [Author](#author)

---

## Overview

Modern online communication often crosses language boundaries. However, many translation workflows still require users to leave the conversation, open a translation tool, copy and paste text, translate it, and then return to the chat.

**TransChat** solves this problem by embedding translation directly into the chat flow.

When a user sends a message, the system:

1. Receives the message in real time.
2. Detects whether the text is English or Japanese.
3. Sends the text to a local translation service.
4. Stores both the original and translated message.
5. Broadcasts the result to users in the same room.

This allows users to communicate across languages more naturally and quickly.

---


## Demo Video

The following video demonstrates the basic chat flow and real-time translation behavior of TransChat.



https://github.com/user-attachments/assets/bc564862-96a6-43ce-9edb-2756d3ee8cfc


---
## Core Concept

TransChat is designed around one simple idea:

> Make cross-language communication feel immediate, natural, and accessible.

The project focuses on:

* Reducing language barriers in chat communication.
* Avoiding paid translation APIs.
* Building a clear full-stack architecture.
* Separating responsibilities between frontend, backend, translation service, and database.
* Creating a portfolio-friendly project that is easy to understand and explain.

---

## Features

### Real-Time Chat

* Room-based real-time messaging
* Socket.IO-based bidirectional communication
* Instant message delivery
* Connection status display
* Separate layout for own messages and other users' messages

### Automatic Translation

* English to Japanese translation
* Japanese to English translation
* Simple language detection
* Local translation using Argos Translate
* Translation latency measurement
* No paid translation API required

### Persistent Message History

* PostgreSQL-based message storage
* Prisma ORM integration
* Room-specific message history
* Message reload after page refresh
* Original text and translated text stored together

### Service-Oriented Architecture

The application is divided into independent layers:

* Frontend
* Chat server
* Translation service
* Database

Each layer has a clear responsibility, making the project easier to debug, extend, and explain.

---

## Tech Stack

| Area                    | Technology                        |
| ----------------------- | --------------------------------- |
| Frontend                | Next.js, TypeScript, Tailwind CSS |
| Real-time Communication | Socket.IO                         |
| Backend                 | Node.js, Express, TypeScript      |
| Translation API         | Python, FastAPI, Uvicorn          |
| Translation Engine      | Argos Translate                   |
| Database                | PostgreSQL                        |
| ORM                     | Prisma                            |
| Package Manager         | pnpm                              |
| Local Infrastructure    | Docker Compose                    |
| Version Control         | Git, GitHub                       |

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

### Message Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Next.js Frontend
    participant Server as Node.js Chat Server
    participant Translate as FastAPI Translation Service
    participant DB as PostgreSQL

    User->>Frontend: Send message
    Frontend->>Server: Emit Socket.IO event
    Server->>Translate: Request translation
    Translate-->>Server: Return translated text
    Server->>DB: Save message
    Server-->>Frontend: Broadcast message
    Frontend-->>User: Display original and translated text
```

---

## Project Structure

```text
trans-chat/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── chat-server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── socket.ts
│   │   ├── routes/
│   │   └── services/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── translate-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── translator.py
│   │   └── schemas.py
│   └── requirements.txt
│
├── docker-compose.yml
├── start-dev.ps1
├── stop-dev.ps1
└── README.md
```

---

## Requirements

Before running the project, install the following tools:

* Node.js
* pnpm
* Python 3.11
* Docker Desktop
* Git

You can check your environment with the following commands:

```powershell
node -v
pnpm.cmd -v
py -0p
docker --version
docker compose version
git --version
```

---

## Quick Start

### 1. Clone the Repository

```powershell
git clone https://github.com/akitouemura-lab/trans-chat.git
cd trans-chat
```

### 2. Create the Environment File

Create a `.env` file inside the `chat-server` directory.

```powershell
New-Item -ItemType File -Path .\chat-server\.env
```

Add the following content:

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

### 4. Set Up the Chat Server

```powershell
cd chat-server
pnpm.cmd install
pnpm.cmd exec prisma generate
pnpm.cmd exec prisma migrate dev --name init_messages
cd ..
```

### 5. Set Up the Translation Service

```powershell
cd translate-service
py -3.11 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..
```

### 6. Set Up the Frontend

```powershell
cd frontend
pnpm.cmd install
cd ..
```

---

## Running the Application

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

After startup, open the frontend in your browser:

```text
http://localhost:3000
```

---

## Manual Start

You can also start each service manually.

### 1. Start PostgreSQL

```powershell
docker compose up -d postgres
```

### 2. Start the Translation Service

```powershell
cd translate-service
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 5000
```

### 3. Start the Chat Server

Open another terminal:

```powershell
cd chat-server
pnpm.cmd dev
```

### 4. Start the Frontend

Open another terminal:

```powershell
cd frontend
pnpm.cmd dev
```

Then open:

```text
http://localhost:3000
```

---

## Usage Examples

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

### Socket.IO Message Example

Client-side event:

```ts
socket.emit("send_message", {
  roomId: "room1",
  userName: "user1",
  text: "I want to build a web application."
});
```

Server-side broadcast payload:

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
  "createdAt": "2026-06-21T00:00:00.000Z"
}
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

The translation logic is separated from the Node.js chat server.

Instead of embedding translation directly into the real-time server, the chat server communicates with a dedicated FastAPI service over HTTP.

This makes the translation layer replaceable. In the future, Argos Translate could be replaced with another local model, an external translation API, or an LLM-based translation service.

### Real-Time First, Persistence Second

The system is designed to preserve real-time responsiveness while still storing messages in PostgreSQL.

Each message follows a clear pipeline:

```text
validate
  -> translate
  -> persist
  -> broadcast
```

This makes the message flow explicit and easier to debug.

### Failure-Tolerant Messaging

Translation may fail because of model limitations, service startup delay, or unsupported input.

The system is designed so that translation failure does not completely break the chat experience. The original message can still be handled, and fallback information can be displayed.

### Local-First Translation

Using Argos Translate makes the project suitable for learning, prototyping, and portfolio development without relying on paid translation APIs.

This local-first approach helps reduce cost and keeps the translation layer under developer control.

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

## Contributing

Contributions are welcome.

### How to Contribute

1. Fork this repository.
2. Create a feature branch.
3. Make your changes.
4. Run checks before committing.
5. Commit your changes.
6. Push your branch.
7. Open a pull request.

```powershell
git checkout -b feature/your-feature
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

For larger changes, please open an issue first to discuss the design direction.

### Contribution Guidelines

Please keep contributions clear, focused, and easy to review.

Recommended practices:

* Use meaningful commit messages.
* Keep pull requests small when possible.
* Add comments only when they improve readability.
* Update documentation when behavior changes.
* Avoid committing environment files such as `.env`.

---

## Limitations

This project currently focuses on architecture, real-time communication, translation integration, and database persistence.

Current limitations include:

* Translation quality may vary depending on the input text.
* Very short phrases may produce unstable translation results.
* The current language focus is English and Japanese.
* Docker Compose is mainly used for PostgreSQL.
* Frontend, chat server, and translation service are currently started through local commands or helper scripts.

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

TransChat demonstrates how real-time communication, local translation, and persistent storage can be combined into a practical full-stack web application.

The goal is simple:

> Make cross-language communication feel immediate, natural, and technically elegant.

