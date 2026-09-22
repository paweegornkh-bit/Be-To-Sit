import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { Spinner, EmptyState, ErrorAlert, StatusBadge } from '../../components/ui/Common';
import { formatTHB } from '../../utils/perf';

export default function FinancePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState({
    from: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10)
  });

  const load = () => {
    setLoading(true);
    api.get('/payments', { params: { ...range, limit: 100 } })
      .then((r) => setRows(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const total = rows.reduce((s, p) => s + (p.status === 'SUCCESS' ? Number(p.amount) : 0), 0);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">รายการชำระเงิน</h1>
      <ErrorAlert message={error} />
      <div className="card flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="label">จากวันที่</label>
          <input type="date" className="input" value={range.from}
                 onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </div>
        <div>
          <label className="label">ถึงวันที่</label>
          <input type="date" className="input" value={range.to}
                 onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </div>
        <button onClick={load} className="btn-primary">ค้นหา</button>
        <div className="ml-auto text-right">
          <p className="text-sm text-gray-500">ยอดรวมที่ชำระสำเร็จ</p>
          <p className="text-xl font-bold text-brand-600">{formatTHB(total)}</p>
        </div>
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="ไม่พบรายการ" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">อ้างอิง</th><th className="py-2 pr-3">ลูกค้า</th>
                <th className="py-2 pr-3">โต๊ะ</th><th className="py-2 pr-3">ช่องทาง</th>
                <th className="py-2 pr-3">จำนวนเงิน</th><th className="py-2 pr-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">{p.refCode}</td>
                  <td className="py-2 pr-3">{p.reservation?.user?.fullName}</td>
                  <td className="py-2 pr-3">{p.reservation?.table?.tableNo}</td>
                  <td className="py-2 pr-3">{p.method}</td>
                  <td className="py-2 pr-3">{formatTHB(p.amount)}</td>
                  <td className="py-2 pr-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
