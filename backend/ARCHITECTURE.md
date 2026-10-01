# Backend Layers

- **Routes:** ประกาศ HTTP path, method และ middleware สำหรับ auth, permission, validation หรือ rate limit เท่านั้น
- **Controllers:** รับ request, เรียก service และกำหนด HTTP response/status; ไม่มี business rules หรือ Prisma queries
- **Services:** รวม business logic, ตรวจเงื่อนไขโดเมน และเรียก Prisma เพื่ออ่าน/เขียนข้อมูล
- **Prisma:** เป็น data-access layer สำหรับติดต่อ PostgreSQL ผ่าน query/client

ภาพรวม: `Routes -> Controllers -> Services -> Prisma`
