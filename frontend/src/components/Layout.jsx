import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENU = [
  { to: '/booking',            label: 'จองโต๊ะ',       roles: ['CUSTOMER'] },
  { to: '/my-reservations',    label: 'การจองของฉัน',   roles: ['CUSTOMER'] },
  { to: '/staff/host',         label: 'ต้อนรับ/คิว',    roles: ['STAFF_HOST','MANAGER','OWNER'] },
  { to: '/staff/floor-plan',   label: 'ผังโต๊ะ',        roles: ['STAFF_HOST','STAFF_FINANCE','STAFF_STOCK','MANAGER','OWNER'] },
  { to: '/staff/finance',      label: 'การเงิน',        roles: ['STAFF_FINANCE','MANAGER','OWNER'] },
  { to: '/staff/stock',        label: 'คลังวัตถุดิบ',   roles: ['STAFF_STOCK','MANAGER','OWNER'] },
  { to: '/manager/dashboard',  label: 'แดชบอร์ด',       roles: ['MANAGER','OWNER'] },
  { to: '/manager/menu',       label: 'จัดการเมนู',      roles: ['MANAGER','OWNER'] },
  { to: '/owner/approval',     label: 'อนุมัติรายจ่าย',  roles: ['OWNER'] }
];

const ROLE_LABEL = {
  CUSTOMER:'ลูกค้า', STAFF_HOST:'พนักงานต้อนรับ', STAFF_FINANCE:'ฝ่ายการเงิน',
  STAFF_STOCK:'ฝ่ายคลัง', MANAGER:'ผู้จัดการ', OWNER:'เจ้าของร้าน'
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = MENU.filter((m) => m.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
          <span className="text-xl font-bold text-brand-600">🍽️ TableTime</span>
          <nav aria-label="เมนูหลัก" className="flex-1 overflow-x-auto">
            <ul className="flex gap-1">
              {items.map((m) => (
                <li key={m.to}>
                  <NavLink to={m.to} className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                      isActive ? 'bg-brand-50 text-brand-700 font-medium'
                               : 'text-gray-600 hover:bg-gray-100'}`}>
                    {m.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block">
              {user?.fullName}
              <span className="text-gray-400 ml-1">({ROLE_LABEL[user?.role]})</span>
            </span>
            <button className="btn-ghost py-1.5 text-sm"
                    onClick={() => logout().then(() => navigate('/login'))}>
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1"><Outlet /></div>

      <footer className="bg-white border-t py-5 text-center text-sm text-gray-400">
        <p>&copy; 2026 TableTime — ระบบจองโต๊ะและบริหารจัดการร้านอาหาร</p>
      </footer>
    </div>
  );
}
