# SMART STS — Setup Guide

## Files in this package

```
prisma/schema.prisma          ← Full database schema (all models)
server/index.js               ← Express server entry point
server/routes/supplier.js     ← Supplier CRUD API
server/routes/customer.js     ← Customer CRUD API
server/routes/product.js      ← Product CRUD API
src/api/axios.js              ← Frontend API helpers
src/pages/SupplierMaster.jsx  ← Supplier page (React)
src/pages/CustomerMaster.jsx  ← Customer page (React)
src/pages/ProductMaster.jsx   ← Product page (React)
```

---

## Step 1 — Install dependencies

```bash
# Backend
npm install express cors @prisma/client

# Dev
npm install --save-dev prisma nodemon

# Frontend
npm install axios
```

---

## Step 2 — Set up database

Create a `.env` file in your project root:

```env
# For PostgreSQL (online)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/smartsts"

# For SQLite (offline/local)
# DATABASE_URL="file:./local.db"
```

Change `schema.prisma` provider to `sqlite` for offline mode:
```prisma
datasource db {
  provider = "sqlite"   # ← change this
  url      = env("DATABASE_URL")
}
```

---

## Step 3 — Run migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Step 4 — Start the backend

```bash
node server/index.js
# or with auto-reload:
npx nodemon server/index.js
```

Server runs on: http://localhost:5000

---

## Step 5 — API Endpoints

### Supplier
| Method | URL | Action |
|--------|-----|--------|
| GET    | /api/suppliers | Get all |
| GET    | /api/suppliers/:id | Get one |
| GET    | /api/suppliers/generate/next-id | Get next SUP-XXXX |
| POST   | /api/suppliers | Create |
| PUT    | /api/suppliers/:id | Update |
| DELETE | /api/suppliers/:id | Delete |
| GET    | /api/suppliers/search/:query | Search |

### Customer
| Method | URL | Action |
|--------|-----|--------|
| GET    | /api/customers | Get all |
| GET    | /api/customers/generate/next-id | Get next CUST-XXXX |
| POST   | /api/customers | Create |
| PUT    | /api/customers/:id | Update |
| DELETE | /api/customers/:id | Delete |
| GET    | /api/customers/search/:query | Search |

### Product
| Method | URL | Action |
|--------|-----|--------|
| GET    | /api/products | Get all |
| POST   | /api/products | Create |
| PUT    | /api/products/:id | Update |
| DELETE | /api/products/:id | Delete |
| GET    | /api/products/search/:query | Search |
| GET    | /api/products/:id/items | Get items for product |

---

## Step 6 — Use in React

```jsx
import SupplierMaster from './pages/SupplierMaster';
import CustomerMaster from './pages/CustomerMaster';
import ProductMaster  from './pages/ProductMaster';

// In your router:
<Route path="/supplier"  element={<SupplierMaster />} />
<Route path="/customer"  element={<CustomerMaster />} />
<Route path="/product"   element={<ProductMaster />}  />
```

---

## Offline + Online sync tip

In `electron/main.js`:
```js
require('dns').lookup('google.com', (err) => {
  process.env.DATABASE_URL = err
    ? 'file:./local.db'                          // offline → SQLite
    : 'postgresql://user:pass@server/smartsts';  // online  → PostgreSQL
  require('./server/index');
});
```
