export const ok = (res, data, meta) =>
  res.json({ success: true, data, ...(meta && { meta }) });

export const created = (res, data) =>
  res.status(201).json({ success: true, data });

export const noContent = (res) => res.status(204).send();

export const paginate = ({ page = 1, limit = 20 }) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
};
