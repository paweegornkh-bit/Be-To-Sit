export const Spinner = ({ label = 'กำลังโหลดข้อมูล...' }) => (
  <div className="py-16 text-center text-gray-500" role="status" aria-live="polite">
    <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-brand-600
                    rounded-full animate-spin mb-3" />
    <p className="text-sm">{label}</p>
  </div>
);

export const EmptyState = ({ title, hint }) => (
  <div className="py-14 text-center">
    <p className="text-gray-700 font-medium">{title}</p>
    {hint && <p className="text-sm text-gray-400 mt-1">{hint}</p>}
  </div>
);

export const ErrorAlert = ({ message }) => message ? (
  <div role="alert" aria-live="assertive"
       className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
    {message}
  </div>
) : null;

const BADGE = {
  PENDING:   'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SEATED:    'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
  NO_SHOW:   'bg-red-100 text-red-800',
  SUCCESS:   'bg-green-100 text-green-800',
  APPROVED:  'bg-green-100 text-green-800',
  REJECTED:  'bg-red-100 text-red-800'
};

export const LABEL = {
  PENDING:'รอชำระเงิน', CONFIRMED:'ยืนยันแล้ว', SEATED:'เช็คอินแล้ว',
  COMPLETED:'ใช้บริการเสร็จ', CANCELLED:'ยกเลิก', NO_SHOW:'ไม่มาตามนัด',
  SUCCESS:'ชำระสำเร็จ', APPROVED:'อนุมัติแล้ว', REJECTED:'ปฏิเสธ'
};

export const StatusBadge = ({ status }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                    ${BADGE[status] || 'bg-gray-100 text-gray-700'}`}>
    {LABEL[status] || status}
  </span>
);

export const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 px-4"
         role="dialog" aria-modal="true" aria-label={title}
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="ปิดหน้าต่าง"
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
};
