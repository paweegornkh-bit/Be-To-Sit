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
    <main className="min-h-screen grid place-items-center bg-gray-50 px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-1">🍽️ TableTime</h1>
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
        <div className="mt-6 pt-4 border-t text-xs text-gray-400">
          <p className="font-medium mb-1">บัญชีทดสอบ (รหัสผ่าน: Test1234)</p>
          <p>customer@example.com · owner@tabletime.app · manager@tabletime.app</p>
          <p>host@tabletime.app · finance@tabletime.app · stock@tabletime.app</p>
        </div>
      </div>
    </main>
  );
}
