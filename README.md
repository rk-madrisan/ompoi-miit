# 🌰 Cashew Connect Suite

**Cashew Connect Suite** is a modern, full-stack web application built to simplify and digitize the cashew trading ecosystem.  
It enables **sellers**, **buyers**, and **admins** to manage operations efficiently — including order tracking, payments, sales analytics, and inventory.

---

## 🧩 Project Overview

This platform centralizes all essential operations for cashew businesses:
- **Seller Dashboard** for managing sales, payments, and order tracking.  
- **Admin Dashboard** for monitoring total revenue, orders, and analytics.  
- **Buyer Dashboard** for placing and tracking orders.  
- **Agent Dashboard** for managing logistics and communication.  
- Integrated **Supabase backend** for authentication and data management.

---

## 🚀 Key Features

### 🔐 Authentication
- Secure login and registration system using **Supabase Auth**
- Role-based routing with `ProtectedRoute.tsx`

### 🧾 Seller Features
- Manage cashew product listings (via `ProductImageUpload.tsx`)
- Track orders, payments, and sales analytics
- View sales history

### 🧮 Admin Features
- Access overall business analytics (`RevenueAnalytics.tsx`)
- Manage sellers, orders, and transactions
- Track payments and financial performance

### 📈 Analytics
- Dashboard visualizations using the `chart.tsx` component
- Revenue, sales, and performance metrics powered by Supabase data

### 🧩 Modular Component System
- UI powered by **shadcn/ui**
- Tailwind CSS for styling and responsiveness
- Reusable form, dialog, button, toast, and card components

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React (TypeScript) + Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **Build Tool** | Vite |
| **Language** | TypeScript |
| **Hosting** | Netlify / Vercel (Frontend) + Supabase (Backend) |

---

## 📁 Project Structure

cashew-connect-suite/
├── public/
│ ├── favicon.ico
│ ├── placeholder.svg
│ └── robots.txt
├── src/
│ ├── App.tsx
│ ├── main.tsx
│ ├── components/
│ │ ├── ProtectedRoute.tsx
│ │ ├── admin/
│ │ │ ├── OrderManagement.tsx
│ │ │ ├── PaymentTracking.tsx
│ │ │ └── RevenueAnalytics.tsx
│ │ ├── seller/
│ │ │ ├── OrderTracking.tsx
│ │ │ ├── ProductImageUpload.tsx
│ │ │ ├── PaymentTracking.tsx
│ │ │ ├── SalesAnalytics.tsx
│ │ │ └── SalesHistory.tsx
│ │ └── ui/
│ │ ├── button.tsx, card.tsx, dialog.tsx, input.tsx, table.tsx, ...
│ ├── hooks/
│ │ ├── useAuth.tsx
│ │ ├── use-mobile.tsx
│ │ └── use-toast.ts
│ ├── integrations/
│ │ └── supabase/
│ │ ├── client.ts
│ │ └── types.ts
│ ├── lib/
│ │ └── utils.ts
│ └── pages/
│ ├── AdminDashboard.tsx
│ ├── AgentDashboard.tsx
│ ├── BuyerDashboard.tsx
│ ├── SellerDashboard.tsx
│ ├── Auth.tsx
│ ├── Index.tsx
│ └── NotFound.tsx
└── supabase/
├── config.toml
└── migrations/
├── 20250920_.sql
├── 20250921_.sql
├── 20250923_.sql
├── 20250924_.sql
└── 20250926_*.sql



## ⚙️ Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/cashew-connect-suite.git
   cd cashew-connect-suite


Install dependencies

npm install


Set up environment variables
Create a .env file in the root and add your Supabase credentials:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key


Run the development server

npm run dev


Build for production

npm run build


Preview production build

npm run preview


🧑‍💻 Author

mohanraaj
riyaskhan
thasleem absar
nihaal
sameer