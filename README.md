<div align="center">
  <img width="120" height="120" alt="Hitzkideak Logo" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  <h1>Hitzkideak</h1>
  <p>Euskarazko sinonimoen eguneroko jokoa · Basque synonym game</p>
</div>

---

## 📋 Deskribapena · Description

**Hitzkideak** euskarazko sinonimoak ikasteko eta praktatzeko diseinatutako aplikazio interaktibo bat da. Jokalariek B1, B2, C1 edo C2 mailako hitzak ikasi eta sendotu ditzakete, joko moduan.

**Hitzkideak** is an interactive application designed to learn and practice Basque synonyms. Players can learn and strengthen vocabulary at B1, B2, C1, or C2 levels through gameplay.

---

## 🚀 Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

`Supabase` konfigurazioa aukerakoa da garapenean: kredentzialik gabe aplikazioa tokiko egoerarekin eta offline moduan abiatu daiteke.

---

## ⚙️ Requirements

- **Node.js** 18+
- **Supabase** backend (optional in local development, required for cloud sync)
- **Gemini API key** (optional, server-side only)

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional client-side pointer to the deployed proxy
VITE_GEMINI_PROXY_URL=https://your-project.vercel.app/api/gemini

# Server-side only, configured in Vercel
GEMINI_API_KEY=your_gemini_api_key
```

### Gemini Proxy

- The client must never embed the Gemini API key.
- Requests go through `api/gemini` as a Vercel Edge Function.
- In local development, you can leave `VITE_GEMINI_PROXY_URL` unset and use the same-origin `/api/gemini` route when AI features are wired in.
- If AI features are not enabled, Gemini variables can be omitted entirely.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Build | Vite 6 |
| Backend | Supabase (PostgreSQL + Auth) |
| PWA | vite-plugin-pwa |
| Animations | Motion |
| i18n | Basque (EU) |

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/           # Route pages
├── services/        # Business logic & API
├── types/          # TypeScript definitions
├── hooks/           # Custom React hooks
├── utils/           # Helper functions
└── lib/             # Core utilities (supabase, storage, env)
```

---

## 🎮 Features

- **Joko nagusia** - Main game with synonym questions
- **Saio azkarra** - Quick 5-question session
- **Errepasoa** - Spaced repetition review
- **Cloze testak** - Context-based fill-in-the-blank
- **Antolatzaileak** - Discourse markers (connectors)
- **Estatistikak** - Progress tracking & analytics
- **Gogokoak** - Favorite word groups
- **Mailak** - Level progression (B1 → B2 → C1 → C2 → Aditua)
- **Cloud sync** - Progress sync via Supabase

---

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run clean        # Remove dist/ in a cross-platform way
npm run lint         # TypeScript check
npm run lint:eslint  # ESLint on src/
npm run test:run     # Run tests once
```

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint:all` and `npm run test:run`
5. Submit a pull request
