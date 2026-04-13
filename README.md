# 🪴 PlantCare

En React Native app (Expo) der hjælper dig med at holde styr på dine planter med AI-scanning, vandingspåmindelser og årstidsjustering.

---

## Tech Stack

- **React Native** via Expo (iOS + Android)
- **Supabase** – auth, database, storage
- **RevenueCat** – subscription/betaling
- **Plant.id API** – AI-planteidentifikation
- **Expo Notifications** – push notifikationer

---

## Kom i gang

### 1. Klon og installer

```bash
git clone <repo>
cd plantcare
npm install
```

### 2. Sæt miljøvariabler op

```bash
cp .env.example .env
```

Udfyld `.env` med dine nøgler (se `.env.example` for vejledning).

### 3. Opret Supabase database

1. Gå til [supabase.com](https://supabase.com) → dit projekt → **SQL Editor**
2. Kopier og kør hele indholdet af `supabase_migration.sql`
3. Det opretter alle tabeller, RLS-politikker, triggers og storage bucket

### 4. Konfigurér RevenueCat

1. Gå til [app.revenuecat.com](https://app.revenuecat.com)
2. Opret projekt **PlantCare**
3. Tilføj iOS App + Android App
4. Opret et **Offering** med ID: `premium_monthly`
5. Opret et **Package** med ID: `$rc_monthly`
6. Tilknyt dit produkt (29 DKK/md) fra App Store Connect / Google Play Console
7. Kopiér dine public API keys til `.env`

### 5. Start appen

```bash
npx expo start
```

Scan QR-koden med Expo Go på din telefon, eller tryk `i` for iOS simulator / `a` for Android emulator.

---

## Projektstruktur

```
plantcare/
├── app/                        # Expo Router screens
│   ├── (auth)/                 # Login, signup, onboarding
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Onboarding/splash
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/                 # Hovednavigation
│   │   ├── _layout.tsx         # Tab bar
│   │   ├── index.tsx           # Hjem – planteliste
│   │   ├── calendar.tsx        # Vandingskalender
│   │   └── settings.tsx        # Indstillinger + konto
│   ├── plant/[id].tsx          # Planteprofil
│   ├── add-plant.tsx           # Tilføj plante (modal)
│   ├── premium.tsx             # Paywall (modal)
│   └── _layout.tsx             # Root layout
│
├── src/
│   ├── components/
│   │   ├── ui.tsx              # Button, Input, Card, Badge, etc.
│   │   └── PlantCard.tsx       # Plantekort til listen
│   ├── constants/
│   │   └── theme.ts            # Farver, typography, spacing
│   ├── hooks/
│   │   ├── useAuth.tsx         # Auth context + hook
│   │   └── usePlants.ts        # Plant CRUD + state
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── plantId.ts          # Plant.id API integration
│   │   ├── purchases.ts        # RevenueCat integration
│   │   ├── notifications.ts    # Expo Notifications
│   │   └── plantUtils.ts       # Vandingslogik, årstider
│   └── types/
│       └── database.ts         # TypeScript typer
│
├── supabase_migration.sql      # Kør i Supabase SQL Editor
├── .env.example                # Skabelon for miljøvariabler
└── app.json                    # Expo konfiguration
```

---

## Features

| Feature | Gratis | Premium |
|---------|--------|---------|
| Planter | 3 | Ubegrænset |
| AI-scanninger | 3/md | Ubegrænset |
| Vandingspåmindelser | ✅ | ✅ |
| Vandingskalender | ✅ | ✅ |
| Årstidsjustering | ✅ | ✅ |
| Vandingshistorik | ✅ | ✅ |

---

## Årstidsjustering

Vandingsintervallet justeres automatisk baseret på årstid (nordlig halvkugle):

| Årstid | Standard multiplier | Effekt |
|--------|--------------------|----|
| Forår 🌸 (mar–maj) | ×1.0 | Normal |
| Sommer ☀️ (jun–aug) | ×0.8 | Vand 20% oftere |
| Efterår 🍂 (sep–nov) | ×1.2 | Vand 20% sjældnere |
| Vinter ❄️ (dec–feb) | ×1.5 | Vand 50% sjældnere |

Multipliers kan justeres per plante i databasen.

---

## Build til produktion

```bash
# Installer EAS CLI
npm install -g eas-cli

# Log ind på Expo
eas login

# Konfigurér EAS
eas build:configure

# Byg til iOS
eas build --platform ios

# Byg til Android
eas build --platform android
```

Husk at opdatere `bundleIdentifier` (iOS) og `package` (Android) i `app.json` til dit eget.

---

## Nøgler du skal bruge

| Service | Hvor finder du den |
|---------|-------------------|
| `SUPABASE_URL` | supabase.com → Settings → API |
| `SUPABASE_ANON_KEY` | supabase.com → Settings → API |
| `PLANT_ID_API_KEY` | plant.id → Dashboard → API Keys |
| `REVENUECAT_IOS_KEY` | app.revenuecat.com → Project → API Keys |
| `REVENUECAT_ANDROID_KEY` | app.revenuecat.com → Project → API Keys |
