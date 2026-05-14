# SQLRealtimeMessenger

Modern Android realtime chat application built with:

- React Native + Expo mobile client
- Node.js + Express backend
- MySQL database
- Socket.IO realtime events

## Project Structure

- `backend/` Express API, SQL models, auth, uploads, socket server
- `mobile/` Expo app with auth flow, chats, realtime socket client

## Core Features Included

- Registration, login, logout, profile fetch
- JWT authentication with protected routes
- Password hashing via bcryptjs
- SQL-safe queries using placeholders
- User listing/profile update
- One-to-one and group chat creation
- Realtime messages, typing, seen, online/offline status
- Media upload endpoints via Multer
- Android-first UI screens with responsive layout
- Push notification permission setup (Expo Notifications)

## Backend Setup

1. Create database and tables:

```bash
cd backend
mysql -u root -p < schema.sql
```

2. Configure environment:

- Copy `backend/.env.example` to `backend/.env`
- Set DB and JWT values

3. Start server:

```bash
cd backend
npm install
npm run dev
```

## Mobile Setup

1. Install dependencies:

```bash
cd mobile
npm install
```

2. Configure API URL:

- `mobile/.env.example` uses Android emulator default: `http://10.0.2.2:5000`
- Set `EXPO_PUBLIC_API_URL` if needed

3. Run on Android:

```bash
cd mobile
npm run android
```

Or start Expo dev server:

```bash
npm start
```

## Important Notes

- This baseline is scalable and modular, ready for advanced features like FCM push, voice/video, reactions, and E2E encryption.
- Forgot-password endpoint is scaffolded as a placeholder and should be connected to email/OTP provider.
