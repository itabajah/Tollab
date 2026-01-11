# טולאב (Tollab) - Next.js

מערכת לניהול לימודים לסטודנטים בטכניון. גרסה חדשה מבוססת React ו-Next.js.

## 🚀 טכנולוגיות

| קטגוריה | טכנולוגיה |
|---------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **שפה** | TypeScript |
| **עיצוב** | Tailwind CSS + shadcn/ui |
| **ניהול State** | Zustand |
| **אימות וסנכרון** | Firebase (Auth + Realtime DB) |
| **טפסים** | React Hook Form + Zod |
| **אייקונים** | Lucide React |

## ✨ יכולות

- **ניהול סמסטרים** - יצירה, עריכה ומחיקה של סמסטרים
- **ניהול קורסים** - מידע מלא על קורסים, מרצים, מיקום, ציונים ועוד
- **מערכת שעות** - תצוגה שבועית עם אינדיקטור זמן נוכחי
- **ניהול הקלטות** - לשוניות מרובות, מעקב צפייה, תצוגה מקדימה של וידאו
- **ניהול מטלות** - מעקב תאריכי הגשה, סימון השלמה, קישורים והערות
- **טיקר הודעות** - הודעות חכמות לפי הקשר (מטלות בקרוב, מבחנים, התקדמות)
- **סנכרון ענן** - התחברות עם Google וסנכרון בין מכשירים
- **ייבוא/ייצוא** - תמיכה ב-ICS (Cheesefork), JSON, YouTube playlists
- **ערכות נושא** - מצב בהיר/כהה עם תמיכה בהעדפות מערכת

## 🛠️ התקנה

```bash
# Clone the repo
cd tollab-next

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your Firebase config (optional for cloud sync)

# Run development server
npm run dev
```

## 📁 מבנה הפרויקט

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css         # Tailwind + CSS Variables
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main dashboard
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── header.tsx          # App header with theme toggle
│   ├── header-ticker.tsx   # Smart message ticker
│   ├── semester-selector.tsx
│   ├── course-list.tsx
│   ├── course-card.tsx
│   ├── course-modal.tsx    # Course editing modal
│   ├── weekly-calendar.tsx # Weekly schedule view
│   ├── homework-sidebar.tsx
│   ├── confirm-dialog.tsx
│   └── prompt-dialog.tsx
├── hooks/                  # Custom React hooks
│   └── use-firebase-sync.ts
├── lib/                    # Utility functions
│   ├── firebase.ts         # Firebase client
│   ├── validation.ts       # Zod schemas
│   ├── import-export.ts    # ICS & JSON handling
│   ├── video-fetch.ts      # YouTube/Panopto utilities
│   └── utils.ts            # General utilities
├── stores/                 # Zustand stores
│   ├── data-store.ts       # App data (semesters, courses, etc.)
│   ├── ui-store.ts         # UI state (modals, editing)
│   └── profile-store.ts    # Profile management
└── types/                  # TypeScript types
    └── index.ts
```

## 🔧 סקריפטים

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

## 🔥 הגדרת Firebase (אופציונלי)

1. צור פרויקט ב-[Firebase Console](https://console.firebase.google.com/)
2. הפעל Authentication עם Google Sign-In
3. הפעל Realtime Database
4. העתק את פרטי ההגדרות ל-`.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

## 📝 שינויים מהגרסה הקודמת

### מה חדש
- ✅ React components במקום vanilla JS
- ✅ TypeScript עם type safety מלא
- ✅ Zustand לניהול state
- ✅ shadcn/ui לקומפוננטות UI
- ✅ Zod לvalidation
- ✅ App Router של Next.js
- ✅ Server-side rendering (SSR) ready

### נשמר
- 🔄 אותו מבנה נתונים (תאימות לאחור)
- 🔄 אותו flow משתמש
- 🔄 אותן פונקציות ייבוא/ייצוא
- 🔄 תמיכה מלאה ב-RTL

## 📜 רישיון

MIT License