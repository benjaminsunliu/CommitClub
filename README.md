# CommitClub

CommitClub is an HCI prototype that helps students stay consistent with daily habits through supportive group accountability instead of pressure-driven streak systems.

## Team Members
| Name | Student ID| 
|-----------------|-----------------|
| Benjamin Liu | 40280899 |
| Gregory Sacciadis | 40207512 |
| Moeid Abbasi | 40201670 |
| William White | 40135771 |

## Tech Stack

### Frontend

- **React Native** for cross-platform mobile app development
- **Expo** for development tooling, native integrations, and rapid prototyping

### Backend / Services

- **Firebase Authentication** for user sign-in and sign-up
- **Cloud Firestore** for storing user, habit, and pod data

## Setup

1. Clone the repository:

```bash
git clone https://github.com/benjaminsunliu/CommitClub.git
cd CommitClub
```

2. Install dependencies:

```bash
npm install
```

3. Create a local env file:

```bash
cp .env.example .env
```

4. Set your Firebase API key in `.env`:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
```

## Run the project

Start the Expo dev server:

```bash
npm run start
```

You can also run the app on the platform you want:

- `npm run ios`
- `npm run android`
- `npm run web`

## Notes

- You’ll need a working local Expo environment for iOS/Android, or Expo Go for device testing.
- Firebase is already configured in the app code, but the project expects a valid `EXPO_PUBLIC_FIREBASE_API_KEY` at runtime.
