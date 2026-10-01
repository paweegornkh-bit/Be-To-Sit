import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { ErrorAlert } from '../../components/ui/Common';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const dest = location.state?.from?.pathname ||
        (user.role === 'CUSTOMER' ? '/booking' : '/staff/floor-plan');
      navigate(dest, { replace: true });
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
      <main id="main-content" className="flex-1 grid place-items-center px-4">
      <section className="card w-full max-w-md" aria-labelledby="login-heading">
        <svg className="mx-auto mb-3 text-brand-600" width="64" height="64" viewBox="0 0 64 64"
             role="img" aria-labelledby="tabletime-art-title">
          <title id="tabletime-art-title">จานอาหารและช้อนส้อม</title>
          <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="32" cy="32" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 13v14m-4-14v8m8-8v8m-4 6v24M56 13c-5 6-6 13-2 18h4V13m-2 18v24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <h1 id="login-heading" className="text-2xl font-bold text-center mb-1">เข้าสู่ระบบ TableTime</h1>
        <p className="text-center text-gray-500 mb-6">เข้าสู่ระบบเพื่อจองโต๊ะหรือจัดการร้าน</p>
        <ErrorAlert message={error} />
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">อีเมล</label>
            <input id="email" name="email" type="email" required autoFocus
                   className="input" value={form.email} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="password">รหัสผ่าน</label>
            <input id="password" name="password" type="password" required
                   className="input" value={form.password} onChange={onChange} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-5">
          ยังไม่มีบัญชี? <Link to="/register" className="text-brand-600 font-medium">สมัครสมาชิก</Link>
        </p>
      </section>
      </main>
      <footer className="bg-white border-t py-4 text-center text-sm text-gray-400">TableTime</footer>
    </div>
  );
}
