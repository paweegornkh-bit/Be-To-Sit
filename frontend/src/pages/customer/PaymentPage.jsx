import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner, ErrorAlert, StatusBadge } from '../../components/ui/Common';
import { formatTHB } from '../../utils/perf';

const METHODS = [
  { value: 'PROMPTPAY', label: 'พร้อมเพย์' },
  { value: 'CREDIT_CARD', label: 'บัตรเครดิต' },
  { value: 'TRANSFER', label: 'โอนเงิน' }
];

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [reservation, setReservation] = useState(null);
  const [method, setMethod] = useState('PROMPTPAY');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
    const [slipFile, setSlipFile] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get(`/reservations/${id}`)
    .then((r) => setReservation(r.data.data))
    .catch((e) => setError(getErrorMessage(e)))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const onPay = async () => {
    setPaying(true);
    try {
      await api.post('/payments', { reservationId: id, method });
      toast.success('ชำระเงินสำเร็จ');
      navigate('/my-reservations');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const onSubmitSlip = async () => {
    if (!slipFile) return toast.error('กรุณาแนบสลิปการโอนเงิน');
    const data = new FormData();
    data.append('reservationId', id);
    data.append('method', 'TRANSFER');
    data.append('slip', slipFile);
    setPaying(true);
    try {
      await api.post('/payments/transfer-slip', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('ส่งสลิปแล้ว รอการตรวจสอบจากการเงิน');
      navigate('/my-reservations');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <main className="max-w-md mx-auto px-4 py-8"><ErrorAlert message={error} /></main>;
  if (!reservation) return null;

  const alreadyPaid = reservation.payments?.some((p) => p.status === 'SUCCESS');
  const pendingPayment = reservation.payments?.some((p) => p.status === 'PENDING');
  const failedPayment = reservation.payments?.some((p) => p.status === 'FAILED');

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">ชำระค่ามัดจำ</h1>
      <div className="card space-y-3 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">โต๊ะ</span>
          <span>{reservation.table.tableNo} ({reservation.table.zone.name})</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">วันที่ / เวลา</span>
          <span>{new Date(reservation.reserveDate).toLocaleDateString('th-TH')} · {reservation.timeSlot}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">จำนวนคน</span><span>{reservation.partySize}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">สถานะ</span><StatusBadge status={reservation.status} />
        </div>
        <div className="flex justify-between font-semibold pt-2 border-t">
          <span>ยอดรวม</span><span>{formatTHB(reservation.totalAmount)}</span>
        </div>
        <div className="flex justify-between font-semibold text-brand-600">
          <span>ค่ามัดจำที่ต้องชำระ</span><span>{formatTHB(reservation.depositAmount)}</span>
        </div>
      </div>

      {alreadyPaid ? (
        <div className="card text-center text-green-700 bg-green-50 border-green-200">
          การจองนี้ชำระเงินเรียบร้อยแล้ว
        </div>
      ) : pendingPayment ? (
        <div className="card text-center text-amber-700 bg-amber-50 border-amber-200">
          ส่งสลิปแล้ว กรุณารอการตรวจสอบจากการเงิน
        </div>
      ) : Number(reservation.depositAmount) <= 0 ? (
        <div className="card text-center text-gray-600">การจองนี้ไม่ต้องชำระค่ามัดจำ</div>
      ) : (
        <div className="card space-y-4">
          <label className="label">ช่องทางชำระเงิน</label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button key={m.value} onClick={() => setMethod(m.value)}
                      className={`p-2 rounded-lg text-sm border ${
                        method === m.value ? 'bg-brand-600 text-white border-brand-600'
                                            : 'border-gray-300 hover:bg-gray-50'}`}>
                {m.label}
              </button>
            ))}
          </div>
          {method === 'TRANSFER' && (
            <div>
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm space-y-1">
                <p className="font-semibold text-gray-800">ข้อมูลสำหรับโอนเงิน</p>
                <p>ธนาคารกสิกรไทย: <strong>025-864-566</strong></p>
                <p>พร้อมเพย์: <strong>082-587-416</strong></p>
                <p className="text-xs text-gray-500">โอนตามยอดค่ามัดจำ แล้วแนบสลิปด้านล่าง</p>
              </div>
              <label className="label" htmlFor="payment-slip">สลิปโอนเงิน</label>
              <input id="payment-slip" type="file" accept="image/jpeg,image/png,image/webp"
                     className="input" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-gray-500 mt-1">รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 5MB</p>
            </div>
          )}
          {method === 'TRANSFER' ? (
            <button onClick={onSubmitSlip} disabled={paying || !slipFile}
                    className="btn-primary w-full">ส่งสลิป</button>
          ) : (
            <button onClick={onPay} disabled={paying} className="btn-primary w-full">
              {paying ? 'กำลังดำเนินการ...' : `ชำระ ${formatTHB(reservation.depositAmount)}`}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
