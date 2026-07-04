# Brazilian Studio by Ali K — Rabat

Website and management platform for a beauty salon in Rabat-Agdal, Morocco. Combines a public marketing site, an online booking flow, a full admin back-office, and a client portal in a single Next.js app.

**Live:** https://brazilian-studio-rabat.vercel.app/

## Features

### Public site (French)
- Animated landing page (hero, services, gallery, before/after, testimonials) built with Framer Motion
- Multi-step online booking: service → date → time slot → client info, with real-time availability
- WhatsApp contact button and contact page

### Admin dashboard (staff only)
- Calendar with day/week views and appointment slide-over management
- Appointments: create, confirm, cancel, status tracking
- Clients directory with inline editing
- **Devis (quotes)**: line-item builder, PDF export with logo, send by email, convert to facture, duplicate, RDV date / advance payment / payment mode
- **Factures (invoices)**: PDF export, send by email, mark paid, cancel
- Pricing catalog (categories + items), products with low-stock alerts, sales recording and history
- Automated appointment reminders (cron + Resend email / WhatsApp)

### Client portal (espace-client)
- Passwordless access via magic link or secure token
- View and cancel appointments, consult devis and factures, edit profile

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database & Auth | Supabase (Postgres, RLS, magic links) |
| Emails | Resend |
| PDFs | @react-pdf/renderer |
| Animations | Framer Motion |
| Styling | CSS Modules + Tailwind |

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Resend keys
npm run dev
```

Open http://localhost:3000. Database schema and migrations live in `supabase/`.

## Deployment

Deployed on Vercel. See [DEPLOYMENT.md](DEPLOYMENT.md) for environment variables and the cron reminder setup.
