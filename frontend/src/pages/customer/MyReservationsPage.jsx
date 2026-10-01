import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner, EmptyState, ErrorAlert, StatusBadge } from '../../components/ui/Common';
import { formatTHB } from '../../utils/perf';
import { useDebounce } from '../../hooks/useDebounce';

export default function MyReservationsPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);

  const load = () => {
    setLoading(true);
    api.get('/reservations')
      .then((r) => setRows(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ใช้ debounce เพื่อไม่กรองรายการใหม่ทุกครั้งที่พิมพ์แต่ละตัวอักษร
  const filteredRows = rows.filter((row) => {
    const searchText = `${row.table?.tableNo || ''} ${row.status} ${row.timeSlot} ${new Date(row.reserveDate).toLocaleDateString('th-TH')}`;
    return searchText.toLowerCase().includes(debouncedQuery.trim().toLowerCase());
  });

  const onCancel = async (id) => {
    if (!confirm('ยืนยันการยกเลิกการจองนี้?')) return;
    try {
      await api.delete(`/reservations/${id}`);
      toast.success('ยกเลิกการจองแล้ว');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
    <h1 className="sr-only">การจองของฉัน</h1><Spinner />
  </main>;

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">การจองของฉัน</h1>
      <ErrorAlert message={error} />
      <label className="block mb-5" htmlFor="reservation-search">
        <span className="label">ค้นหาการจอง</span>
        <input id="reservation-search" type="search" className="input" value={query}
               onChange={(e) => setQuery(e.target.value)} placeholder="โต๊ะ สถานะ วันที่ หรือเวลา" />
      </label>
      <section aria-label="รายการจองของฉัน">
      {filteredRows.length === 0 ? (
        <EmptyState title="ยังไม่มีการจอง" hint="ไปที่หน้าจองโต๊ะเพื่อเริ่มจองครั้งแรก" />
      ) : (
        <div className="space-y-3">
          {filteredRows.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  โต๊ะ {r.table.tableNo} · {new Date(r.reserveDate).toLocaleDateString('th-TH')} · {r.timeSlot}
                </p>
                <p className="text-sm text-gray-500">
                  {r.partySize} ที่นั่ง · ยอดรวม {formatTHB(r.totalAmount)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={r.status} />
                {r.status === 'PENDING' && (
                  <Link to={`/payment/${r.id}`} className="btn-primary py-1.5 text-sm">ชำระเงิน</Link>
                )}
                {['PENDING', 'CONFIRMED'].includes(r.status) && (
                  <button onClick={() => onCancel(r.id)} className="btn-ghost py-1.5 text-sm">ยกเลิก</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </section>
    </main>
  );
}
