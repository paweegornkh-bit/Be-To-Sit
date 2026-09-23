import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner, ErrorAlert } from '../../components/ui/Common';

const STATUS_COLOR = {
  AVAILABLE: 'bg-green-100 border-green-400 text-green-800',
  OCCUPIED: 'bg-red-100 border-red-400 text-red-800',
  RESERVED: 'bg-amber-100 border-amber-400 text-amber-800',
  MAINTENANCE: 'bg-gray-200 border-gray-400 text-gray-500'
};

export default function FloorPlanPage() {
  const toast = useToast();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => api.get('/tables')
    .then((r) => setTables(r.data.data))
    .catch((e) => setError(getErrorMessage(e)))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const cycleStatus = async (t) => {
    const order = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];
    const next = order[(order.indexOf(t.status) + 1) % order.length];
    try {
      await api.patch(`/tables/${t.id}/status`, { status: next });
      setTables((rows) => rows.map((x) => x.id === t.id ? { ...x, status: next } : x));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const zones = tables.reduce((groups, table) => {
    const zoneName = table.zone?.name || 'ไม่ระบุโซน';
    groups[zoneName] = groups[zoneName] || [];
    groups[zoneName].push(table);
    return groups;
  }, {});

  if (loading) return <Spinner />;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">ผังโต๊ะ</h1>
      <p className="text-sm text-gray-500 mb-6">คลิกที่โต๊ะเพื่อเปลี่ยนสถานะ</p>
      <ErrorAlert message={error} />
      <div className="space-y-6">
        {Object.entries(zones).map(([zoneName, zoneTables]) => (
          <section key={zoneName} className="bg-white border rounded-xl p-4">
            <h2 className="font-semibold text-gray-800 mb-4">{zoneName}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {zoneTables.map((t) => (
                <button key={t.id} onClick={() => cycleStatus(t)}
                        className={`min-h-24 p-2 rounded-lg border-2 text-center text-xs
                                    ${STATUS_COLOR[t.status]}`}>
                  <div className="font-semibold">{t.tableNo}</div>
                  <div>{t.seats} ที่นั่ง</div>
                  <div className="mt-1 font-medium">{t.status}</div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
