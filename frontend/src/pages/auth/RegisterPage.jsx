import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { ErrorAlert } from '../../components/ui/Common';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      navigate('/booking', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b px-4 py-3">
        <span className="font-bold text-brand-600">TableTime</span>
      </header>
      <main id="main-content" className="flex-1 grid place-items-center px-4 py-10">
      <section className="card w-full max-w-md" aria-labelledby="register-heading">
        <h1 id="register-heading" className="text-2xl font-bold text-center mb-1">สมัครสมาชิก</h1>
        <p className="text-center text-gray-500 mb-6">สร้างบัญชีเพื่อเริ่มจองโต๊ะกับ TableTime</p>
        <ErrorAlert message={error} />
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="fullName">ชื่อ-นามสกุล</label>
            <input id="fullName" name="fullName" required minLength={2} maxLength={100}
                   className="input" value={form.fullName} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="email">อีเมล</label>
            <input id="email" name="email" type="email" required
                   className="input" value={form.email} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="phone">เบอร์โทร</label>
            <input id="phone" name="phone" required placeholder="0812345678"
                   pattern="0\d{9}" title="เบอร์โทรต้องเป็น 10 หลักขึ้นต้นด้วย 0"
                   className="input" value={form.phone} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="password">รหัสผ่าน</label>
            <input id="password" name="password" type="password" required minLength={8}
                   className="input" value={form.password} onChange={onChange} />
            <p className="text-xs text-gray-400 mt-1">อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-5">
          มีบัญชีอยู่แล้ว? <Link to="/login" className="text-brand-600 font-medium">เข้าสู่ระบบ</Link>
        </p>
      </section>
      </main>
      <footer className="bg-white border-t py-4 text-center text-sm text-gray-400">TableTime</footer>
    </div>
  );
}
