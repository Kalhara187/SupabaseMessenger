# SQLRealtimeMessenger Backend

Node.js + Express + MySQL + Socket.IO backend for realtime messaging.

## Setup

1. Copy `.env.example` to `.env` and fill in DB/JWT values.
2. Create database/tables:

```bash
mysql -u root -p < schema.sql
```

3. Install dependencies:

```bash
npm install
```

4. Run dev server:

```bash
npm run dev
```

## API Endpoints

- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/profile`
- POST `/api/auth/forgot-password`
- GET `/api/chats`
- POST `/api/chats`
- GET `/api/messages/:chatId`
- POST `/api/messages`
- POST `/api/messages/seen`
- DELETE `/api/messages/:id`
- GET `/api/users`
- GET `/api/users/:id`
- PUT `/api/users/:id`

## Socket Events

- `connection`
- `disconnect`
- `send_message`
- `receive_message`
- `typing`
- `stop_typing`
- `message_seen`
- `user_online`
- `user_offline`
