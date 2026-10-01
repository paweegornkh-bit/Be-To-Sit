import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner, EmptyState, ErrorAlert } from '../../components/ui/Common';
import { formatTHB } from '../../utils/perf';
import { useDebounce } from '../../hooks/useDebounce';

const SLOTS = ['11:00', '13:00', '17:00', '19:00', '21:00'];

export default function BookingPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [zones, setZones] = useState([]);
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuQuery, setMenuQuery] = useState('');
  const [menuLoading, setMenuLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState(SLOTS[0]);
  const [partySize, setPartySize] = useState(2);
  const [zoneId, setZoneId] = useState('');
  const [tableId, setTableId] = useState('');
  const [note, setNote] = useState('');
  const [cart, setCart] = useState({});
  const debouncedMenuQuery = useDebounce(menuQuery, 350);

  useEffect(() => {
    api.get('/zones')
      .then((z) => setZones(z.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    setMenuLoading(true);
    api.get('/menu-items', { params: { limit: 50, q: debouncedMenuQuery || undefined } })
      .then((r) => { if (active) setMenuItems(r.data.data); })
      .catch((e) => { if (active) setError(getErrorMessage(e)); })
      .finally(() => { if (active) setMenuLoading(false); });
    return () => { active = false; };
  }, [debouncedMenuQuery]);

  useEffect(() => {
    if (!date || !timeSlot) return;
    api.get('/tables', { params: { zoneId: zoneId || undefined, date, slot: timeSlot } })
      .then((r) => setTables(r.data.data))
      .catch((e) => setError(getErrorMessage(e)));
  }, [date, timeSlot, zoneId]);

  const total = useMemo(() =>
    Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = menuItems.find((m) => m.id === id);
      return sum + (item ? Number(item.price) * qty : 0);
    }, 0), [cart, menuItems]);

  const changeQty = (id, delta) =>
    setCart((c) => {
      const next = Math.max(0, (c[id] || 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[id]; else copy[id] = next;
      return copy;
    });

  // ใช้ delegation ลดจำนวน handler ในรายการโต๊ะและเมนูที่เพิ่มตามข้อมูล
  const handleSelectionClick = (e) => {
    const target = e.target.closest('[data-id]');
    if (!target || !e.currentTarget.contains(target) || target.disabled) return;
    const { id, action } = target.dataset;
    if (action === 'select-slot') setTimeSlot(id);
    if (action === 'select-table') setTableId(id);
    if (action === 'decrease-item') changeQty(id, -1);
    if (action === 'increase-item') changeQty(id, 1);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!tableId) { toast.error('กรุณาเลือกโต๊ะ'); return; }
    setSubmitting(true);
    try {
      const items = Object.entries(cart).map(([menuItemId, qty]) => ({ menuItemId, qty }));
      const { data } = await api.post('/reservations', {
        tableId, reserveDate: date, timeSlot, partySize: Number(partySize), note, items
      });
      toast.success('จองโต๊ะสำเร็จ');
      navigate(`/payment/${data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
    <h1 className="sr-only">จองโต๊ะร้านอาหาร</h1><Spinner />
  </main>;

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">จองโต๊ะร้านอาหาร</h1>
      <ErrorAlert message={error} />
      <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-6">
        <section className="card space-y-4">
          <h2 className="font-semibold">รายละเอียดการจอง</h2>
          <div>
            <label className="label" htmlFor="booking-date">วันที่</label>
            <input id="booking-date" type="date" className="input" value={date}
                   min={new Date().toISOString().slice(0, 10)}
                   onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <fieldset>
            <legend className="label">รอบเวลา</legend>
            <div className="flex flex-wrap gap-2" onClick={handleSelectionClick}>
              {SLOTS.map((s) => (
                <button type="button" key={s} data-id={s} data-action="select-slot"
                  aria-pressed={timeSlot === s}
                        className={`px-3 py-2 rounded-lg text-sm border ${
                          timeSlot === s ? 'bg-brand-600 text-white border-brand-600'
                                         : 'border-gray-300 hover:bg-gray-50'}`}>
                  {s}
                </button>
              ))}
            </div>
            </fieldset>
          </div>
          <div>
            <label className="label" htmlFor="booking-party-size">จำนวนคน</label>
            <input id="booking-party-size" type="number" min={1} max={20} className="input"
                   value={partySize} onChange={(e) => setPartySize(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="booking-zone">โซน</label>
            <select id="booking-zone" className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">ทุกโซน</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <fieldset>
            <legend className="label">เลือกโต๊ะ</legend>
            {tables.length === 0 ? <EmptyState title="ไม่พบโต๊ะ" /> : (
              <div className="grid grid-cols-3 gap-2" onClick={handleSelectionClick}>
                {tables.map((t) => (
                  <button type="button" key={t.id} data-id={t.id} data-action="select-table"
                      aria-pressed={tableId === t.id}
                          disabled={!t.isAvailable}
                          className={`p-2 rounded-lg text-sm border text-center ${
                            !t.isAvailable ? 'opacity-40 cursor-not-allowed border-gray-200' :
                            tableId === t.id ? 'bg-brand-600 text-white border-brand-600'
                                              : 'border-gray-300 hover:bg-gray-50'}`}>
                    <div className="font-medium">{t.tableNo}</div>
                    <div className="text-xs">{t.seats} ที่นั่ง</div>
                  </button>
                ))}
              </div>
            )}
            </fieldset>
          </div>
          <div>
            <label className="label" htmlFor="booking-note">หมายเหตุ (ถ้ามี)</label>
            <textarea id="booking-note" className="input" maxLength={200} rows={2}
                      value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>

        <section className="card space-y-4 h-fit">
          <h2 className="font-semibold">สั่งอาหารล่วงหน้า (ไม่บังคับ)</h2>
          <label className="block" htmlFor="booking-menu-search">
            <span className="label">ค้นหาเมนู</span>
            <input id="booking-menu-search" type="search" className="input" value={menuQuery}
                   onChange={(e) => setMenuQuery(e.target.value)} placeholder="พิมพ์ชื่อเมนู" />
          </label>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {menuLoading ? <p className="text-sm text-gray-500" role="status">กำลังโหลดเมนู...</p> :
              menuItems.length === 0 ? <EmptyState title="ไม่พบเมนู" /> : (
              <div className="space-y-2" onClick={handleSelectionClick}>
              {menuItems.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  {m.imageUrl && <img src={m.imageUrl} alt={m.name} loading="lazy" className="w-16 h-16 object-cover rounded" />}
                  <p className="font-medium">{m.name}</p>
                  <p className="text-gray-400">{formatTHB(m.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" data-id={m.id} data-action="decrease-item"
                      className="btn-ghost px-2 py-1">−</button>
                  <span className="w-5 text-center">{cart[m.id] || 0}</span>
                    <button type="button" data-id={m.id} data-action="increase-item"
                      className="btn-ghost px-2 py-1">+</button>
                </div>
              </div>
              ))}
              </div>
            )}
          </div>
          <div className="pt-3 border-t flex items-center justify-between font-semibold">
            <span>ยอดรวม</span><span>{formatTHB(total)}</span>
          </div>
          <p className="text-xs text-gray-400">ต้องชำระมัดจำ 20% ของยอดรวมเพื่อยืนยันการจอง</p>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'กำลังจอง...' : 'ยืนยันการจอง'}
          </button>
        </section>
      </form>
    </main>
  );
}
