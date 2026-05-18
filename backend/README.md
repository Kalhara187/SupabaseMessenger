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

The server binds to `0.0.0.0` and logs the detected LAN IPs plus the health check URL on startup.

## API Endpoints

- GET `/api/health`
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

## Mobile Networking

- Use `localhost` or `127.0.0.1` only when the client and server are on the same machine.
- Use `10.0.2.2` from the Android emulator to reach the host machine.
- Use a LAN IP such as `192.168.x.x` from a physical Android device.
- If Wi-Fi changes and the computer gets a new IP, update `mobile/.env` and restart the Expo client.
