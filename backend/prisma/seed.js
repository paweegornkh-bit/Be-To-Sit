import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const ZONES = ['โซน A – ริมหน้าต่าง', 'โซน B – กลางร้าน', 'โซน C – สวนกลางแจ้ง', 'โซน VIP'];
const SLOTS = ['11:00', '13:00', '17:00', '19:00', '21:00'];

async function main() {
  console.log('🌱 Seeding...');
  const hash = await bcrypt.hash('Test1234', 12);

  const users = await Promise.all([
    ['owner@tabletime.app',   'สมชาย เจ้าของร้าน', 'OWNER'],
    ['manager@tabletime.app', 'สุดา ผู้จัดการ',    'MANAGER'],
    ['host@tabletime.app',    'ปิยะ ต้อนรับ',      'STAFF_HOST'],
    ['finance@tabletime.app', 'วรรณา การเงิน',     'STAFF_FINANCE'],
    ['stock@tabletime.app',   'อนันต์ คลังสินค้า', 'STAFF_STOCK'],
    ['customer@example.com',  'มานี ลูกค้า',       'CUSTOMER']
  ].map(([email, fullName, role], i) => prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, fullName, role, passwordHash: hash, phone: `08100000${10 + i}` }
  })));

  const zones = await Promise.all(ZONES.map((name) =>
    prisma.zone.upsert({ where: { name }, update: {}, create: { name } })));

  const tables = [];
  for (const [zi, z] of zones.entries()) {
    for (let i = 1; i <= 10; i++) {
      const no = `${String.fromCharCode(65 + zi)}${String(i).padStart(2, '0')}`;
      tables.push(await prisma.table.upsert({
        where: { tableNo: no }, update: {},
        create: { zoneId: z.id, tableNo: no,
                  seats: [2, 4, 4, 6, 8][i % 5],
                  posX: (i % 5) * 140 + 40, posY: Math.floor(i / 5) * 140 + 40 }
      }));
    }
  }

  const cats = await Promise.all(['อาหารจานหลัก','ของทานเล่น','เครื่องดื่ม','ของหวาน']
    .map((name) => prisma.menuCategory.upsert({ where: { name }, update: {}, create: { name } })));

  const ings = await Promise.all([
    ['เนื้อวัวออสเตรเลีย','กก.',50,10], ['กุ้งแม่น้ำ','กก.',30,8],
    ['ข้าวหอมมะลิ','กก.',100,20],       ['มะนาว','กก.',15,5],
    ['พริกขี้หนู','กก.',8,3],           ['กะทิ','ลิตร',40,10],
    ['นมสด','ลิตร',25,8],               ['ไข่ไก่','ฟอง',200,50]
  ].map(([name, unit, stockQty, reorderPoint]) => prisma.ingredient.upsert({
    where: { name }, update: {}, create: { name, unit, stockQty, reorderPoint } })));

  const MENUS = [
    [0,'สเต๊กเนื้อออสเตรเลีย',680,[[0,0.3],[2,0.1]]],
    [0,'ต้มยำกุ้งน้ำข้น',320,[[1,0.25],[3,0.05],[4,0.02],[5,0.15]]],
    [0,'ข้าวผัดปูอลาสก้า',280,[[2,0.25],[7,2]]],
    [0,'ผัดไทยกุ้งสด',220,[[1,0.15],[7,1]]],
    [1,'ปอเปี๊ยะทอด',150,[[7,1]]],
    [1,'สลัดกุ้งย่าง',240,[[1,0.12],[3,0.03]]],
    [2,'ชาไทยเย็น',80,[[6,0.25]]],
    [2,'น้ำมะนาวโซดา',70,[[3,0.08]]],
    [3,'ไอศกรีมกะทิ',120,[[5,0.1]]],
    [3,'บัวลอยไข่หวาน',110,[[5,0.15],[7,1]]]
  ];
  const menus = [];
  for (const [ci, name, price, recipe] of MENUS) {
    const m = await prisma.menuItem.create({
      data: { categoryId: cats[ci].id, name, price,
              description: `${name} สูตรพิเศษของร้าน`,
              recipes: { create: recipe.map(([ii, qty]) =>
                ({ ingredientId: ings[ii].id, qty })) } }
    });
    menus.push(m);
  }

  console.log('📊 Generating 90 days of history...');
  const customer = users[5];
  let created = 0;
  for (let d = 90; d >= 1; d--) {
    const date = new Date(); date.setDate(date.getDate() - d); date.setHours(0,0,0,0);
    const perDay = 3 + Math.floor(Math.random() * 6);
    const used = new Set();

    for (let n = 0; n < perDay; n++) {
      const table = tables[Math.floor(Math.random() * tables.length)];
      const slot  = SLOTS[Math.floor(Math.random() * SLOTS.length)];
      const key = `${table.id}|${slot}`;
      if (used.has(key)) continue;
      used.add(key);

      const picked = Array.from({ length: 1 + Math.floor(Math.random() * 3) },
        () => menus[Math.floor(Math.random() * menus.length)]);
      const items = picked.map((m) => ({
        menuItemId: m.id, qty: 1 + Math.floor(Math.random() * 3), unitPrice: m.price }));
      const total = items.reduce((s, i) => s + Number(i.unitPrice) * i.qty, 0);
      const deposit = Math.round(total * 0.2 * 100) / 100;

      try {
        const rsv = await prisma.reservation.create({
          data: { userId: customer.id, tableId: table.id, reserveDate: date,
                  timeSlot: slot, partySize: 2 + Math.floor(Math.random() * 5),
                  totalAmount: total, depositAmount: deposit, status: 'COMPLETED',
                  createdAt: date, items: { create: items } }
        });
        const paidAt = new Date(date); paidAt.setHours(12 + (n % 8));
        await prisma.payment.create({
          data: { reservationId: rsv.id, method: 'PROMPTPAY', amount: deposit,
                  refCode: `SEED${rsv.id.slice(0, 12)}`, status: 'SUCCESS',
                  paidAt, createdAt: paidAt } });
        await prisma.review.create({
          data: { reservationId: rsv.id, rating: 3 + Math.floor(Math.random() * 3),
                  comment: 'บริการดี อาหารอร่อย', createdAt: paidAt } });
        created++;
      } catch { /* skip duplicate */ }
    }
  }

  await prisma.expense.createMany({ data: [
    { category: 'วัตถุดิบ', amount: 25000, description: 'สั่งซื้อเนื้อวัวล็อตใหม่',
      requestedById: users[4].id },
    { category: 'การตลาด', amount: 12000, description: 'ยิงแอด Facebook เดือนนี้',
      requestedById: users[1].id }
  ]});

  console.log(`✅ Done — ${created} reservations, ${menus.length} menus, ${tables.length} tables`);
  console.log('🔑 ทุกบัญชีใช้รหัสผ่าน: Test1234');
}

main().catch((e) => { console.error(e); process.exit(1); })
      .finally(() => prisma.$disconnect());
