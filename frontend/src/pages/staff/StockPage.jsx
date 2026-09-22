import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner, EmptyState, ErrorAlert } from '../../components/ui/Common';

export default function StockPage() {
  const toast = useToast();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ingredientId: '', type: 'IN', qty: '', note: '' });

  const load = () => {
    setLoading(true);
    api.get('/ingredients')
      .then((r) => setIngredients(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.ingredientId || !form.qty) return;
    try {
      await api.post('/stock-movements', { ...form, qty: Number(form.qty) });
      toast.success('บันทึกการเคลื่อนไหวสต็อกแล้ว');
      setForm({ ingredientId: '', type: 'IN', qty: '', note: '' });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">คลังวัตถุดิบ</h1>
      <ErrorAlert message={error} />

      <form onSubmit={onSubmit} className="card grid sm:grid-cols-4 gap-3 mb-6 items-end">
        <div className="sm:col-span-2">
          <label className="label">วัตถุดิบ</label>
          <select className="input" value={form.ingredientId}
                  onChange={(e) => setForm((f) => ({ ...f, ingredientId: e.target.value }))} required>
            <option value="">เลือกวัตถุดิบ</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.unit}) — คงเหลือ {i.stockQty}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">ประเภท</label>
          <select className="input" value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="IN">รับเข้า</option>
            <option value="OUT">เบิกออก</option>
            <option value="ADJUST">ปรับยอด</option>
          </select>
        </div>
        <div>
          <label className="label">จำนวน</label>
          <input type="number" step="0.01" min="0" className="input" value={form.qty}
                 onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} required />
        </div>
        <div className="sm:col-span-4">
          <button type="submit" className="btn-primary">บันทึก</button>
        </div>
      </form>

      {ingredients.length === 0 ? <EmptyState title="ยังไม่มีวัตถุดิบ" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">วัตถุดิบ</th><th className="py-2 pr-3">หน่วย</th>
                <th className="py-2 pr-3">คงเหลือ</th><th className="py-2 pr-3">จุดสั่งซื้อ</th>
                <th className="py-2 pr-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((i) => {
                const low = Number(i.stockQty) <= Number(i.reorderPoint);
                return (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{i.name}</td>
                    <td className="py-2 pr-3">{i.unit}</td>
                    <td className="py-2 pr-3">{i.stockQty}</td>
                    <td className="py-2 pr-3">{i.reorderPoint}</td>
                    <td className="py-2 pr-3">
                      {low ? <span className="text-red-600 font-medium">ใกล้หมด</span>
                           : <span className="text-green-600">ปกติ</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
