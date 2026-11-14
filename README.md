# Bazaar — MERN e-commerce starter
Needs Node 18+ and a MongoDB (Atlas free tier or local).

    cd server && cp .env.example .env   # set MONGO_URI and JWT_SECRET
    npm install && npm run dev          # API on :5000, auto-seeds 24 products + admin
    cd ../client && npm install && npm run dev   # site on http://localhost:5173

Admin login: admin@bazaar.test / admin123 (change it). Admin API: POST/PUT/DELETE /api/products, GET/PUT /api/admin/orders.
