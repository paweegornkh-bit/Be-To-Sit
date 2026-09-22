import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner, EmptyState, ErrorAlert, Modal } from '../../components/ui/Common';
import { formatTHB } from '../../utils/perf';

const BLANK = { categoryId: '', name: '', description: '', price: '', isAvailable: true };

export default function MenuManagePage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/menu-categories'), api.get('/menu-items', { params: { limit: 100 } })])
      .then(([c, i]) => { setCategories(c.data.data); setItems(i.data.data); })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(BLANK); setModalOpen(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ categoryId: item.categoryId, name: item.name,
              description: item.description || '', price: item.price, isAvailable: item.isAvailable });
    setModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editing) await api.put(`/menu-items/${editing.id}`, payload);
      else await api.post('/menu-items', payload);
      toast.success('บันทึกเมนูแล้ว');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onDelete = async (id) => {
    if (!confirm('ยืนยันการลบเมนูนี้?')) return;
    try {
      await api.delete(`/menu-items/${id}`);
      toast.success('ลบเมนูแล้ว');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spinner />;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">จัดการเมนู</h1>
        <button onClick={openNew} className="btn-primary">+ เพิ่มเมนู</button>
      </div>
      <ErrorAlert message={error} />

      {items.length === 0 ? <EmptyState title="ยังไม่มีเมนู" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">ชื่อเมนู</th><th className="py-2 pr-3">หมวดหมู่</th>
                <th className="py-2 pr-3">ราคา</th><th className="py-2 pr-3">สถานะ</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">{m.name}</td>
                  <td className="py-2 pr-3">{m.category?.name}</td>
                  <td className="py-2 pr-3">{formatTHB(m.price)}</td>
                  <td className="py-2 pr-3">{m.isAvailable ? 'พร้อมขาย' : 'งดขาย'}</td>
                  <td className="py-2 pr-3 text-right space-x-2">
                    <button onClick={() => openEdit(m)} className="text-brand-600 text-sm">แก้ไข</button>
                    <button onClick={() => onDelete(m.id)} className="text-red-600 text-sm">ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'} onClose={() => setModalOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">หมวดหมู่</label>
            <select className="input" value={form.categoryId} required
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
              <option value="">เลือกหมวดหมู่</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ชื่อเมนู</label>
            <input className="input" required minLength={2} maxLength={120} value={form.name}
                   onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">คำอธิบาย</label>
            <textarea className="input" maxLength={500} rows={2} value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">ราคา (บาท)</label>
            <input type="number" step="0.01" min="0" className="input" required value={form.price}
                   onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isAvailable}
                   onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
            พร้อมจำหน่าย
          </label>
          <button type="submit" className="btn-primary w-full">บันทึก</button>
        </form>
      </Modal>
    </main>
  );
}
