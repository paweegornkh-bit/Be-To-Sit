import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, getErrorMessage } from '../../services/api';
import { Spinner, ErrorAlert } from '../../components/ui/Common';
import { formatTHB } from '../../utils/perf';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/overview')
      .then((r) => setData(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <main className="max-w-6xl mx-auto px-4 py-8"><ErrorAlert message={error} /></main>;
  if (!data) return null;

  const kpiCards = [
    { label: 'ยอดขายเดือนนี้', value: formatTHB(data.kpi.totalRevenue) },
    { label: 'เป้าหมาย', value: `${data.kpi.achievement}%` },
    { label: 'จำนวนการจอง', value: data.kpi.totalReservations },
    { label: 'ค่าเฉลี่ยต่อบิล', value: formatTHB(data.kpi.avgTicket) },
    { label: 'อัตราการเข้าใช้โต๊ะวันนี้', value: `${data.occupancy.occupancyRate}%` },
    { label: 'คะแนนความพึงพอใจ', value: `${data.satisfaction.average} / 5` }
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">แดชบอร์ดผู้บริหาร</h1>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpiCards.map((k) => (
          <div key={k.label} className="card text-center">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className="text-lg font-bold text-brand-600">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-3">ยอดขายรายวัน</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => formatTHB(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">เมนูขายดี Top 10</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topMenus} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip />
              <Bar dataKey="qty" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.lowStock.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <h2 className="font-semibold text-red-700 mb-2">⚠️ วัตถุดิบใกล้หมด</h2>
          <ul className="text-sm text-red-700 space-y-1">
            {data.lowStock.map((i) => (
              <li key={i.id}>{i.name} — คงเหลือ {i.stockQty} {i.unit} (จุดสั่งซื้อ {i.reorderPoint})</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
