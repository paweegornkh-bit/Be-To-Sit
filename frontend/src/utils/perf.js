export function debounce(fn, delay = 350) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

export function throttle(fn, limit = 100) {
  let waiting = false, lastArgs = null;
  return (...args) => {
    if (waiting) { lastArgs = args; return; }
    fn(...args);
    waiting = true;
    setTimeout(() => {
      waiting = false;
      if (lastArgs) { fn(...lastArgs); lastArgs = null; }
    }, limit);
  };
}

export const formatTHB = (n) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB',
    maximumFractionDigits: 0 }).format(Number(n) || 0);
