import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner, EmptyState, ErrorAlert, StatusBadge } from '../../components/ui/Common';

const NEXT_ACTIONS = {
  PENDING:   [{ to: 'CONFIRMED', label: 'ยืนยัน' }, { to: 'CANCELLED', label: 'ยกเลิก' }],
  CONFIRMED: [{ to: 'SEATED', label: 'เช็คอิน' }, { to: 'NO_SHOW', label: 'ไม่มา' }],
  SEATED:    [{ to: 'COMPLETED', label: 'เสร็จสิ้น' }],
  COMPLETED: [], CANCELLED: [], NO_SHOW: []
};

export default function HostPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const load = () => {
    setLoading(true);
    api.get('/reservations', { params: { date: today, limit: 100 } })
      .then((r) => setRows(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      toast.success('อัปเดตสถานะแล้ว');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">คิววันนี้ — {today}</h1>
      <ErrorAlert message={error} />
      {rows.length === 0 ? <EmptyState title="ยังไม่มีการจองวันนี้" /> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.timeSlot} · โต๊ะ {r.table.tableNo} · {r.user.fullName}</p>
                <p className="text-sm text-gray-500">{r.partySize} ที่นั่ง · {r.user.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {NEXT_ACTIONS[r.status].map((a) => (
                  <button key={a.to} onClick={() => updateStatus(r.id, a.to)}
                          className="btn-ghost py-1.5 text-sm">{a.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
