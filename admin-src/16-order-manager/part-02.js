
      const loadStatusSyncQueue = () => {
        try {
          const raw = localStorage.getItem(STATUS_SYNC_QUEUE_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [];
        }
      };

      const persistStatusSyncQueue = (queue) => {
        try {
          localStorage.setItem(STATUS_SYNC_QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
        } catch {
          // ignore
        }
      };

      const setSyncingFor = (orderId, value) => {
        const id = String(orderId || '').trim();
        if (!id) return;
        setSyncingIds((prev) => {
          const next = { ...(prev || {}) };
          if (value) next[id] = true;
          else delete next[id];
          return next;
        });
      };

      const enqueueStatusSync = (orderId, nextStatus, prevStatus) => {
        const id = String(orderId || '').trim();
        const next = normalizeOrderStatus(nextStatus);
        const prev = normalizeOrderStatus(prevStatus);
        if (!id || !next) return;

        const curr = Array.isArray(statusSyncQueueRef.current) ? statusSyncQueueRef.current : [];
        const map = new Map(curr.map((x) => [String(x?.orderId || ''), x]));
        map.set(id, { orderId: id, nextStatus: next, prevStatus: prev, ts: Date.now() });
        const merged = Array.from(map.values()).sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0));
        statusSyncQueueRef.current = merged;
        persistStatusSyncQueue(merged);
        setSyncingFor(id, true);
      };

      const flushStatusSyncQueue = async () => {
        if (syncFlushInProgressRef.current) return;
        if (!navigator.onLine) return;

        const queue = Array.isArray(statusSyncQueueRef.current) ? statusSyncQueueRef.current.slice() : [];
        if (!queue.length) return;

        syncFlushInProgressRef.current = true;
        try {
          for (const ev of queue) {
            const id = String(ev?.orderId || '').trim();
            const next = normalizeOrderStatus(ev?.nextStatus);
            if (!id || !next) continue;
            setSyncingFor(id, true);
            try {
              await updateOrderStatus({ id, status: ev?.prevStatus || '' }, next, { silentToast: true, skipToastBatch: true, fromSync: true });
              // remove from queue on success
              const nextQueue = (Array.isArray(statusSyncQueueRef.current) ? statusSyncQueueRef.current : []).filter((x) => String(x?.orderId || '') !== id);
              statusSyncQueueRef.current = nextQueue;
              persistStatusSyncQueue(nextQueue);
              setSyncingFor(id, false);
            } catch {
              // keep it for later
              if (!navigator.onLine) break;
            }
          }
        } finally {
          syncFlushInProgressRef.current = false;
        }
      };

      useEffect(() => {
        // Load persisted queue (e.g., after refresh) and mark syncing badges.
        const q = loadStatusSyncQueue();
        statusSyncQueueRef.current = q;
        try {
          const ids = {};
          for (const ev of q) {
            const id = String(ev?.orderId || '').trim();
            if (id) ids[id] = true;
          }
          setSyncingIds(ids);
        } catch {
          // ignore
        }
        // Try flushing soon after mount.
        setTimeout(() => flushStatusSyncQueue(), 600);
      }, []);

      useEffect(() => {
        const onOnline = () => flushStatusSyncQueue();
        window.addEventListener('online', onOnline);
        const t = setInterval(() => flushStatusSyncQueue(), 8000);
        return () => {
          clearInterval(t);
          window.removeEventListener('online', onOnline);
        };
      }, []);

      const startPhoneLongPress = (e, phoneRaw) => {
        e?.stopPropagation?.();
        phoneLongPressFiredRef.current = false;
        maybeShowPhoneTip();
        // Hold-to-call: record press start and perform call on pointerup if held long enough.
        phonePressTimerRef.current = { t0: Date.now(), phoneRaw };
      };

      const cancelPhoneLongPress = (e) => {
        e?.stopPropagation?.();
        phonePressTimerRef.current = null;
      };

      const finishPhoneLongPress = (e, phoneRaw) => {
        e?.stopPropagation?.();
        const meta = phonePressTimerRef.current;
        phonePressTimerRef.current = null;

        const t0 = Number(meta?.t0) || 0;
        const heldMs = t0 ? (Date.now() - t0) : 0;
        if (heldMs >= 520) {
          phoneLongPressFiredRef.current = true;
          handlePhoneCall(phoneRaw ?? meta?.phoneRaw);
        }
      };

      const markOrderRecentlyUpdated = (orderId) => {
        const id = String(orderId || '').trim();
        if (!id) return;
        setRecentlyUpdatedIds((prev) => ({ ...prev, [id]: Date.now() }));

        const timers = recentUpdateTimersRef.current;
        try {
          const old = timers.get(id);
          if (old) clearTimeout(old);
        } catch {
          // ignore
        }
        const t = setTimeout(() => {
          setRecentlyUpdatedIds((prev) => {
            const next = { ...(prev || {}) };
            delete next[id];
            return next;
          });
          try { timers.delete(id); } catch {}
        }, 9000);
        timers.set(id, t);
      };

      const normalizeSearchQuery = (value) => {
        return String(value || '').replace(/\s+/g, ' ').trim();
      };

      const getSearchDigits = (value) => String(value || '').replace(/[^0-9]+/g, '');

      const getOrderAgeDays = (order) => {
        try {
          const t = new Date(order?.created_at).getTime();
          if (!Number.isFinite(t)) return 0;
          const diff = Date.now() - t;
          if (!Number.isFinite(diff) || diff <= 0) return 0;
          return Math.floor(diff / DAY_MS);
        } catch {
          return 0;
        }
      };

      const isOverduePending = (order) => {
        const status = String(order?.status || '').trim();
        if (status !== 'pending') return false;
        return getOrderAgeDays(order) >= OVERDUE_PENDING_DAYS;
      };

      const normalizeOrderStatus = (raw) => {
        const s = String(raw ?? '').trim().toLowerCase();
        if (s === 'cancelled') return 'canceled';
        return s;
      };

      const ORDER_STATUS_FLOW = React.useMemo(() => ([
        'draft',
        'pending',
        'processing',
        'done',
        'paid',
      ]), []);

      const getSwipeTargetStatus = (currentStatus, dir) => {
        const current = normalizeOrderStatus(currentStatus);
        if (!current || current === 'canceled') return null;
        const idx = ORDER_STATUS_FLOW.indexOf(current);
        if (idx < 0) return null;
        if (dir === 'left') return ORDER_STATUS_FLOW[idx + 1] || null;
        if (dir === 'right') return ORDER_STATUS_FLOW[idx - 1] || null;
        return null;
      };

      const getSwipeLabelMeta = (targetStatus) => {
        const s = normalizeOrderStatus(targetStatus);
        if (!s) return { label: '', icon: 'fa-circle' };
        const label = ORDER_STATUS_OPTIONS.find((o) => normalizeOrderStatus(o?.value) === s)?.label || '';
        const icon = (() => {
          switch (s) {
            case 'draft': return 'fa-file-lines';
            case 'pending': return 'fa-hourglass-half';
            case 'processing': return 'fa-truck';
            case 'done': return 'fa-check';
            case 'paid': return 'fa-money-bill-wave';
            case 'canceled': return 'fa-ban';
            default: return 'fa-circle';
          }
        })();
        return { label, icon };
      };

      const getDraftRemainingDays = (order) => {
        const status = normalizeOrderStatus(order?.status);
        if (status !== 'draft') return null;
        const remaining = DRAFT_AUTO_DELETE_DAYS - getOrderAgeDays(order);
        return Number.isFinite(remaining) ? remaining : null;
      };

      const isDraftExpiringSoon = (order) => {
        const remaining = getDraftRemainingDays(order);
        if (!Number.isFinite(remaining)) return false;
        return remaining > 0 && remaining <= DRAFT_WARN_REMAINING_DAYS;
      };

      const resetOrderForm = (presetProductId) => {
        setForm({
          customer_name: "",
          phone: "",
          address: "",
          note: "",
          items: [{ product_id: presetProductId || "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
          adjustment_items: [{ amount: '', note: '' }],
          adjustment_amount: 0,
          adjustment_note: "",
          status: "pending"
        });
        setItemSearches(['']);
        setCustomerLookup(null);
        setOpenProductDropdownIdx(null);
      };

      useEffect(() => {
        const onDocMouseDown = (e) => {
          if (openProductDropdownIdx == null) return;
          const el = productDropdownRefs.current?.[openProductDropdownIdx];
          if (el && !el.contains(e.target)) {
            setOpenProductDropdownIdx(null);
          }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
      }, [openProductDropdownIdx]);

      const parseMoney = (value) => {
        return window.KTM.money.parseMoney(value);
      };

      const parseSignedMoney = (value) => window.KTM.money.parseSignedMoney(value);

      const formatVND = (n) => window.KTM.money.formatVND(n);

      const normalizeAdjustmentFormItems = (raw) => {
        const arr = Array.isArray(raw) ? raw : [];
        const items = arr.map((it) => ({
          amount: String(it?.amount ?? ''),
          note: String(it?.note ?? ''),
        }));
        return items.length ? items : [{ amount: '', note: '' }];
      };

      const getAdjustmentFormItemsFromOrder = (order) => {
        try {
          const items = window.KTM.orders.getOrderAdjustmentItems(order);
          const ui = (Array.isArray(items) ? items : [])
            .map((it) => ({
              amount: it?.amount === 0 ? '' : String(it?.amount ?? ''),
              note: String(it?.note ?? '').trim(),
            }))
            .filter((it) => String(it.amount || '').trim() || String(it.note || '').trim());
          return ui.length ? ui : [{ amount: '', note: '' }];
        } catch {
          return [{ amount: '', note: '' }];
        }
      };

      const cleanAdjustmentItemsForPayload = (formItems) => {
        const arr = Array.isArray(formItems) ? formItems : [];
        return arr
          .map((it) => ({
            amount: parseSignedMoney(it?.amount),
            note: String(it?.note || '').trim(),
          }))
          .filter((it) => it.amount !== 0 || !!it.note);
      };

      const getAdjustmentDerivedFromForm = (formLike) => {
        const adjFormItems = Array.isArray(formLike?.adjustment_items) ? formLike.adjustment_items : [];
        const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
        const amount = computeAdjustmentSum(cleanAdjItems);
        const summaryText = (() => {
          if (!cleanAdjItems.length) return '';
          const notes = cleanAdjItems
            .map((it) => String(it?.note || '').trim())
            .filter(Boolean);
          if (notes.length) return notes.join(' • ');
          return cleanAdjItems.length > 1 ? `${cleanAdjItems.length} mục` : '';
        })();
        return { cleanAdjItems, amount, summaryText };
      };

      const computeAdjustmentSum = (payloadItems) => {
        const arr = Array.isArray(payloadItems) ? payloadItems : [];
        return arr.reduce((sum, it) => sum + (Number(it?.amount) || 0), 0);
      };

      const serializeAdjustmentItems = (payloadItems) => {
        const arr = Array.isArray(payloadItems) ? payloadItems : [];
        return arr.length ? JSON.stringify(arr) : '';
      };

      const parseShipFeeFromNote = (note) => window.KTM.money.parseShipFeeFromNote(note);

      const isValidPhone = (normalizedDigits) => window.KTM.phone.isValid(normalizedDigits);

      const normalizePhone = (value) => window.KTM.phone.normalize(value);

      const fetchOrderById = async (orderId) => {
        if (!orderId) return null;
        const data = await window.KTM.api.getJSON(`${API_BASE}/api/orders/${orderId}`, 'Lỗi tải đơn hàng');
        // Some handlers might wrap in {order: ...}
        if (data && typeof data === 'object' && data.order && typeof data.order === 'object') return data.order;
        return data;
      };

      const mergeOrdersById = (prevList, nextList) => {
        const prevArr = Array.isArray(prevList) ? prevList : [];
        const nextArr = Array.isArray(nextList) ? nextList : [];
        if (!prevArr.length) return nextArr;
        if (!nextArr.length) return prevArr;
        const map = new Map(prevArr.map((o) => [String(o?.id ?? ''), o]));
        for (const o of nextArr) {
          const id = String(o?.id ?? '');
          if (!id) continue;
          map.set(id, o);
        }
        return Array.from(map.values());
      };

      const ensureFullOrder = async (order) => {
        if (!order?.id) return order;
        // If we already have any items array with content, assume it's full enough.
        if (Array.isArray(order.items) && order.items.length) return order;
        try {
          const cached = orderDetailCacheRef.current?.get?.(String(order.id));
          if (cached && typeof cached === 'object' && Array.isArray(cached.items) && cached.items.length) return cached;
        } catch {
          // ignore
        }
        try {
          const full = await fetchOrderById(order.id);
          if (full && typeof full === 'object') {
            try {
              orderDetailCacheRef.current?.set?.(String(order.id), full);
            } catch {
              // ignore
            }
            setOrders((prev) => (
              Array.isArray(prev)
                ? prev.map((o) => (String(o?.id) === String(order.id) ? full : o))
                : prev
            ));
            return full;
          }
        } catch (e) {
          console.error('Fetch order by id error:', e);
        }
        return order;
      };

      const loadCustomerLookupCache = () => {
        try {
          const raw = localStorage.getItem(CUSTOMER_LOOKUP_CACHE_STORAGE_KEY);
          if (!raw) return;
          const obj = JSON.parse(raw);
          if (!obj || typeof obj !== 'object') return;
          const entries = Object.entries(obj);
          for (const [phone, value] of entries) {
            if (!phone || !value || typeof value !== 'object') continue;
            customerLookupCacheRef.current?.set(String(phone), value);
          }
        } catch {
          // ignore
        }
      };

      const persistCustomerLookupCache = () => {
        try {
          const map = customerLookupCacheRef.current;
          if (!map || typeof map.entries !== 'function') return;

          const arr = Array.from(map.entries())
            .filter(([k, v]) => k && v && typeof v === 'object' && Number.isFinite(v.ts))
            .sort((a, b) => (Number(b[1].ts) || 0) - (Number(a[1].ts) || 0))
            .slice(0, CUSTOMER_LOOKUP_CACHE_MAX_ENTRIES);

          const obj = {};
          for (const [k, v] of arr) obj[k] = v;
          localStorage.setItem(CUSTOMER_LOOKUP_CACHE_STORAGE_KEY, JSON.stringify(obj));
        } catch {
          // ignore
        }
      };

      useEffect(() => {
        loadCustomerLookupCache();
      }, []);

      const getPrefillFromOrders = (phone) => {
        const p = normalizePhone(phone);
        if (!p) return null;
        const list = Array.isArray(orders) ? orders : [];
        let best = null;
        let bestT = -1;
        for (const o of list) {
          if (!o) continue;
          if (normalizePhone(o.phone || '') !== p) continue;
          const t = new Date(o.created_at).getTime();
          const tt = Number.isFinite(t) ? t : 0;
          if (tt >= bestT) {
            bestT = tt;
            best = o;
          }
        }
        if (!best) return null;
        return {
          name: String(best.customer_name || '').trim(),
          address: String(best.address || '').trim(),
        };
      };

      const applyCustomerPrefill = (customer, phone) => {
        if (!customer) return;
        setForm((prev) => {
          if (phone && normalizePhone(prev.phone) !== phone) return prev;
          return {
            ...prev,
            customer_name: customer.name || prev.customer_name,
            address: customer.address || prev.address,
          };
        });
      };

      const applyQuickPrefillFromOrders = (phone) => {
        const pre = getPrefillFromOrders(phone);
        if (!pre) return;
        const p = normalizePhone(phone);
        setForm((prev) => {
          if (p && normalizePhone(prev.phone) !== p) return prev;
          const next = { ...prev };
          if (!String(prev.customer_name || '').trim() && pre.name) next.customer_name = pre.name;
          if (!String(prev.address || '').trim() && pre.address) next.address = pre.address;
          return next;
        });
      };

      const upsertCustomerLookupCacheFromForm = (rawPhone, rawName, rawAddress) => {
        try {
          const phone = normalizePhone(rawPhone);
          if (!phone) return;

          const name = String(rawName || '').trim();
          const address = String(rawAddress || '').trim();

