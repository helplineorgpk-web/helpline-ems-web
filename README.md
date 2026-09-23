# Helpline EMS — Admin Dashboard

Next.js admin dashboard for Helpline Welfare Trust. Manage projects, employees, attendance, and daily reports.

Staff mobile app lives in a separate repo: [helpline-ems-mobile](https://github.com/helplineorgpk-web/helpline-ems-mobile).

## Setup

Requires a local MongoDB **replica set** on `127.0.0.1:27017` (Prisma needs this for upserts/transactions). Database `helplineems` is created automatically.

```bash
# Start MongoDB as a single-node replica set (once per machine)
mongod --dbpath=/path/to/data/db --replSet rs0 --bind_ip 127.0.0.1

# In mongosh (only the first time):
# rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] })

npm install
cp .env.example .env
npx prisma db push
npm run db:seed:admin   # admin only
# or: npm run db:seed   # full demo data (admin + employees + projects)
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
