# Perfoumer (Next.js)

Premium və elegant ətir vitrin saytı. Dizayn istiqaməti Framer versiyasına bənzərdir: açıq fon, böyük hero, seçilmiş məhsullar və detal səhifəsində not strukturu.

## Tech Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- CSV data source (`data/`)

## Run

```bash
npm install
npm run dev
```

## Admin Panel

You can manage perfumes and notes from `/admin`.

### Env setup

Add these variables to your environment:

- `ADMIN_PASSWORD` (required)
- `ADMIN_USERNAME` (optional, default: `admin`)
- `ADMIN_SESSION_SECRET` (optional but recommended)

Example:

```bash
ADMIN_PASSWORD="strong-password"
ADMIN_USERNAME="admin"
ADMIN_SESSION_SECRET="long-random-secret"
```

### How it works

- Admin login is protected by an HTTP-only cookie session.
- Editable data is stored in:
	- `data/admin/perfumes.json`
	- `data/admin/notes.json`
- If admin JSON files do not exist yet, catalog data falls back to CSV in `data/`.

## Data Structure (CSV)

### 1) Perfumes CSV

Path: `data/perfumes.csv`

Required columns:

- `id`
- `slug`
- `name`
- `brand`
- `gender`
- `short_description`
- `long_description`
- `hero_image`
- `card_image`
- `price_15`
- `price_30`
- `price_50`
- `top_note_ids` (pipe-separated, example: `apple|cardamom`)
- `heart_note_ids` (pipe-separated)
- `base_note_ids` (pipe-separated)
- `best_seller` (`true`/`false`)

### 2) Notes CSV

Path: `data/notes.csv`

Required columns:

- `id`
- `name`
- `category` (`top` | `heart` | `base`)
- `image`
- `description`

## How join works

- Hər ətirdə `top_note_ids`, `heart_note_ids`, `base_note_ids` var.
- Hər ID `notes.csv` içindəki `id` ilə uyğunlaşdırılır.
- Bu join `src/lib/catalog.ts` daxilində edilir və detail page üçün `notes.top`, `notes.heart`, `notes.base` şəklində qaytarılır.

## Current pages

- `/` → Hero + best seller məhsullar
- `/perfumes/[slug]` → məhsul detalı + ölçü qiymətləri + not kartları

## Supabase migration (next step)

CSV ilə eyni schema saxlanılsa, keçid sadə olacaq:

- `perfumes` cədvəli → `perfumes.csv` sütunları
- `notes` cədvəli → `notes.csv` sütunları
- gələcəkdə `perfume_notes` pivot table əlavə edilə bilər (daha relational model üçün)

Bu quruluş intentionally modular saxlanıb ki, `src/lib/catalog.ts` içində CSV read hissəsi sonradan Supabase query ilə əvəzlənsin.

## Supabase Auth + Community Features

Project now includes:

- Email/password auth (Supabase Auth, free tier supported)
- Product comments with 1-5 rating
- Personal wishlist per logged-in user

### 1) Create Supabase project (free)

1. Go to Supabase and create a free project.
2. Open **Project Settings → API**.
3. Copy:
   - `Project URL`
   - `anon public` key

### 2) Add env variables

Add to `.env` (or `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
```

### 3) Create database tables and RLS policies

In Supabase SQL Editor, run:

- `supabase/schema.sql`

This creates:

- `public.comments`
- `public.wishlists`

and enables row-level security policies so each user can only manage their own wishlist/comments.

### 4) Where this is used in app

- Perfume detail page (`/perfumes/[slug]`):
  - email sign up/sign in
  - submit comment + rating
  - add/remove current perfume from wishlist
- Wishlist page (`/wishlist`):
  - view and remove saved perfumes

## SEO Planning

- Azerbaijani SEO cluster plan, title map, internal links, and submission checklist: [docs/seo/azerbaijani-seo-cluster-plan.md](docs/seo/azerbaijani-seo-cluster-plan.md)
- Azerbaijan link acquisition playbook (directories, media, influencers, collaborations): [docs/seo/link-acquisition-azerbaijan.md](docs/seo/link-acquisition-azerbaijan.md)
