# 🍽️ TableTime — ระบบจองโต๊ะและบริหารจัดการร้านอาหาร

## บัญชีทดสอบ (รหัสผ่าน: Test1234)
| Email | บทบาท |
|---|---|
| customer@example.com | ลูกค้า |
| host@tabletime.app | พนักงานต้อนรับ |
| finance@tabletime.app | ฝ่ายการเงิน |
| stock@tabletime.app | ฝ่ายคลัง |
| manager@tabletime.app | ผู้จัดการ |
| owner@tabletime.app | เจ้าของร้าน |

## วิธีรัน
docker compose up -d
cd backend && npm run dev
cd frontend && npm run dev

## รัน Backend Tests

Backend tests ใช้ PostgreSQL แยก โดยชื่อฐานข้อมูลต้องมี segment `test` เช่น `tabletime_test`; ห้ามชี้ไปยัง development, UAT หรือ production database

```powershell
docker compose up -d db
docker compose exec db psql -U postgres -c "CREATE DATABASE tabletime_test;"
cd backend
$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/tabletime_test?schema=public"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:deploy
npm test
```

สร้างฐานข้อมูล `tabletime_test` ใน PostgreSQL ก่อนรัน หากมีอยู่แล้วไม่ต้องสร้างซ้ำ Vitest ปฏิเสธการเริ่มชุดทดสอบเมื่อไม่ได้ตั้ง `TEST_DATABASE_URL` หรือ URL ชี้ไปยังชื่อฐานข้อมูลที่ไม่มี segment `test` ชุดทดสอบลบเฉพาะข้อมูล fixtures ที่สร้างขึ้น CI สร้าง PostgreSQL service และ migrate ฐานทดสอบให้อัตโนมัติ
