import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner, EmptyState, ErrorAlert, StatusBadge } from '../../components/ui/Common';
import { formatTHB } from '../../utils/perf';

export default function ApprovalPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/expenses')
      .then((r) => setRows(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onDecide = async (id, approve) => {
    try {
      await api.patch(`/expenses/${id}/approve`, { approve });
      toast.success(approve ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  const pending = rows.filter((r) => r.status === 'PENDING');
  const decided = rows.filter((r) => r.status !== 'PENDING');

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">อนุมัติรายจ่าย</h1>
      <ErrorAlert message={error} />

      <h2 className="font-semibold mb-3 text-gray-700">รออนุมัติ</h2>
      {pending.length === 0 ? <EmptyState title="ไม่มีรายการรออนุมัติ" /> : (
        <div className="space-y-3 mb-8">
          {pending.map((e) => (
            <div key={e.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{e.category} — {formatTHB(e.amount)}</p>
                <p className="text-sm text-gray-500">{e.description}</p>
                <p className="text-xs text-gray-400">ขอโดย {e.requestedBy?.fullName}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onDecide(e.id, true)} className="btn-primary py-1.5 text-sm">อนุมัติ</button>
                <button onClick={() => onDecide(e.id, false)} className="btn-ghost py-1.5 text-sm">ปฏิเสธ</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold mb-3 text-gray-700">ประวัติการตัดสินใจ</h2>
      {decided.length === 0 ? <EmptyState title="ยังไม่มีประวัติ" /> : (
        <div className="space-y-3">
          {decided.map((e) => (
            <div key={e.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{e.category} — {formatTHB(e.amount)}</p>
                <p className="text-sm text-gray-500">{e.description}</p>
                <p className="text-xs text-gray-400">
                  โดย {e.approvedBy?.fullName} · {new Date(e.approvedAt).toLocaleDateString('th-TH')}
                </p>
              </div>
              <StatusBadge status={e.status} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
