import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { Spinner, EmptyState, ErrorAlert, StatusBadge, Modal } from '../../components/ui/Common';
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
  const [reviewing, setReviewing] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [slipLoading, setSlipLoading] = useState(false);

  useEffect(() => () => {
    if (slipPreview) URL.revokeObjectURL(slipPreview);
  }, [slipPreview]);

  const openSlip = async (paymentId) => {
    setSlipLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/payments/${paymentId}/slip`, { responseType: 'blob' });
      if (!data.type?.startsWith('image/')) {
        const message = await data.text();
        let errorMessage = 'ไม่สามารถโหลดรูปสลิปได้';
        try {
          errorMessage = JSON.parse(message)?.error?.message || errorMessage;
        } catch {
          errorMessage = 'ไม่สามารถโหลดรูปสลิปได้';
        }
        throw new Error(errorMessage);
      }
      setSlipPreview(URL.createObjectURL(data));
    } catch (e) {
      setError(e.message || getErrorMessage(e));
    } finally {
      setSlipLoading(false);
    }
  };

  const closeSlip = () => {
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipPreview(null);
  };

  const review = async (id, approve) => {
    setReviewing(id);
    try {
      await api.patch(`/payments/${id}/review`, { approve });
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setReviewing(null);
    }
  };

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">รายการชำระเงิน</h1>
      <ErrorAlert message={error} />
      <section aria-label="ค้นหาและรายการชำระเงิน">
      <div className="card flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="label" htmlFor="finance-from">จากวันที่</label>
          <input id="finance-from" type="date" className="input" value={range.from}
                 onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="finance-to">ถึงวันที่</label>
          <input id="finance-to" type="date" className="input" value={range.to}
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
                <th className="py-2 pr-3">จำนวนเงิน</th><th className="py-2 pr-3">สลิป</th>
                <th className="py-2 pr-3">สถานะ</th><th className="py-2 pr-3">ตรวจสอบ</th>
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
                  <td className="py-2 pr-3">
                    {p.hasSlip ? <button type="button" disabled={slipLoading} onClick={() => openSlip(p.id)}
                                          className="text-brand-600 underline">เปิดดู</button> : '-'}
                  </td>
                  <td className="py-2 pr-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2 pr-3">
                    {p.status === 'PENDING' && <div className="flex gap-2">
                      <button disabled={reviewing === p.id} onClick={() => review(p.id, true)}
                              className="text-green-700 underline">อนุมัติ</button>
                      <button disabled={reviewing === p.id} onClick={() => review(p.id, false)}
                              className="text-red-700 underline">ปฏิเสธ</button>
                    </div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </section>
      <Modal open={Boolean(slipPreview)} title="สลิปการโอนเงิน" onClose={closeSlip}>
        {slipPreview && <img src={slipPreview} alt="สลิปการโอนเงิน"
                             onError={() => { closeSlip(); setError('ไม่สามารถแสดงรูปสลิปได้'); }}
                             className="mx-auto max-h-[75vh] max-w-full object-contain" />}
      </Modal>
    </main>
  );
}
