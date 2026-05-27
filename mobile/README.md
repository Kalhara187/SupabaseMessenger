# SQLRealtimeMessenger Mobile

React Native + Expo Android-first client for SQLRealtimeMessenger.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure backend URL:

- Set a single `EXPO_PUBLIC_API_URL` in `mobile/.env`.
- Android emulator backend default is `http://10.0.2.2:5000`.
- Physical Android device should use your computer's LAN IP, for example `http://192.168.8.111:5000`.
- If Wi-Fi changes and the computer gets a new IP, update that one value and reload the app.

3. Run app:

```bash
npm run android
```

## Implemented Modules

- Auth flow (login, register, forgot password, logout)
- Chat list and chat room
- Socket.IO realtime updates
- Users list with search, online status, and last seen
- Private one-to-one chat with typing indicators and read receipts
- Group creation screen
- Search, profile, settings screens
- Notification permission bootstrap

## Networking Notes

- `localhost` and `127.0.0.1` point to the device itself, not your computer, on a physical Android device.
- `10.0.2.2` points to the host machine from the Android emulator.
- A LAN IP like `192.168.x.x` works for a physical device when both devices are on the same network.
- The app checks `GET /api/health` before auth requests, so network failures fail fast with a clearer message.
