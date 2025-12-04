# salaris.fyi 📈

> Discover salary insights and compensation data across top companies

Modern web app for transparent salary insights, now structured as a **frontend + backend** monorepo.

![Next.js](https://img.shields.io/badge/Next.js-16.0.0-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat-square&logo=tailwind-css)

## ✨ Features

- 🔍 **Advanced Filtering**: Filter by company, location, designation, and years of experience
- 📊 **Live Salary Table**: Min / max / average salary, with upvotes and comments
- 🧾 **User Submissions**: Add salary data via a modal, stored in Supabase and shown in the table
- 💬 **Comments & Votes**: Discuss and vote on individual salary entries
- 📱 **Responsive UI**: Optimized for desktop, tablet, and mobile

## 🧱 Monorepo Layout

```txt
salaris.fyi/
├── frontend/                        # Next.js app (UI + API routes)
│   ├── src/
│   │   ├── app/                     # Pages, layouts, API route handlers
│   │   ├── components/              # UI + containers (incl. AddSalaryModal)
│   │   ├── contexts/                # Auth / theme / language contexts
│   │   └── lib/                     # Frontend utilities and anon Supabase client
│   ├── public/                      # Static assets
│   ├── next.config.ts
│   ├── tsconfig.json                # Frontend TS config
│   └── package.json
├── backend/                         # Backend/domain logic & data tooling
│   ├── salaries/                    # Salary service + repository + types
│   ├── supabase/                    # Server-side Supabase client (service role)
│   ├── scrapper/                    # Scrapers + migrations + schema.sql
│   └── backend/database/            # SQL setup: database_setup, CHECK_DATABASE, etc.
└── tsconfig.json                    # Backend-only TS config (root)
```

## 🚀 Getting Started

### 1. Clone

```bash
git clone https://github.com/yourusername/salaris.fyi.git
cd salaris.fyi
```

### 2. Frontend setup (Next.js app)

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=your_web3forms_access_key
```

Run dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

### 3. Backend setup (Node tooling, optional)

Install backend Node dependencies:

```bash
cd backend
npm install
```

Notes:

- Backend TypeScript (services, repository, server Supabase client) uses the root `tsconfig.json`.
- Scraping and SQL scripts live under `backend/scrapper` and `backend/backend/database`.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a PR.

## 📝 License

Open source under the [MIT License](LICENSE).

