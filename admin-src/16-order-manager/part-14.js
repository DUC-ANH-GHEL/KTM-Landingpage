
      const [monthSwipeDx, setMonthSwipeDx] = useState(0);
      const [monthSwipeAnimating, setMonthSwipeAnimating] = useState(false);
      const monthSwipeRef = useRef(null);
      const monthSwipePtrRef = useRef(null);

      const shouldIgnoreMonthSwipeStartTarget = (target) => {
        try {
          if (!target || typeof target.closest !== 'function') return false;
          if (target.closest('.modal, .dropdown-menu')) return true;
          if (target.closest('[contenteditable="true"]')) return true;
          // Keep search input usable (caret selection, drag, etc.)
          if (target.closest('.orders-search')) return true;
          // Don't start swipe on buttons/links
          if (target.closest('button, a, [role="button"]')) return true;
          return false;
        } catch {
          return false;
        }
      };

      const shiftMonthKey = (monthKey, delta) => {
        const mk = String(monthKey || '').trim();
        const parts = mk.split('-');
        const y = Number(parts[0] || 0);
        const m = Number(parts[1] || 0);
        if (!y || !m) return '';
        const d = new Date(y, (m - 1) + Number(delta || 0), 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };

      const getMonthSwipeMax = () => {
        try {
          const w = window?.innerWidth || 360;
          return Math.max(110, Math.min(180, Math.floor(w * 0.28)));
        } catch {
          return 140;
        }
      };

      const getMonthNavThreshold = () => Math.min(96, Math.max(66, Math.floor(getMonthSwipeMax() * 0.62)));

      const handleOrdersMonthSwipeStart = (e) => {
        try {
          if (overdueOnly || isSearchActive || filterStatus === 'draft') return;
          if (!e?.touches || e.touches.length !== 1) return;
          if (monthSwipeAnimating) return;
          if (monthSwipePtrRef.current?.active) return;
          const target = e.target;
          if (shouldIgnoreMonthSwipeStartTarget(target)) return;
          const t = e.touches[0];
          monthSwipeRef.current = { x: t.clientX, y: t.clientY, at: Date.now(), swiping: false };
        } catch {
          monthSwipeRef.current = null;
        }
      };

      const handleOrdersMonthSwipeMove = (e) => {
        const start = monthSwipeRef.current;
        if (!start || monthSwipeAnimating) return;
        const t = e?.touches && e.touches[0];
        if (!t) return;

        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);

        if (!start.swiping) {
          if (adx > 10 && adx > ady * 1.15) {
            start.swiping = true;
            setMonthSwipeAnimating(false);
            try {
              e.preventDefault?.();
              e.stopPropagation?.();
            } catch { }
          } else {
            return;
          }
        }

        const maxDx = getMonthSwipeMax();
        const clamped = Math.max(-maxDx, Math.min(maxDx, dx));
        setMonthSwipeDx(clamped);

        try {
          e.preventDefault?.();
          e.stopPropagation?.();
        } catch { }
      };

      const handleOrdersMonthSwipeEnd = (e) => {
        const start = monthSwipeRef.current;
        monthSwipeRef.current = null;
        try {
          if (!start) return;
          if (overdueOnly || isSearchActive || filterStatus === 'draft') return;
          if (!start.swiping) {
            setMonthSwipeDx(0);
            return;
          }
          const t = e?.changedTouches && e.changedTouches[0];
          if (!t) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          const dt = Date.now() - start.at;
          const adx = Math.abs(dx);
          const ady = Math.abs(dy);
          if (dt > 1000) return;
          if (adx < 24) {
            setMonthSwipeDx(0);
            return;
          }
          if (adx < ady * 1.45) return;

          const threshold = getMonthNavThreshold();
          const shouldNav = adx >= threshold;
          const sign = dx > 0 ? 1 : -1;
          const maxDx = getMonthSwipeMax();

          if (!shouldNav) {
            setMonthSwipeAnimating(true);
            setMonthSwipeDx(0);
            setTimeout(() => setMonthSwipeAnimating(false), 220);
            return;
          }

          const delta = sign > 0 ? -1 : 1;
          const baseKey = String(filterMonth || currentMonthKey || '').trim();
          const candidate = shiftMonthKey(baseKey, delta);
          if (!candidate) {
            setMonthSwipeAnimating(true);
            setMonthSwipeDx(0);
            setTimeout(() => setMonthSwipeAnimating(false), 220);
            return;
          }

          // Prevent swiping into the future beyond current month
          if (String(candidate) > String(currentMonthKey)) {
            setMonthSwipeAnimating(true);
            setMonthSwipeDx(sign * Math.floor(maxDx * 0.55));
            setTimeout(() => {
              setMonthSwipeDx(0);
              setTimeout(() => setMonthSwipeAnimating(false), 200);
            }, 140);
            return;
          }

          setMonthSwipeAnimating(true);
          setMonthSwipeDx(sign * maxDx);
          setTimeout(() => {
            setFilterMonth(candidate);
            setMonthSwipeDx(-sign * maxDx);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setMonthSwipeDx(0);
                setTimeout(() => setMonthSwipeAnimating(false), 220);
              });
            });
          }, 140);
        } catch {
          // ignore
        }
      };

      const handleOrdersMonthSwipeCancel = () => {
        monthSwipeRef.current = null;
        setMonthSwipeDx(0);
      };

      const handleOrdersMonthSwipePointerDown = (e) => {
        try {
          if (overdueOnly || isSearchActive || filterStatus === 'draft') return;
          if (monthSwipeAnimating) return;

          if (e?.pointerType === 'mouse' && e.button != null && e.button !== 0) return;

          const target = e.target;
          if (shouldIgnoreMonthSwipeStartTarget(target)) return;

          monthSwipeRef.current = null;
          monthSwipePtrRef.current = {
            active: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            at: Date.now(),
            lock: null,
            swiping: false,
            captured: false,
          };

          try {
            e.currentTarget?.setPointerCapture?.(e.pointerId);
            monthSwipePtrRef.current.captured = true;
          } catch { }
        } catch {
          monthSwipePtrRef.current = null;
        }
      };

      const handleOrdersMonthSwipePointerMove = (e) => {
        const start = monthSwipePtrRef.current;
        if (!start || !start.active || monthSwipeAnimating) return;

        const dx = e.clientX - start.startX;
        const dy = e.clientY - start.startY;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);

        if (!start.lock) {
          if (adx > 10 || ady > 10) start.lock = adx > ady * 1.15 ? 'x' : 'y';
        }

        if (start.lock !== 'x') {
          if (start.swiping) setMonthSwipeDx(0);
          return;
        }

        start.swiping = true;
        const maxDx = getMonthSwipeMax();
        const clamped = Math.max(-maxDx, Math.min(maxDx, dx));
        setMonthSwipeDx(clamped);

        try {
          e.preventDefault?.();
          e.stopPropagation?.();
        } catch { }
      };

      const handleOrdersMonthSwipePointerUp = (e) => {
        const start = monthSwipePtrRef.current;
        monthSwipePtrRef.current = null;
        try {
          if (!start || !start.active) return;
          if (overdueOnly || isSearchActive || filterStatus === 'draft') return;

          if (start.captured) {
            try { e.currentTarget?.releasePointerCapture?.(start.pointerId); } catch { }
          }

          if (!start.swiping) {
            setMonthSwipeDx(0);
            return;
          }

          const dx = e.clientX - start.startX;
          const dy = e.clientY - start.startY;
          const dt = Date.now() - start.at;
          const adx = Math.abs(dx);
          const ady = Math.abs(dy);
          if (dt > 1000) return;
          if (adx < 24) {
            setMonthSwipeDx(0);
            return;
          }
          if (adx < ady * 1.45) return;

          const threshold = getMonthNavThreshold();
          const shouldNav = adx >= threshold;
          const sign = dx > 0 ? 1 : -1;
          const maxDx = getMonthSwipeMax();

          if (!shouldNav) {
            setMonthSwipeAnimating(true);
            setMonthSwipeDx(0);
            setTimeout(() => setMonthSwipeAnimating(false), 220);
            return;
          }

          const delta = sign > 0 ? -1 : 1;
          const baseKey = String(filterMonth || currentMonthKey || '').trim();
          const candidate = shiftMonthKey(baseKey, delta);
          if (!candidate) {
            setMonthSwipeAnimating(true);
            setMonthSwipeDx(0);
            setTimeout(() => setMonthSwipeAnimating(false), 220);
            return;
          }

          if (String(candidate) > String(currentMonthKey)) {
            setMonthSwipeAnimating(true);
            setMonthSwipeDx(sign * Math.floor(maxDx * 0.55));
            setTimeout(() => {
              setMonthSwipeDx(0);
              setTimeout(() => setMonthSwipeAnimating(false), 200);
            }, 140);
            return;
          }

          setMonthSwipeAnimating(true);
          setMonthSwipeDx(sign * maxDx);
          setTimeout(() => {
            setFilterMonth(candidate);
            setMonthSwipeDx(-sign * maxDx);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setMonthSwipeDx(0);
                setTimeout(() => setMonthSwipeAnimating(false), 220);
              });
            });
          }, 140);
        } catch {
          // ignore
        }
      };

      const handleOrdersMonthSwipePointerCancel = () => {
        monthSwipePtrRef.current = null;
        setMonthSwipeDx(0);
      };

      const monthSwipeHint = monthSwipeDx > 0 ? 'Tháng trước' : (monthSwipeDx < 0 ? 'Tháng sau' : '');
      const rawTargetMonth = monthSwipeDx > 0
        ? shiftMonthKey(String(filterMonth || currentMonthKey || '').trim(), -1)
        : (monthSwipeDx < 0 ? shiftMonthKey(String(filterMonth || currentMonthKey || '').trim(), 1) : '');
      const monthSwipeTargetMonth = rawTargetMonth && String(rawTargetMonth) <= String(currentMonthKey) ? rawTargetMonth : '';
      const monthSwipeHintOpacity = Math.min(1, Math.abs(monthSwipeDx) / Math.max(1, getMonthNavThreshold()));
