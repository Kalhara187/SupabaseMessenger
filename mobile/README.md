# SQLRealtimeMessenger Mobile

React Native + Expo Android-first client for SQLRealtimeMessenger.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure backend URL:

- Use `.env.example` values or set `EXPO_PUBLIC_API_URL`.
- Android emulator backend default is `http://10.0.2.2:5000`.

3. Run app:

```bash
npm run android
```

## Implemented Modules

- Auth flow (login, register, forgot password, logout)
- Chat list and chat room
- Socket.IO realtime updates
- Group creation screen
- Search, profile, settings screens
- Notification permission bootstrap
