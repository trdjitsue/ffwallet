# 💜 FF Wallet

> Advanced Educational Points System  
> React + Vite · Supabase · Vercel

---

## ✨ Features

- **Student**: ดูแต้มขนาดใหญ่, QR Code, แลกของรางวัล, เข้าร่วมกิจกรรม
- **Teacher**: ให้แต้มด้วย QR Scan หรือค้นหาชื่อ, สร้างกิจกรรม, จัดการร้านค้า
- **Admin**: ดูภาพรวมทั้งหมด, จัดการผู้ใช้, ปรับแต้ม, เปลี่ยน Role

---

## 🚀 Setup Guide

### 1. Clone & Install

```bash
git clone <your-repo>
cd ff-wallet
npm install
```

### 2. Setup Supabase

1. ไปที่ [supabase.com](https://supabase.com) → สร้าง project ใหม่
2. ไปที่ **SQL Editor** → วาง code จาก `supabase-schema.sql` แล้วกด Run
3. ไปที่ **Project Settings → API** → copy `URL` และ `anon public key`

### 3. Environment Variables

```bash
cp .env.example .env
```

แล้วแก้ไขค่าใน `.env`:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Supabase Auth Settings

ไปที่ **Authentication → Providers → Email**:
- ✅ Enable Email provider
- ❌ ปิด "Confirm email" (ไม่ต้องยืนยัน email เพราะเราใช้ username@ffwallet.local)

### 5. Run Dev Server

```bash
npm run dev
```

---

## 🌐 Deploy to Vercel

```bash
npm install -g vercel
vercel
```

หรือ connect GitHub repo ใน Vercel dashboard แล้วตั้ง Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 👤 สร้าง Admin คนแรก

หลังจาก deploy แล้ว:
1. สมัครสมาชิกผ่านหน้า Register ตามปกติ
2. ไปที่ Supabase → Table Editor → profiles
3. หาแถวของตัวเอง → แก้ไข `role` เป็น `admin`

---

## 📁 Project Structure

```
src/
├── components/
│   └── shared/
│       └── BottomNav.jsx       # Bottom navigation
├── hooks/
│   ├── useAuth.jsx             # Auth context & hook
│   └── useToast.jsx            # Toast notifications
├── lib/
│   └── supabase.js             # Supabase client
├── pages/
│   ├── LoginPage.jsx           # Login
│   ├── RegisterPage.jsx        # Register (3-step)
│   ├── student/
│   │   ├── StudentDashboard.jsx  # Big score display
│   │   ├── StudentQR.jsx         # QR Code display
│   │   ├── StudentShop.jsx       # Redeem rewards
│   │   └── StudentTests.jsx      # Join activities
│   ├── teacher/
│   │   ├── TeacherDashboard.jsx  # Teacher home
│   │   ├── TeacherAssignPoints.jsx # QR scan + manual
│   │   ├── TeacherTests.jsx      # Create/manage tests
│   │   └── TeacherShop.jsx       # Manage rewards
│   └── admin/
│       └── AdminDashboard.jsx    # Full admin control
├── styles/
│   └── global.css              # Global styles
└── App.jsx                     # Routes
```

---

## 🎨 Design System

- **Primary**: Violet `#6C3AF7`
- **Font**: Sora (EN) + Noto Sans Thai (TH) + Space Mono (numbers)
- **Theme**: Advanced Educational · Mobile-first
- **Mobile**: ออกแบบสำหรับโทรศัพท์ มี safe-area, bottom nav

---

## 📝 Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | ข้อมูลผู้ใช้ทุกคน (student/teacher/admin) |
| `point_transactions` | ประวัติการให้/ใช้แต้ม |
| `rewards` | ของรางวัลในร้าน |
| `redemptions` | การแลกของ (pending/approved/rejected) |
| `tests` | กิจกรรม/แบบทดสอบ |
| `test_completions` | การทำกิจกรรมเสร็จ |
