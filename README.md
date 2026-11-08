# Mphatso Registry App

A modern, responsive registry and contribution management application built with Next.js, TypeScript, Tailwind CSS v4, Drizzle ORM, and Capacitor for Android.

---

## 🎨 Color Palette & Theme
The application features a sophisticated earthy and warm color scheme:
- **Burgundy (`#800020`)**: Primary accent, action buttons, and focus rings.
- **Army Green (`#4B5320`)**: Secondary highlights and badge accents.
- **Coffee Brown (`#6f4e37`)**: Sidebar navigation, borders, and structural tones.
- **Beige (`#F5F5DC` & `#FAF8F2`)**: Warm paper background and card surfaces.

---

## 🛠️ Tech Stack
- **Framework**: [Next.js App Router](file:///Users/muntangaarts/StudioProjects/impahla/app) with [React](file:///Users/muntangaarts/StudioProjects/impahla/package.json)
- **Styling**: [Tailwind CSS v4](file:///Users/muntangaarts/StudioProjects/impahla/app/globals.css)
- **Database & ORM**: MySQL with [Drizzle ORM](file:///Users/muntangaarts/StudioProjects/impahla/lib/db/schema.ts)
- **Mobile Wrapper**: [Capacitor](file:///Users/muntangaarts/StudioProjects/impahla/capacitor.config.ts) (`@capacitor/android`)

---

## 🚀 Getting Started & Testing Instructions

### Prerequisites
- **Node.js** (v20+ recommended, v22+ recommended for Capacitor CLI)
- **pnpm** (Package Manager)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production & Type Checking
```bash
pnpm build
```
To run TypeScript type validation:
```bash
npx tsc --noEmit
```

### 4. Running on Android (Capacitor)
Sync web assets to the native Android project:
```bash
pnpm cap:sync
```
Open the Android project in Android Studio:
```bash
pnpm cap:open
```
