# Helpline EMS — Admin Dashboard

Next.js admin dashboard for Helpline Welfare Trust. Manage projects, employees, attendance, and daily reports.

Staff mobile app lives in a separate repo: [helpline-ems-mobile](https://github.com/helplineorgpk-web/helpline-ems-mobile).

## Setup

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3002](http://localhost:3002)

### Admin login
- Email: `admin@helpline.org`
- Password: `admin123`

### Demo employee (for the staff app)
- Email: `ahmed@helpline.org`
- Password: `Emp@123`

## Stack

- Next.js App Router + TypeScript
- Prisma + MongoDB
- JWT cookies for admin, Bearer JWT for employees
