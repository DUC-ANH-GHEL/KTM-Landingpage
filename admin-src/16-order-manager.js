    // OrderManager component
    function OrderManager({ autoOpenCreateToken, autoOpenCreateProductId, showToast }) {
      const [orders, setOrders] = useState([]);
      const [ordersPageOffset, setOrdersPageOffset] = useState(0);
      const [ordersHasMore, setOrdersHasMore] = useState(false);
      const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
      const [allOrders, setAllOrders] = useState([]);
      const [loading, setLoading] = useState(true);
      const [loadingAllOrders, setLoadingAllOrders] = useState(false);
      const [draftExpiringOrders, setDraftExpiringOrders] = useState([]);
      const [loadingDraftExpiringOrders, setLoadingDraftExpiringOrders] = useState(false);
      const [orderSearchQuery, setOrderSearchQuery] = useState('');
      const [orderSearchResults, setOrderSearchResults] = useState([]);
      const [orderSearchLoading, setOrderSearchLoading] = useState(false);
      const [orderSearchError, setOrderSearchError] = useState('');
      const [saving, setSaving] = useState(false);
      const [deletingId, setDeletingId] = useState(null);
      const [updatingId, setUpdatingId] = useState(null);
      const [splitting, setSplitting] = useState(false);
      const [filterMonth, setFilterMonth] = useState(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      });
      const [filterStatus, setFilterStatus] = useState('');
      const [overdueOnly, setOverdueOnly] = useState(false);
      const [showModal, setShowModal] = useState(false);

      // Ops inspector drawer
      const [inspectorOpen, setInspectorOpen] = useState(false);
      const [inspectorOrder, setInspectorOrder] = useState(null);
      const [inspectorLoading, setInspectorLoading] = useState(false);
      const [inspectorError, setInspectorError] = useState('');
      const [inspectorEditMode, setInspectorEditMode] = useState(false);
      const inspectorRequestIdRef = useRef(0);

      // Mobile: quick action sheet (fast status updates + copy)
      const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
      const [mobileSheetOrder, setMobileSheetOrder] = useState(null);

      // Mobile: inline status popover (no sheet)
      const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
      const [statusPopoverOrder, setStatusPopoverOrder] = useState(null);
      const [statusPopoverPos, setStatusPopoverPos] = useState(() => ({ left: 12, top: 12, placement: 'bottom' }));
      const statusPopoverLongPressTimerRef = useRef(null);
      const statusPopoverLongPressFiredRef = useRef(false);

      const swipeRef = useRef({ active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0, lock: null, pointerId: null, captured: false });
      const [swipePreview, setSwipePreview] = useState(() => ({ id: null, dir: null }));
      const swipeConsumeClickRef = useRef(false);

      const orderDetailCacheRef = useRef(new Map());
      const prefetchTimerRef = useRef(null);
      const prefetchOrderIdRef = useRef(null);

      // Offline-friendly: status sync queue
      const STATUS_SYNC_QUEUE_KEY = 'ktm_orders_status_sync_queue_v1';
      const statusSyncQueueRef = useRef([]);
      const syncFlushInProgressRef = useRef(false);
      const [syncingIds, setSyncingIds] = useState(() => ({}));

      // Mobile: filter sheet + sticky mini-toolbar + card UX
      const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);
      const [mobileMiniToolbarVisible, setMobileMiniToolbarVisible] = useState(false);
      const [mobileContextHeaderVisible, setMobileContextHeaderVisible] = useState(false);
      const [expandedOrderIds, setExpandedOrderIds] = useState(() => new Set());
      const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState(() => ({}));

      // Mobile: pin/star + "today" quick filter
      const PINNED_STORAGE_KEY = 'ktm_orders_pinned_v1';
      const [pinnedOrderIds, setPinnedOrderIds] = useState(() => new Set());
      const [pinnedOnly, setPinnedOnly] = useState(false);
      const [todayOnly, setTodayOnly] = useState(false);

      // Mobile: search palette overlay
      const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);
      const [searchPaletteQuery, setSearchPaletteQuery] = useState('');
      const [searchHistory, setSearchHistory] = useState(() => []);
      const searchPaletteInputRef = useRef(null);
      const searchBtnLongPressTimerRef = useRef(null);
      const searchBtnLongPressFiredRef = useRef(false);
      const pullToSearchRef = useRef({ active: false, startY: 0, startX: 0, fired: false });

      const [isMobileViewport, setIsMobileViewport] = useState(() => {
        try {
          return (window?.innerWidth || 1024) < 768;
        } catch {
          return false;
        }
      });

      const INITIAL_MOBILE_RENDER = 24;
      const MOBILE_RENDER_STEP = 20;
      const [mobileRenderLimit, setMobileRenderLimit] = useState(INITIAL_MOBILE_RENDER);
      const mobileListSentinelRef = useRef(null);

      const phonePressTimerRef = useRef(null);
      const phoneLongPressFiredRef = useRef(false);
      const recentUpdateTimersRef = useRef(new Map());
      const statusToastBatchRef = useRef({ timer: null, events: [] });
      const scrollRafRef = useRef(null);

      const PHONE_TIP_STORAGE_KEY = 'ktm_orders_phone_tip_v1';
      const ORDER_SEARCH_HISTORY_KEY = 'ktm_orders_search_history_v1';
      const [customerLookup, setCustomerLookup] = useState(null);
      const [showPhoneHistory, setShowPhoneHistory] = useState(false);
      const [phoneHistoryOrders, setPhoneHistoryOrders] = useState([]);
      const [phoneHistoryLoading, setPhoneHistoryLoading] = useState(false);
      const [splitDeliverNow, setSplitDeliverNow] = useState([]);
      const [form, setForm] = useState({
        customer_name: "",
        phone: "",
        address: "",
        note: "",
        items: [{ product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
        adjustment_items: [{ amount: '', note: '' }],
        // Stored/derived fields (back-compat with API/database)
        adjustment_amount: 0,
        adjustment_note: "",
        status: "pending"
      });
      const [itemSearches, setItemSearches] = useState(['']);
      const [openProductDropdownIdx, setOpenProductDropdownIdx] = useState(null);
      const productDropdownRefs = useRef({});
      const [products, setProducts] = useState([]);
      const [editingId, setEditingId] = useState(null);
      const lastAutoOpenCreateTokenRef = useRef(null);
      const phoneLookupTimerRef = useRef(null);
      const phoneLookupRequestIdRef = useRef(0);
      const phoneHistoryTimerRef = useRef(null);
      const phoneHistoryRequestIdRef = useRef(0);
      const phoneHistoryCacheRef = useRef(new Map());
      const orderSearchTimerRef = useRef(null);
      const orderSearchRequestIdRef = useRef(0);
      const orderSearchCacheRef = useRef(new Map());
      const customerLookupCacheRef = useRef(new Map());
      const lastLookupPhoneRef = useRef('');
      const orderModalBodyRef = useRef(null);
      const orderSearchInputRef = useRef(null);
      const lastItemsLenRef = useRef(0);
      const lastCreatedOrderRef = useRef(null); // { id, fingerprint, ts }
      const PHONE_LOOKUP_MIN_LEN = 9;
      const PHONE_LOOKUP_DEBOUNCE_MS = 150;
      const PHONE_HISTORY_DEBOUNCE_MS = 250;
      const PHONE_HISTORY_CACHE_TTL_MS = 3 * 60 * 1000;
      const CUSTOMER_LOOKUP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
      const CUSTOMER_LOOKUP_CACHE_TTL_NOT_FOUND_MS = 5 * 60 * 1000;
      const CUSTOMER_LOOKUP_CACHE_STORAGE_KEY = 'ktm_customer_lookup_cache_v1';
      const CUSTOMER_LOOKUP_CACHE_MAX_ENTRIES = 200;

      const OVERDUE_PENDING_DAYS = 3;
      const DRAFT_AUTO_DELETE_DAYS = 3;
      const DRAFT_WARN_REMAINING_DAYS = 1;
      const DAY_MS = 24 * 60 * 60 * 1000;

      // Search performance knobs
      const ORDER_SEARCH_DEBOUNCE_MS = 120;
      const ORDER_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
      const ORDER_SEARCH_CACHE_MAX_ENTRIES = 80;
      const ORDER_SEARCH_MIN_CHARS = 2;
      const ORDER_SEARCH_MIN_DIGITS = 4;

      // Orders list performance knobs
      const ORDERS_PAGE_SIZE = 60;

      const isSearchActive = React.useMemo(() => {
        return String(orderSearchQuery || '').trim().length > 0;
      }, [orderSearchQuery]);

      const ORDER_STATUS_OPTIONS = React.useMemo(() => ([
        { value: 'draft', label: 'Đơn nháp' },
        { value: 'pending', label: 'Chờ xử lý' },
        { value: 'processing', label: 'Đang vận chuyển' },
        { value: 'done', label: 'Hoàn thành' },
        { value: 'paid', label: 'Đã nhận tiền' },
        { value: 'canceled', label: 'Hủy đơn' },
      ]), []);

      const openMobileSheet = (order) => {
        setMobileSheetOrder(order);
        setMobileSheetOpen(true);
      };

      const openStatusPopover = (order, anchorEl) => {
        try {
          const rect = anchorEl?.getBoundingClientRect?.();
          const vw = window.innerWidth || 360;
          const vh = window.innerHeight || 640;
          const popW = 230;
          const popH = 280;
          const left = Math.min(Math.max(10, Math.round(rect?.left ?? 10)), Math.max(10, vw - popW - 10));
          let top = Math.round((rect?.bottom ?? 10) + 8);
          let placement = 'bottom';
          if (top + popH > vh - 10) {
            top = Math.max(10, Math.round((rect?.top ?? 10) - 8 - popH));
            placement = 'top';
          }
          setStatusPopoverPos({ left, top, placement });
        } catch {
          setStatusPopoverPos({ left: 12, top: 12, placement: 'bottom' });
        }
        setStatusPopoverOrder(order);
        setStatusPopoverOpen(true);
      };

      const closeStatusPopover = () => {
        setStatusPopoverOpen(false);
        setTimeout(() => setStatusPopoverOrder(null), 120);
      };

      useEffect(() => {
        if (!statusPopoverOpen) return;
        const onKeyDown = (e) => {
          if (e.key === 'Escape') closeStatusPopover();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, [statusPopoverOpen]);

      const closeMobileSheet = () => {
        setMobileSheetOpen(false);
        // Let the close animation finish before clearing the content
        setTimeout(() => setMobileSheetOrder(null), 180);
      };

      const openMobileFilterSheet = () => {
        setMobileFilterSheetOpen(true);
      };

      const closeMobileFilterSheet = () => {
        setMobileFilterSheetOpen(false);
      };

      const toggleOrderExpanded = (orderId) => {
        const id = String(orderId || '').trim();
        if (!id) return;
        setExpandedOrderIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      };

      useEffect(() => {
        try {
          const raw = localStorage.getItem(PINNED_STORAGE_KEY);
          if (!raw) return;
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) return;
          setPinnedOrderIds(new Set(arr.map((x) => String(x || '').trim()).filter(Boolean)));
        } catch {
          // ignore
        }
      }, []);

      useEffect(() => {
        try {
          const arr = Array.from(pinnedOrderIds || []).map((x) => String(x || '').trim()).filter(Boolean);
          localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(arr));
        } catch {
          // ignore
        }
      }, [pinnedOrderIds]);

      const togglePinnedOrder = (orderId) => {
        const id = String(orderId || '').trim();
        if (!id) return;
        setPinnedOrderIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      };

      useEffect(() => {
        try {
          const raw = localStorage.getItem(ORDER_SEARCH_HISTORY_KEY);
          if (!raw) return;
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) return;
          setSearchHistory(arr.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10));
        } catch {
          // ignore
        }
      }, []);

      const persistSearchHistory = (next) => {
        try {
          localStorage.setItem(ORDER_SEARCH_HISTORY_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      };

      const addSearchHistory = (query) => {
        const q = String(query || '').trim();
        if (!q) return;
        setSearchHistory((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const next = [q, ...list.filter((x) => String(x || '').trim().toLowerCase() !== q.toLowerCase())].slice(0, 10);
          persistSearchHistory(next);
          return next;
        });
      };

      const openSearchPalette = (prefill) => {
        const q = String(prefill ?? orderSearchQuery ?? '').trim();
        setSearchPaletteQuery(q);
        setSearchPaletteOpen(true);
        setTimeout(() => {
          try { searchPaletteInputRef.current?.focus?.(); } catch {}
        }, 0);
      };

      const closeSearchPalette = () => {
        setSearchPaletteOpen(false);
      };

      useEffect(() => {
        if (!searchPaletteOpen) return;
        const onKeyDown = (e) => {
          if (e.key === 'Escape') closeSearchPalette();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, [searchPaletteOpen]);

      useEffect(() => {
        if (!isMobileViewport) return;
        const onTouchStart = (e) => {
          if (searchPaletteOpen) return;
          if ((window.scrollY || 0) > 6) return;
          const t = e.touches && e.touches[0];
          if (!t) return;
          pullToSearchRef.current = { active: true, startY: t.clientY, startX: t.clientX, fired: false };
        };
        const onTouchMove = (e) => {
          const s = pullToSearchRef.current;
          if (!s?.active || s.fired) return;
          if ((window.scrollY || 0) > 6) return;
          const t = e.touches && e.touches[0];
          if (!t) return;
          const dy = t.clientY - s.startY;
          const dx = t.clientX - s.startX;
          if (Math.abs(dx) > 24) return;
          if (dy > 92) {
            s.fired = true;
            openSearchPalette(orderSearchQuery);
          }
        };
        const onTouchEnd = () => {
          pullToSearchRef.current = { active: false, startY: 0, startX: 0, fired: false };
        };
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });
        return () => {
          window.removeEventListener('touchstart', onTouchStart);
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
          window.removeEventListener('touchcancel', onTouchEnd);
        };
      }, [isMobileViewport, searchPaletteOpen, orderSearchQuery]);

      const isOrderTodayNeedsAttention = (order) => {
        try {
          const status = normalizeOrderStatus(order?.status);
          if (!(status === 'pending' || status === 'processing')) return false;
          const t = new Date(order?.created_at);
          if (!Number.isFinite(t.getTime())) return false;
          const now = new Date();
          return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
        } catch {
          return false;
        }
      };

      useEffect(() => {
        let mq;
        const update = () => {
          try {
            if (mq) setIsMobileViewport(!!mq.matches);
            else setIsMobileViewport((window?.innerWidth || 1024) < 768);
          } catch {
            setIsMobileViewport(false);
          }
        };

        try {
          mq = window.matchMedia?.('(max-width: 767.98px)');
          if (mq?.addEventListener) mq.addEventListener('change', update);
          else if (mq?.addListener) mq.addListener(update);
        } catch {
          mq = null;
        }

        window.addEventListener('resize', update);
        update();

        return () => {
          try {
            if (mq?.removeEventListener) mq.removeEventListener('change', update);
            else if (mq?.removeListener) mq.removeListener(update);
          } catch {
            // ignore
          }
          window.removeEventListener('resize', update);
        };
      }, []);

      useEffect(() => {
        const cls = 'admin-sheet-open';
        if (mobileSheetOpen || mobileFilterSheetOpen || statusPopoverOpen) document.body.classList.add(cls);
        else document.body.classList.remove(cls);
        return () => document.body.classList.remove(cls);
      }, [mobileSheetOpen, mobileFilterSheetOpen, statusPopoverOpen]);

      useEffect(() => {
        if (!mobileSheetOpen && !mobileFilterSheetOpen && !statusPopoverOpen) return;
        const onKeyDown = (e) => {
          if (e.key === 'Escape') {
            if (mobileSheetOpen) closeMobileSheet();
            if (mobileFilterSheetOpen) closeMobileFilterSheet();
            if (statusPopoverOpen) closeStatusPopover();
          }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
      }, [mobileSheetOpen, mobileFilterSheetOpen, statusPopoverOpen]);

      const maybeShowPhoneTip = () => {
        try {
          if (localStorage.getItem(PHONE_TIP_STORAGE_KEY)) return;
          localStorage.setItem(PHONE_TIP_STORAGE_KEY, '1');
          if (typeof showToast === 'function') {
            showToast('Tip: Chạm SĐT để gọi • Giữ để copy', 'info', { durationMs: 7000 });
          }
        } catch {
          // ignore
        }
      };

      const getOrderAddressText = (order) => {
        return String(order?.address || '')
          .replace(/\s*\n+\s*/g, ', ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const getOrderNoteText = (order) => {
        return String(order?.note || '')
          .replace(/\s*\n+\s*/g, ' — ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const handlePhoneCall = (phoneRaw) => {
        const phone = normalizePhone(String(phoneRaw || '')).replace(/[^0-9+]/g, '');
        if (!phone) return;
        try {
          window.location.href = `tel:${phone}`;
        } catch {
          // ignore
        }
      };

      const handlePhoneCopy = async (phoneRaw) => {
        const phone = normalizePhone(String(phoneRaw || '')).replace(/[^0-9+]/g, '');
        if (!phone) return;
        try {
          await (navigator.clipboard?.writeText?.(phone) ?? Promise.reject(new Error('Clipboard not available')));
          if (typeof showToast === 'function') showToast('Đã copy SĐT', 'success');
        } catch {
          if (typeof showToast === 'function') showToast('Không copy được SĐT', 'danger');
        }
      };

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
        try {
          if (phonePressTimerRef.current) clearTimeout(phonePressTimerRef.current);
        } catch {
          // ignore
        }
        phonePressTimerRef.current = setTimeout(() => {
          phoneLongPressFiredRef.current = true;
          handlePhoneCopy(phoneRaw);
        }, 520);
      };

      const cancelPhoneLongPress = (e) => {
        e?.stopPropagation?.();
        try {
          if (phonePressTimerRef.current) clearTimeout(phonePressTimerRef.current);
        } catch {
          // ignore
        }
        phonePressTimerRef.current = null;
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

          // Avoid overwriting an existing cached profile with blanks.
          if (!name && !address) return;

          customerLookupCacheRef.current?.set(phone, {
            ts: Date.now(),
            status: 'found',
            customer: {
              phone,
              name: name || null,
              address: address || null,
            },
          });
          persistCustomerLookupCache();
        } catch {
          // ignore
        }
      };

      const lookupCustomerByPhone = async (rawPhone) => {
        const phone = normalizePhone(rawPhone);
        if (!phone) return;

        // Instant perceived speed: prefill from recent orders even before API responds.
        applyQuickPrefillFromOrders(phone);

        const cached = customerLookupCacheRef.current?.get(phone);
        if (cached && Number.isFinite(cached.ts)) {
          const age = Date.now() - cached.ts;
          const ttl = cached.status === 'found' ? CUSTOMER_LOOKUP_CACHE_TTL_MS : CUSTOMER_LOOKUP_CACHE_TTL_NOT_FOUND_MS;
          if (age >= 0 && age <= ttl) {
            setCustomerLookup({ status: cached.status, phone, customer: cached.customer });
            if (cached.status === 'found' && cached.customer) {
              applyCustomerPrefill(cached.customer, phone);
            }
            return;
          }
        }

        const requestId = ++phoneLookupRequestIdRef.current;
        setCustomerLookup({ status: 'loading', phone });
        try {
          const data = await window.KTM.api.getJSON(
            `${API_BASE}/api/customers?phone=${encodeURIComponent(phone)}`,
            'Lỗi tra cứu khách'
          );
          if (phoneLookupRequestIdRef.current !== requestId) return;

          if (data && data.exists && data.customer) {
            customerLookupCacheRef.current?.set(phone, { ts: Date.now(), status: 'found', customer: data.customer });
            persistCustomerLookupCache();
            setCustomerLookup({ status: 'found', phone, customer: data.customer });
            applyCustomerPrefill(data.customer, phone);
            return;
          }

          customerLookupCacheRef.current?.set(phone, { ts: Date.now(), status: 'not-found', customer: null });
          persistCustomerLookupCache();
          setCustomerLookup({ status: 'not-found', phone });
        } catch (e) {
          if (phoneLookupRequestIdRef.current !== requestId) return;
          console.error('Customer lookup error:', e);
          setCustomerLookup({ status: 'error', phone });
        }
      };

      const handlePhoneChange = (nextPhone) => {
        const digitsOnly = normalizePhone(nextPhone);
        // Quick prefill from recent orders (instant) while typing.
        const pre = getPrefillFromOrders(digitsOnly);
        setForm((prev) => {
          const next = { ...prev, phone: digitsOnly };
          if (pre) {
            if (!String(prev.customer_name || '').trim() && pre.name) next.customer_name = pre.name;
            if (!String(prev.address || '').trim() && pre.address) next.address = pre.address;
          }
          return next;
        });
        setShowPhoneHistory(false);

        if (phoneLookupTimerRef.current) {
          clearTimeout(phoneLookupTimerRef.current);
          phoneLookupTimerRef.current = null;
        }

        const normalized = digitsOnly;
        if (normalized.length < PHONE_LOOKUP_MIN_LEN) {
          setCustomerLookup(null);
          return;
        }

        // If phone is already valid (paste / complete), lookup immediately for best perceived speed.
        if (isValidPhone(normalized) && normalized !== lastLookupPhoneRef.current) {
          lastLookupPhoneRef.current = normalized;
          lookupCustomerByPhone(normalized);
          return;
        }

        phoneLookupTimerRef.current = setTimeout(() => {
          const p = normalizePhone(digitsOnly);
          if (!isValidPhone(p)) return;
          if (p === lastLookupPhoneRef.current) return;
          lastLookupPhoneRef.current = p;
          lookupCustomerByPhone(p);
        }, PHONE_LOOKUP_DEBOUNCE_MS);
      };

      const handlePhoneBlur = () => {
        const normalized = normalizePhone(form.phone);
        if (normalized.length < PHONE_LOOKUP_MIN_LEN) return;
        if (!isValidPhone(normalized)) return;
        if (normalized === lastLookupPhoneRef.current) return;
        lastLookupPhoneRef.current = normalized;
        lookupCustomerByPhone(normalized);
      };

      // Lock background scroll + hide bottom nav when modal open (especially on iOS)
      useEffect(() => {
        if (showModal) {
          document.body.classList.add('order-modal-open');
          document.body.style.overflow = 'hidden';
        } else {
          document.body.classList.remove('order-modal-open');
          document.body.style.overflow = '';
        }
        return () => {
          document.body.classList.remove('order-modal-open');
          document.body.style.overflow = '';
        };
      }, [showModal]);

      const itemsLen = Array.isArray(form.items) ? form.items.length : 0;
      useEffect(() => {
        if (!showModal) {
          lastItemsLenRef.current = itemsLen;
          return;
        }

        if (itemsLen > lastItemsLenRef.current) {
          setTimeout(() => {
            const el = orderModalBodyRef.current;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
          }, 0);
        }

        lastItemsLenRef.current = itemsLen;
      }, [showModal, itemsLen]);

      useEffect(() => {
        return () => {
          if (phoneLookupTimerRef.current) {
            clearTimeout(phoneLookupTimerRef.current);
            phoneLookupTimerRef.current = null;
          }
          if (phoneHistoryTimerRef.current) {
            clearTimeout(phoneHistoryTimerRef.current);
            phoneHistoryTimerRef.current = null;
          }
        };
      }, []);

      useEffect(() => {
        // Keep phone history accurate without requiring full month orders loaded.
        if (!showModal) return;

        if (phoneHistoryTimerRef.current) {
          clearTimeout(phoneHistoryTimerRef.current);
          phoneHistoryTimerRef.current = null;
        }

        const phone = normalizePhone(form?.phone || '');
        if (!isValidPhone(phone)) {
          setPhoneHistoryOrders([]);
          setPhoneHistoryLoading(false);
          return;
        }

        phoneHistoryTimerRef.current = setTimeout(async () => {
          const key = String(phone);
          const cached = phoneHistoryCacheRef.current?.get(key);
          if (cached && Number.isFinite(cached.ts) && (Date.now() - cached.ts) <= PHONE_HISTORY_CACHE_TTL_MS) {
            setPhoneHistoryOrders(Array.isArray(cached.orders) ? cached.orders : []);
            setPhoneHistoryLoading(false);
            return;
          }

          const requestId = ++phoneHistoryRequestIdRef.current;
          setPhoneHistoryLoading(true);
          try {
            const url = `${API_BASE}/api/orders?search=${encodeURIComponent(phone)}`;
            const data = await window.KTM.api.getJSON(url, 'Lỗi tải lịch sử đơn theo SĐT');
            if (phoneHistoryRequestIdRef.current !== requestId) return;

            const list = Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : []);
            setPhoneHistoryOrders(list);
            try {
              const cache = phoneHistoryCacheRef.current;
              if (cache && typeof cache.set === 'function') {
                cache.set(key, { ts: Date.now(), orders: list });
                if (cache.size > 100) {
                  // Drop oldest entries
                  const entries = Array.from(cache.entries()).sort((a, b) => (Number(a?.[1]?.ts) || 0) - (Number(b?.[1]?.ts) || 0));
                  const toDrop = Math.max(0, entries.length - 100);
                  for (let i = 0; i < toDrop; i++) cache.delete(entries[i][0]);
                }
              }
            } catch {
              // ignore
            }
          } catch (e) {
            if (phoneHistoryRequestIdRef.current !== requestId) return;
            console.error('Phone history fetch error:', e);
            setPhoneHistoryOrders([]);
          } finally {
            if (phoneHistoryRequestIdRef.current !== requestId) return;
            setPhoneHistoryLoading(false);
          }
        }, PHONE_HISTORY_DEBOUNCE_MS);

        return () => {
          if (phoneHistoryTimerRef.current) {
            clearTimeout(phoneHistoryTimerRef.current);
            phoneHistoryTimerRef.current = null;
          }
        };
      }, [showModal, form?.phone]);

      useEffect(() => {
        loadProducts();
      }, []);

      useEffect(() => {
        // Search mode must show ALL data and be independent of filters.
        // Avoid reloading month-filtered list while searching.
        if (isSearchActive) return;
        loadOrders();
      }, [filterMonth, isSearchActive]);

      useEffect(() => {
        // Always compute overdue alerts on ALL orders (independent from month filter)
        loadAllOrdersForAlerts();
      }, []);

      useEffect(() => {
        if (!autoOpenCreateToken) return;
        if (lastAutoOpenCreateTokenRef.current === autoOpenCreateToken) return;
        lastAutoOpenCreateTokenRef.current = autoOpenCreateToken;
        openCreateModal(autoOpenCreateProductId);
      }, [autoOpenCreateToken]);

      const getStatusLabel = (status) => {
        if (status === 'draft') return 'Đơn nháp';
        if (status === 'pending') return 'Chờ xử lý';
        if (status === 'processing') return 'Đang vận chuyển';
        if (status === 'done') return 'Hoàn thành';
        if (status === 'paid') return 'Đã nhận tiền';
        if (status === 'cancelled') return 'Hủy đơn';
        if (status === 'canceled') return 'Hủy đơn';
        return status || '';
      };

      const getStatusBadgeClass = (status) => {
        if (status === 'draft') return 'bg-light text-dark';
        if (status === 'pending') return 'bg-secondary';
        if (status === 'processing') return 'bg-warning text-dark';
        if (status === 'done') return 'bg-success';
        if (status === 'paid') return 'bg-primary';
        if (status === 'cancelled') return 'bg-danger';
        if (status === 'canceled') return 'bg-danger';
        return 'bg-light text-dark';
      };

      const sortedOrders = React.useMemo(() => {
        const list = window.KTM.orders.sortOrders(orders);
        const pins = pinnedOrderIds;
        if (!pins || !(pins instanceof Set) || pins.size === 0) return list;
        const arr = Array.isArray(list) ? list.slice() : [];
        // keep existing sort order; just lift pinned to top
        arr.sort((a, b) => {
          const ap = pins.has(String(a?.id ?? '')) ? 1 : 0;
          const bp = pins.has(String(b?.id ?? '')) ? 1 : 0;
          return bp - ap;
        });
        return arr;
      }, [orders, pinnedOrderIds]);

      const sortedAllOrders = React.useMemo(() => {
        return window.KTM.orders.sortOrders(allOrders);
      }, [allOrders]);

      const overduePendingOrdersAll = React.useMemo(() => {
        const list = Array.isArray(sortedAllOrders) ? sortedAllOrders : [];
        const overdue = list.filter((o) => isOverduePending(o));
        // oldest first
        overdue.sort((a, b) => {
          const ta = new Date(a?.created_at).getTime();
          const tb = new Date(b?.created_at).getTime();
          return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
        });
        return overdue;
      }, [sortedAllOrders]);

      const draftExpiringOrdersAll = React.useMemo(() => {
        const list = Array.isArray(draftExpiringOrders) ? draftExpiringOrders : [];
        const expiring = list.filter((o) => {
          // Server should already send only expiring drafts, but keep a safe client filter too.
          return isDraftExpiringSoon(o);
        });
        expiring.sort((a, b) => {
          const ta = new Date(a?.created_at).getTime();
          const tb = new Date(b?.created_at).getTime();
          return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
        });
        return expiring;
      }, [draftExpiringOrders]);

      const displayOrders = React.useMemo(() => {
        if (overdueOnly) return overduePendingOrdersAll;
        let list = sortedOrders;
        if (pinnedOnly) {
          const pins = pinnedOrderIds;
          list = (Array.isArray(list) ? list : []).filter((o) => pins?.has?.(String(o?.id ?? '')));
        }
        if (todayOnly) {
          list = (Array.isArray(list) ? list : []).filter((o) => isOrderTodayNeedsAttention(o));
        }
        return list;
      }, [overdueOnly, overduePendingOrdersAll, sortedOrders, pinnedOnly, pinnedOrderIds, todayOnly]);

      const filteredOrders = React.useMemo(() => {
        // When overdueOnly is enabled, we show the overdue-pending list regardless of other filters.
        if (overdueOnly) return displayOrders;
        const s = String(filterStatus || '').trim();
        if (!s) return displayOrders;
        return (Array.isArray(displayOrders) ? displayOrders : []).filter((o) => String(o?.status || '').trim() === s);
      }, [displayOrders, filterStatus, overdueOnly]);

      const sortedSearchResults = React.useMemo(() => {
        return window.KTM.orders.sortOrders(orderSearchResults);
      }, [orderSearchResults]);

      const ordersToRender = React.useMemo(() => {
        return isSearchActive ? sortedSearchResults : filteredOrders;
      }, [filteredOrders, isSearchActive, sortedSearchResults]);

      const mobileOrdersToRender = React.useMemo(() => {
        const list = Array.isArray(ordersToRender) ? ordersToRender : [];
        if (!isMobileViewport) return list;
        return list.slice(0, Math.max(0, Number(mobileRenderLimit) || 0));
      }, [isMobileViewport, mobileRenderLimit, ordersToRender]);

      useEffect(() => {
        // Reset virtualization window when filters/search changes.
        if (!isMobileViewport) return;
        setMobileRenderLimit(INITIAL_MOBILE_RENDER);
      }, [isMobileViewport, filterStatus, overdueOnly, filterMonth, orderSearchQuery]);

      useEffect(() => {
        if (!isMobileViewport) return;
        const total = Array.isArray(ordersToRender) ? ordersToRender.length : 0;
        if (mobileRenderLimit >= total) return;

        const sentinel = mobileListSentinelRef.current;
        if (!sentinel) return;

        const io = new IntersectionObserver(
          (entries) => {
            const hit = Array.isArray(entries) && entries.some((en) => en?.isIntersecting);
            if (!hit) return;
            setMobileRenderLimit((prev) => Math.min((Number(prev) || 0) + MOBILE_RENDER_STEP, total));
          },
          { root: null, rootMargin: '520px 0px', threshold: 0 }
        );

        io.observe(sentinel);
        return () => io.disconnect();
      }, [isMobileViewport, mobileRenderLimit, ordersToRender]);

      useEffect(() => {
        if (!isMobileViewport) {
          setMobileMiniToolbarVisible(false);
          setMobileContextHeaderVisible(false);
          return;
        }
        const onScroll = () => {
          if (scrollRafRef.current) return;
          scrollRafRef.current = window.requestAnimationFrame(() => {
            scrollRafRef.current = null;
            const y = window.scrollY || document.documentElement.scrollTop || 0;
            setMobileMiniToolbarVisible(y > 140);
            setMobileContextHeaderVisible(y > 60);
          });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => {
          window.removeEventListener('scroll', onScroll);
          if (scrollRafRef.current) {
            window.cancelAnimationFrame(scrollRafRef.current);
            scrollRafRef.current = null;
          }
        };
      }, [isMobileViewport]);

      useEffect(() => {
        if (!isMobileViewport) {
          try {
            document.documentElement.style.removeProperty('--ktm-mobile-bottom-nav-h');
          } catch {
            // ignore
          }
          return;
        }

        const update = () => {
          try {
            const nav = document.querySelector('.mobile-bottom-nav');
            const h = nav && nav.offsetHeight ? nav.offsetHeight : 0;
            document.documentElement.style.setProperty('--ktm-mobile-bottom-nav-h', `${h}px`);
          } catch {
            // ignore
          }
        };

        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
      }, [isMobileViewport]);

      const statusCounts = React.useMemo(() => {
        const source = Array.isArray(ordersToRender) ? ordersToRender : [];
        const counts = { all: source.length, draft: 0, pending: 0, processing: 0, done: 0, paid: 0, canceled: 0, other: 0 };
        for (const o of source) {
          const s = normalizeOrderStatus(o?.status);
          if (s === 'draft') counts.draft += 1;
          else if (s === 'pending') counts.pending += 1;
          else if (s === 'processing') counts.processing += 1;
          else if (s === 'done') counts.done += 1;
          else if (s === 'paid') counts.paid += 1;
          else if (s === 'canceled') counts.canceled += 1;
          else counts.other += 1;
        }
        return counts;
      }, [ordersToRender]);

      const pinnedCount = React.useMemo(() => {
        const pins = pinnedOrderIds;
        if (!pins || pins.size === 0) return 0;
        return (Array.isArray(sortedOrders) ? sortedOrders : []).reduce((sum, o) => sum + (pins.has(String(o?.id ?? '')) ? 1 : 0), 0);
      }, [pinnedOrderIds, sortedOrders]);

      const todayCount = React.useMemo(() => {
        return (Array.isArray(sortedOrders) ? sortedOrders : []).filter((o) => isOrderTodayNeedsAttention(o)).length;
      }, [sortedOrders]);

      const currentMonthKey = React.useMemo(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      }, []);

      const applyOrdersPreset = (presetId) => {
        if (isSearchActive) setOrderSearchQuery('');

        if (presetId === 'thisMonth') {
          setOverdueOnly(false);
          setFilterStatus('');
          setFilterMonth(currentMonthKey);
          return;
        }

        if (presetId === 'overduePending') {
          setFilterMonth('');
          setOverdueOnly(true);
          setFilterStatus('pending');
          return;
        }

        if (presetId === 'draftExpiring') {
          setOverdueOnly(false);
          setFilterStatus('draft');
          setFilterMonth('');
          // Ensure server snapshot refreshes soon
          loadAllOrdersForAlerts();
          return;
        }

        if (presetId === 'all') {
          setOverdueOnly(false);
          setFilterStatus('');
          setFilterMonth(currentMonthKey);
          return;
        }
      };

      const formatDateTime = (value) => window.KTM.date.formatDateTime(value);

      const loadProducts = async () => {
        try {
          const data = await window.KTM.api.getJSON(`${API_BASE}/api/products?fields=order`, 'Lỗi tải sản phẩm');
          setProducts(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error('Load products error:', e);
          setProducts([]);
        }
      };

      const loadOrders = async () => {
        const reset = true;
        setLoading(reset);
        setLoadingMoreOrders(!reset);
        try {
          const params = new URLSearchParams();
          if (filterMonth) params.set('month', String(filterMonth));
          params.set('includeItems', '0');
          params.set('meta', '1');
          params.set('limit', String(ORDERS_PAGE_SIZE));
          params.set('offset', '0');

          const url = `${API_BASE}/api/orders?${params.toString()}`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi tải đơn hàng');

          const list = Array.isArray(data)
            ? data
            : (Array.isArray(data?.orders) ? data.orders : []);
          const meta = (!Array.isArray(data) && data && typeof data === 'object') ? (data.meta || null) : null;

          setOrders(Array.isArray(list) ? list : []);
          setOrdersPageOffset(Array.isArray(list) ? list.length : 0);
          setOrdersHasMore(!!meta?.hasMore);
          // Keep the global overdue snapshot fresh (non-blocking)
          loadAllOrdersForAlerts();
        } catch (e) {
          console.error('Load orders error:', e);
          setOrders([]);
          setOrdersPageOffset(0);
          setOrdersHasMore(false);
        } finally {
          setLoading(false);
          setLoadingMoreOrders(false);
        }
      };

      const loadMoreOrders = async () => {
        if (loading || loadingMoreOrders || isSearchActive) return;
        if (!ordersHasMore) return;

        setLoadingMoreOrders(true);
        try {
          const params = new URLSearchParams();
          if (filterMonth) params.set('month', String(filterMonth));
          params.set('includeItems', '0');
          params.set('meta', '1');
          params.set('limit', String(ORDERS_PAGE_SIZE));
          params.set('offset', String(ordersPageOffset));

          const url = `${API_BASE}/api/orders?${params.toString()}`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi tải đơn hàng');
          const list = Array.isArray(data)
            ? data
            : (Array.isArray(data?.orders) ? data.orders : []);
          const meta = (!Array.isArray(data) && data && typeof data === 'object') ? (data.meta || null) : null;

          setOrders((prev) => mergeOrdersById(prev, Array.isArray(list) ? list : []));
          setOrdersPageOffset((prev) => prev + (Array.isArray(list) ? list.length : 0));
          setOrdersHasMore(!!meta?.hasMore);
        } catch (e) {
          console.error('Load more orders error:', e);
        } finally {
          setLoadingMoreOrders(false);
        }
      };

      const runOrderSearch = async (query) => {
        const q = normalizeSearchQuery(query);
        if (!q) {
          setOrderSearchResults([]);
          setOrderSearchError('');
          setOrderSearchLoading(false);
          return;
        }

        const digits = getSearchDigits(q);
        // Guardrails to prevent huge/slow scans on very short queries.
        if (q.length < ORDER_SEARCH_MIN_CHARS && digits.length < ORDER_SEARCH_MIN_DIGITS) {
          setOrderSearchResults([]);
          setOrderSearchError(`Nhập ít nhất ${ORDER_SEARCH_MIN_CHARS} ký tự (hoặc ${ORDER_SEARCH_MIN_DIGITS} số) để search nhanh`);
          setOrderSearchLoading(false);
          return;
        }

        // Cache hit => instant
        try {
          const cached = orderSearchCacheRef.current?.get(q);
          if (cached && Number.isFinite(cached.ts) && (Date.now() - cached.ts) <= ORDER_SEARCH_CACHE_TTL_MS) {
            setOrderSearchResults(Array.isArray(cached.results) ? cached.results : []);
            setOrderSearchError('');
            setOrderSearchLoading(false);
            return;
          }
        } catch {
          // ignore
        }

        const requestId = ++orderSearchRequestIdRef.current;
        setOrderSearchLoading(true);
        setOrderSearchError('');
        try {
          const url = `${API_BASE}/api/orders?search=${encodeURIComponent(q)}`;
          const data = await window.KTM.api.getJSON(url, 'Lỗi search đơn hàng');
          if (orderSearchRequestIdRef.current !== requestId) return;
          const results = Array.isArray(data) ? data : [];
          setOrderSearchResults(results);

          // Save to cache (keep it bounded)
          try {
            const cache = orderSearchCacheRef.current;
            if (cache && typeof cache.set === 'function') {
              cache.set(q, { ts: Date.now(), results });
              if (cache.size > ORDER_SEARCH_CACHE_MAX_ENTRIES) {
                // Drop oldest entries
                const entries = Array.from(cache.entries()).sort((a, b) => (Number(a?.[1]?.ts) || 0) - (Number(b?.[1]?.ts) || 0));
                const toDrop = Math.max(0, entries.length - ORDER_SEARCH_CACHE_MAX_ENTRIES);
                for (let i = 0; i < toDrop; i++) cache.delete(entries[i][0]);
              }
            }
          } catch {
            // ignore
          }
        } catch (e) {
          if (orderSearchRequestIdRef.current !== requestId) return;
          console.error('Order search error:', e);
          setOrderSearchResults([]);
          setOrderSearchError(e?.message || 'Search lỗi');
        } finally {
          if (orderSearchRequestIdRef.current !== requestId) return;
          setOrderSearchLoading(false);
        }
      };

      useEffect(() => {
        // Search is independent of filters/month; fetch results from server (all data).
        if (orderSearchTimerRef.current) {
          clearTimeout(orderSearchTimerRef.current);
          orderSearchTimerRef.current = null;
        }

        const q = normalizeSearchQuery(orderSearchQuery);
        if (!q) {
          setOrderSearchResults([]);
          setOrderSearchError('');
          setOrderSearchLoading(false);
          return;
        }

        // Ensure filters don't interfere while searching.
        if (overdueOnly) setOverdueOnly(false);

        orderSearchTimerRef.current = setTimeout(() => {
          runOrderSearch(q);
        }, ORDER_SEARCH_DEBOUNCE_MS);

        return () => {
          if (orderSearchTimerRef.current) {
            clearTimeout(orderSearchTimerRef.current);
            orderSearchTimerRef.current = null;
          }
        };
      }, [orderSearchQuery]);

      const loadAllOrdersForAlerts = async () => {
        setLoadingAllOrders(true);
        setLoadingDraftExpiringOrders(true);
        try {
          const [overdueData, draftData] = await Promise.all([
            window.KTM.api.getJSON(
              `${API_BASE}/api/orders?overdue=1&days=${encodeURIComponent(OVERDUE_PENDING_DAYS)}&includeItems=0`,
              'Lỗi tải đơn hàng'
            ),
            window.KTM.api.getJSON(
              `${API_BASE}/api/orders?draftExpiring=1&remainingDays=${encodeURIComponent(DRAFT_WARN_REMAINING_DAYS)}&includeItems=0`,
              'Lỗi tải đơn nháp'
            ),
          ]);

          setAllOrders(Array.isArray(overdueData) ? overdueData : []);
          setDraftExpiringOrders(Array.isArray(draftData) ? draftData : []);
        } catch (e) {
          console.error('Load all orders error:', e);
          setAllOrders([]);
          setDraftExpiringOrders([]);
        } finally {
          setLoadingAllOrders(false);
          setLoadingDraftExpiringOrders(false);
        }
      };

      const editOrder = async (order) => {
        const fullOrder = await ensureFullOrder(order);
        if (!fullOrder) return;
        setEditingId(fullOrder.id);

        const items = Array.isArray(fullOrder.items) && fullOrder.items.length
          ? fullOrder.items.map((it) => ({
              product_id: it?.product_id || '',
              quantity: Number(it?.quantity ?? 1) || 1,
              unit_price: (() => {
                const raw = it?.unit_price ?? it?.unitPrice;
                // IMPORTANT: Number(null) === 0; treat null/empty as "not provided"
                const n = raw == null || raw === '' ? NaN : Number(raw);
                return Number.isFinite(n) ? Math.trunc(n) : null;
              })(),
              variant: String(it?.variant ?? '').trim(),
              variant_json: it?.variant_json ?? it?.variantJson ?? null,
            })).filter((it) => it.product_id)
          : [{ product_id: fullOrder.product_id || '', quantity: Number(fullOrder.quantity || 1) || 1, unit_price: null, variant: '', variant_json: null }];

        const adjFormItems = getAdjustmentFormItemsFromOrder(fullOrder);
        const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
        const adjSum = computeAdjustmentSum(cleanAdjItems);
        const adjNoteStored = serializeAdjustmentItems(cleanAdjItems);

        setForm({
          customer_name: fullOrder.customer_name || "",
          phone: normalizePhone(fullOrder.phone || ""),
          address: fullOrder.address || "",
          note: fullOrder?.note || "",
          items: items.length ? items : [{ product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
          adjustment_items: adjFormItems,
          adjustment_amount: adjSum,
          adjustment_note: adjNoteStored || (fullOrder?.adjustment_note || ""),
          status: fullOrder.status || "pending",
        });
        setItemSearches(new Array(items.length ? items.length : 1).fill(''));
        setSplitDeliverNow(new Array(items.length ? items.length : 1).fill(true));
        setCustomerLookup(null);
        setShowModal(false);
        setInspectorOrder(fullOrder);
        setInspectorOpen(true);
        setInspectorError('');
        setInspectorLoading(false);
        setInspectorEditMode(true);

        if (fullOrder.phone) {
          lookupCustomerByPhone(normalizePhone(fullOrder.phone));
        }
      };

      const openOrderInspector = async (order) => {
        if (!order) return;
        setInspectorOpen(true);
        setInspectorError('');
        setInspectorLoading(true);
        setInspectorEditMode(false);
        setInspectorOrder(order);

        const requestId = ++inspectorRequestIdRef.current;
        try {
          const full = await ensureFullOrder(order);
          if (inspectorRequestIdRef.current !== requestId) return;
          setInspectorOrder(full || order);
        } catch (e) {
          if (inspectorRequestIdRef.current !== requestId) return;
          setInspectorError(e?.message || 'Không tải được chi tiết đơn');
        } finally {
          if (inspectorRequestIdRef.current !== requestId) return;
          setInspectorLoading(false);
        }
      };

      const closeOrderInspector = () => {
        if (saving || splitting) return;
        setInspectorOpen(false);
        setInspectorLoading(false);
        setInspectorError('');
        setInspectorEditMode(false);
        setEditingId(null);
        resetOrderForm('');
        setShowPhoneHistory(false);
        setSplitDeliverNow([]);
      };

      function openCreateModal(presetProductId) {
        setInspectorOpen(false);
        setInspectorEditMode(false);
        setInspectorLoading(false);
        setInspectorError('');
        setEditingId(null);
        resetOrderForm(presetProductId || '');
        setShowPhoneHistory(false);
        setSplitDeliverNow([]);
        setShowModal(true);
      }

      const closeModal = () => {
        if (saving || splitting) return;
        setShowModal(false);
        setEditingId(null);
        resetOrderForm('');
        setShowPhoneHistory(false);
        setSplitDeliverNow([]);
      };

      const splitOrderDeliverNow = async () => {
        if (!editingId) return;
        if (splitting || saving) return;

        const currentOrder = (Array.isArray(orders) ? orders : []).find((o) => String(o?.id) === String(editingId)) || null;
        const currentStatus = String(currentOrder?.status || form?.status || '').trim();
        if (currentStatus === 'done' || currentStatus === 'paid' || currentStatus === 'canceled') {
          const msg = 'Không thể tách: đơn đã hoàn thành/đã nhận tiền/đã hủy.';
          if (typeof showToast === 'function') showToast(msg, 'warning');
          else alert(msg);
          return;
        }

        const normalizedPhone = normalizePhone(form.phone);
        const items = Array.isArray(form.items) ? form.items : [];
        const normalizedItemsWithIndex = items
          .map((it, idx) => ({
            idx,
            product_id: String(it?.product_id || '').trim(),
            quantity: Number(it?.quantity ?? 0),
            variant: String(it?.variant || '').trim() || null,
            variant_json: it?.variant_json ?? null,
            unit_price: (() => {
              const raw = it?.unit_price;
              // IMPORTANT: Number(null) === 0, so treat null/empty as "not provided"
              // and fall back to computing unit price from product + variant selections.
              const n = raw === '' || raw == null ? NaN : Number(raw);
              if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));
              const p = getProductById(it?.product_id);
              const selections = it?.variant_json && typeof it.variant_json === 'object' ? it.variant_json : null;
              return computeUnitPriceForProductAndSelections(p, selections);
            })(),
          }))
          .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0);

        if (normalizedItemsWithIndex.length < 2) {
          const msg = 'Cần ít nhất 2 sản phẩm để tách đơn.';
          if (typeof showToast === 'function') showToast(msg, 'warning');
          else alert(msg);
          return;
        }

        const selected = [];
        const remaining = [];
        for (const it of normalizedItemsWithIndex) {
          const deliverNow = !!splitDeliverNow[it.idx];
          const row = { product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price, variant: it.variant, variant_json: it.variant_json };
          if (deliverNow) selected.push(row);
          else remaining.push(row);
        }

        if (!selected.length || !remaining.length) {
          const msg = 'Chọn một số sản phẩm “Giao đợt 1”, và để lại ít nhất 1 sản phẩm “Chờ hàng”.';
          if (typeof showToast === 'function') showToast(msg, 'warning');
          else alert(msg);
          return;
        }

        setSplitting(true);
        try {
          const adjFormItems = Array.isArray(form?.adjustment_items) ? form.adjustment_items : [];
          const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
          const adjNow = computeAdjustmentSum(cleanAdjItems);
          const adjNoteNow = serializeAdjustmentItems(cleanAdjItems);

          // 1) Create new order for immediate delivery
          const createPayload = {
            customer_name: form.customer_name,
            phone: normalizedPhone,
            address: form.address,
            note: (form.note || '').trim(),
            adjustment_amount: adjNow,
            adjustment_note: adjNoteNow,
            adjustment_items: cleanAdjItems,
            status: 'processing',
            items: selected,
            // Back-compat fields
            product_id: selected[0].product_id,
            quantity: selected[0].quantity,
            // Make the immediate-delivery order the root split (Đợt 1)
            split_seq: 1,
          };

          const created = await window.KTM.api.postJSON(`${API_BASE}/api/orders`, createPayload, 'Lỗi tách đơn (tạo đơn giao ngay)');
          const newId = created?.id ?? created?.order?.id ?? null;

          if (!newId) {
            throw new Error('Tách đơn thất bại: không nhận được ID đơn giao ngay');
          }

          // 2) Update current order with remaining items
          const updatePayload = {
            id: editingId,
            customer_name: form.customer_name,
            phone: normalizedPhone,
            address: form.address,
            note: (form.note || '').trim(),
            adjustment_amount: 0,
            adjustment_note: '',
            adjustment_items: [],
            status: 'pending',
            items: remaining,
            // Back-compat fields
            product_id: remaining[0].product_id,
            quantity: remaining[0].quantity,
            // Link waiting items as Đợt 2 under the new root
            parent_order_id: String(newId),
            split_seq: 2,
          };

          await window.KTM.api.putJSON(`${API_BASE}/api/orders/${editingId}`, updatePayload, 'Lỗi tách đơn (cập nhật phần chờ hàng)');

          closeModal();
          loadOrders();

          const msg = newId ? `Đã tách đơn. Đơn giao ngay: #${newId}` : 'Đã tách đơn.';
          if (typeof showToast === 'function') showToast(msg, 'success');
          else alert(msg);
        } catch (err) {
          console.error(err);
          const msg = err?.message || 'Tách đơn thất bại';
          if (typeof showToast === 'function') showToast(msg, 'danger');
          else alert(msg);
        } finally {
          setSplitting(false);
        }
      };

      const getProductLabel = (productId) => {
        if (!productId) return '-- chọn sản phẩm --';
        const pid = String(productId);
        const p = products.find(x => String(x?.id) === pid);
        if (!p) return '-- chọn sản phẩm --';
        return `${p.name}${p.code ? ` (${p.code})` : ''}`;
      };

      // Match SearchCenter (Tra cứu nhanh) normalization/scoring as closely as possible
      const normalizeText = (value) => {
        try {
          return String(value ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd');
        } catch {
          return String(value ?? '').toLowerCase();
        }
      };

      const parseProductQuery = (query) => {
        const qn = normalizeText(query).trim();
        const tokens = qn.split(/\s+/).filter(Boolean);
        const cleanedQuery = tokens.join(' ');
        return { contentTokens: tokens, cleanedQuery };
      };

      const productSearchIndex = React.useMemo(() => {
        return (Array.isArray(products) ? products : []).map((p, originalIndex) => {
          const name = normalizeText(p?.name ?? '');
          const code = normalizeText(p?.code ?? '');
          const category = normalizeText(p?.category ?? '');
          const note = normalizeText(p?.note ?? '');
          const idStr = normalizeText(p?.id ?? '');
          const sttStr = normalizeText(p?.stt ?? '');
          const haystackAll = `${name} ${code} ${category} ${note} ${idStr} ${sttStr}`.trim();
          return {
            p,
            originalIndex,
            name,
            code,
            category,
            note,
            haystackAll,
          };
        });
      }, [products]);

      const scoreProductMatch = (entry, contentTokens, cleanedQuery) => {
        const tokens = Array.isArray(contentTokens) ? contentTokens : [];
        const phrase = normalizeText(cleanedQuery).trim();
        if (!tokens.length && !phrase) return 0;

        const name = entry?.name ?? '';
        const code = entry?.code ?? '';
        const category = entry?.category ?? '';
        const note = entry?.note ?? '';
        const haystackAll = entry?.haystackAll ?? '';
        if (!haystackAll) return 0;

        let score = 0;

        // Phrase-level boosts
        if (phrase) {
          if (name === phrase) score += 220;
          if (name.includes(phrase)) score += 140;
          if (name.startsWith(phrase)) score += 160;
          if (code && code === phrase) score += 180;
          if (code && code.includes(phrase)) score += 90;
        }

        // Token-level boosts
        for (const t of tokens) {
          if (!t) continue;
          const reWordStart = new RegExp(`(?:^|\\s)${t.replace(/[.*+?^${}()|[\[\]\\]/g, '\\$&')}`);

          if (name.includes(t)) score += 35;
          if (reWordStart.test(name)) score += 25;

          if (code && code.includes(t)) score += 20;
          if (code && reWordStart.test(code)) score += 10;

          if (category && category.includes(t)) score += 12;
          if (note && note.includes(t)) score += 6;
        }

        // Prefer shorter names slightly when tied
        if (score > 0 && name) score += Math.max(0, 10 - Math.min(10, Math.floor(name.length / 10)));

        return score;
      };

      const levenshteinDistance = (a, b) => {
        const s = String(a || '');
        const t = String(b || '');
        if (s === t) return 0;
        if (!s) return t.length;
        if (!t) return s.length;

        const m = s.length;
        const n = t.length;
        // Ensure n is smaller to keep memory minimal
        if (n > m) return levenshteinDistance(t, s);

        let prev = new Array(n + 1);
        let curr = new Array(n + 1);
        for (let j = 0; j <= n; j++) prev[j] = j;

        for (let i = 1; i <= m; i++) {
          curr[0] = i;
          const sc = s.charCodeAt(i - 1);
          for (let j = 1; j <= n; j++) {
            const cost = sc === t.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(
              prev[j] + 1,
              curr[j - 1] + 1,
              prev[j - 1] + cost
            );
          }
          const tmp = prev;
          prev = curr;
          curr = tmp;
        }
        return prev[n];
      };

      const fuzzyTokenInText = (token, haystackAll) => {
        const t = String(token || '').trim();
        const hay = String(haystackAll || '');
        if (!t || !hay) return false;
        if (hay.includes(t)) return true;

        const words = hay.split(/\s+/).filter(Boolean);
        if (!words.length) return false;

        // Allow small typos: shorter tokens -> stricter
        const maxDistance = t.length <= 4 ? 1 : 2;
        for (const w of words) {
          // Quick length gate
          if (Math.abs(w.length - t.length) > maxDistance) continue;
          if (levenshteinDistance(t, w) <= maxDistance) return true;
        }
        return false;
      };

      const tokenizeWordsNormalized = (text) => {
        const cleaned = normalizeText(text)
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return cleaned ? cleaned.split(' ').filter(Boolean) : [];
      };

      const fuzzyScoreEntry = (entry, contentTokens) => {
        const tokens = Array.isArray(contentTokens) ? contentTokens : [];
        if (!tokens.length) return 0;

        const nameWords = tokenizeWordsNormalized(entry?.name || '');
        const codeWords = tokenizeWordsNormalized(entry?.code || '');
        const categoryWords = tokenizeWordsNormalized(entry?.category || '');
        const noteWords = tokenizeWordsNormalized(entry?.note || '');

        const bestTokenScoreInWords = (token, words, fieldWeight) => {
          const t = String(token || '').trim();
          if (!t || !words.length) return 0;

          const maxDistance = t.length <= 4 ? 1 : 2;
          let bestDistance = Infinity;
          let bestIndex = -1;

          for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (!w) continue;
            if (Math.abs(w.length - t.length) > maxDistance) continue;
            const d = levenshteinDistance(t, w);
            if (d < bestDistance) {
              bestDistance = d;
              bestIndex = i;
              if (d === 0) break;
            }
          }

          if (bestDistance === Infinity || bestDistance > maxDistance) return 0;

          // closeness: dist 0 > dist 1 > dist 2
          const closeness = bestDistance === 0 ? 1 : bestDistance === 1 ? 0.65 : 0.45;
          let score = Math.round(fieldWeight * closeness);

          // Prefer matches near beginning of the field
          if (bestIndex === 0) score += Math.round(fieldWeight * 0.25);
          else if (bestIndex === 1) score += Math.round(fieldWeight * 0.12);

          return score;
        };

        let score = 0;
        for (const tok of tokens) {
          if (!tok) continue;
          // Strongly prefer name matches, then code, then category/note
          const sName = bestTokenScoreInWords(tok, nameWords, 180);
          const sCode = bestTokenScoreInWords(tok, codeWords, 120);
          const sCat = bestTokenScoreInWords(tok, categoryWords, 60);
          const sNote = bestTokenScoreInWords(tok, noteWords, 30);
          score += Math.max(sName, sCode, sCat, sNote);
        }

        // If we got here from fuzzy fallback, ensure it can surface even when weak
        if (score > 0) {
          const nameLen = (entry?.name || '').length;
          score += Math.max(0, 60 - Math.min(60, Math.floor(nameLen / 2)));
        }

        return score;
      };

      const productSearchCacheRef = React.useRef(new Map());
      React.useEffect(() => {
        productSearchCacheRef.current = new Map();
      }, [products]);

      const getFilteredProducts = (idx) => {
        const qRaw = String(itemSearches[idx] || '').trim();
        if (!qRaw) return products;

        const { contentTokens, cleanedQuery } = parseProductQuery(qRaw);
        if (contentTokens.length === 0) return products;

        const cacheKey = normalizeText(qRaw).trim();
        const cached = productSearchCacheRef.current.get(cacheKey);
        if (cached) return cached;

        // Basic OR filter across all indexed fields (same spirit as SearchCenter)
        const candidates = [];
        for (const entry of productSearchIndex) {
          const hay = entry.haystackAll;
          if (!hay) continue;
          if (contentTokens.some(word => hay.includes(word))) {
            candidates.push(entry);
          }
        }

        // Fuzzy fallback: when nothing (or too few) matched, broaden using typo-tolerant token match
        let finalCandidates = candidates;
        if (finalCandidates.length < 8 && contentTokens.length > 0) {
          const extra = [];
          const seen = new Set(finalCandidates.map(e => String(e.p?.id ?? '') + ':' + String(e.originalIndex)));
          for (const entry of productSearchIndex) {
            const key = String(entry.p?.id ?? '') + ':' + String(entry.originalIndex);
            if (seen.has(key)) continue;
            const hay = entry.haystackAll;
            if (!hay) continue;

            // Any token fuzzy-matches any word in haystack
            if (contentTokens.some(tok => fuzzyTokenInText(tok, hay))) {
              extra.push(entry);
              seen.add(key);
            }
          }
          if (extra.length) finalCandidates = finalCandidates.concat(extra);
        }

        const scored = finalCandidates
          .map((entry) => ({
            entry,
            score: scoreProductMatch(entry, contentTokens, cleanedQuery),
          }))
          .map((x) => {
            if (x.score > 0) return x;
            // Fuzzy ranking: compute closeness-based score so the most relevant typo-match rises to top
            const fuzzyScore = fuzzyScoreEntry(x.entry, contentTokens);
            return fuzzyScore > 0 ? { ...x, score: fuzzyScore } : x;
          })
          .filter(x => x.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.entry.originalIndex - b.entry.originalIndex;
          })
          .slice(0, 40)
          .map(x => x.entry.p);

        productSearchCacheRef.current.set(cacheKey, scored);
        return scored;
      };

      const getProductById = (pid) => {
        if (!pid) return null;
        const id = String(pid);
        return products.find(x => String(x?.id) === id) || null;
      };

      const normalizeVariantGroups = (v) => {
        if (v == null || v === '') return [];
        let next = v;
        if (typeof next === 'string') {
          const s = next.trim();
          if (!s) return [];
          try {
            next = JSON.parse(s);
          } catch {
            return [];
          }
        }
        if (!Array.isArray(next)) return [];
        return next
          .map((g, gi) => {
            if (!g || typeof g !== 'object') return null;
            const name = String(g.name ?? '').trim() || `Biến thể ${gi + 1}`;
            const options = (Array.isArray(g.options) ? g.options : [])
              .map((o) => {
                if (!o || typeof o !== 'object') return null;
                const label = String(o.label ?? '').trim();
                if (!label) return null;
                const pRaw = o.price ?? o.priceValue ?? o.unit_price ?? o.unitPrice ?? null;
                const pNum = (() => {
                  if (pRaw == null || pRaw === '') return NaN;
                  if (typeof pRaw === 'number') return pRaw;
                  if (typeof pRaw === 'string') return parseMoney(pRaw);
                  return Number(pRaw);
                })();
                const price = Number.isFinite(pNum) ? Math.trunc(pNum) : null;

                const dRaw = o.price_delta ?? o.priceDelta ?? null;
                const dNum = Number(dRaw);
                const price_delta = Number.isFinite(dNum) ? Math.trunc(dNum) : 0;

                return { label, price, price_delta };
              })
              .filter(Boolean);
            return { name, options };
          })
          .filter(Boolean);
      };

      const getVariantGroupsForProductId = (pid) => {
        const p = getProductById(pid);
        return normalizeVariantGroups(p?.variants);
      };

      const buildVariantTextFromSelections = (selections) => {
        if (!selections || typeof selections !== 'object') return '';
        const parts = [];
        for (const [k, v] of Object.entries(selections)) {
          const key = String(k || '').trim();
          const val = String(v || '').trim();
          if (!key || !val) continue;
          parts.push(`${key}: ${val}`);
        }
        return parts.join(', ');
      };

      const computeUnitPriceForProductAndSelections = (product, selections) => {
        const base = parseMoney(product?.price);
        const groups = normalizeVariantGroups(product?.variants);
        if (!groups.length || !selections || typeof selections !== 'object') return base;

        let current = base;
        let hasAbsolute = false;

        for (const g of groups) {
          const groupName = String(g?.name || '').trim();
          const selectedLabel = String(selections?.[groupName] || '').trim();
          if (!groupName || !selectedLabel) continue;
          const opt = (Array.isArray(g.options) ? g.options : []).find((o) => String(o?.label || '').trim() === selectedLabel);
          if (!opt) continue;

          const pRaw = opt?.price;
          const pNum = pRaw == null || pRaw === '' ? NaN : Number(pRaw);
          if (Number.isFinite(pNum)) {
            current = Math.max(0, Math.trunc(pNum));
            hasAbsolute = true;
            continue;
          }

          const dRaw = opt?.price_delta;
          const dNum = dRaw == null || dRaw === '' ? NaN : Number(dRaw);
          if (Number.isFinite(dNum)) current += Math.trunc(dNum);
        }

        return current;
      };

      const getOrderItems = (order) => window.KTM.orders.getOrderItems(order);

      const getOrderTotalQty = (order) => window.KTM.orders.getOrderTotalQty(order);

      const getOrderProductSummary = (order) => window.KTM.orders.getOrderProductSummary(order, getProductById);

      const getOrderItemRows = (order) => window.KTM.orders.getOrderItemRows(order, getProductById);

      const getOrderAdjustmentMoney = (order) => window.KTM.orders.getOrderAdjustmentMoney(order);

      const getOrderAdjustmentSummaryText = (order) => window.KTM.orders.getOrderAdjustmentSummaryText(order);

      const getOrderCopyText = (order) => {
        const items = getOrderItems(order);
        const rows = getOrderItemRows(order);
        const subtotal = getItemsSubtotal(items);
        const shipInfo = getOrderShipInfo(items);
        const ship = shipInfo.fee;
        const adj = getOrderAdjustmentMoney(order);
        const total = subtotal + ship + adj;

        const formatSignedVND = (n) => {
          const num = Number(n) || 0;
          if (num > 0) return `+${formatVND(num)}`;
          return formatVND(num);
        };

        const parts = [];
        if (order?.customer_name) parts.push(`KHÁCH: ${order.customer_name}`);
        if (order?.phone) parts.push(`SĐT: ${order.phone}`);
        if (order?.address) parts.push(`ĐỊA CHỈ: ${order.address}`);
        if ((order?.note || '').trim()) parts.push(`GHI CHÚ: ${(order.note || '').trim()}`);
        parts.push('');

        parts.push('SẢN PHẨM:');
        if (rows.length) {
          for (const r of rows) {
            parts.push(`- ${r.name} (SL: ${r.qty})`);
          }
        } else {
          const summary = getOrderProductSummary(order);
          if (summary && summary !== '—') parts.push(`- ${summary}`);
        }

        parts.push('');
        parts.push(`TẠM TÍNH: ${formatVND(subtotal)}`);
        if (shipInfo.found && ship !== 0) parts.push(`SHIP: ${formatVND(ship)}`);
        {
          const adjItemsRaw = window.KTM.orders.getOrderAdjustmentItems(order);
          const adjItems = (Array.isArray(adjItemsRaw) ? adjItemsRaw : [])
            .map((it) => ({
              amount: Number(it?.amount ?? 0) || 0,
              note: String(it?.note || '').trim(),
            }))
            .filter((it) => it.amount !== 0 || !!it.note);

          const adjNoteSummary = getOrderAdjustmentSummaryText(order);
          const hasAnyAdj = adj !== 0 || adjItems.length > 0 || !!adjNoteSummary;
          if (hasAnyAdj) {
            if (adjItems.length === 1) {
              const it = adjItems[0];
              parts.push(`ĐIỀU CHỈNH: ${formatSignedVND(adj)}${it.note ? ` — ${it.note}` : ''}`);
            } else {
              parts.push(`ĐIỀU CHỈNH: ${formatSignedVND(adj)}${(!adjItems.length && adjNoteSummary) ? ` — ${adjNoteSummary}` : ''}`);
              for (const it of adjItems) {
                parts.push(`- ${formatSignedVND(it.amount)}${it.note ? `: ${it.note}` : ''}`);
              }
            }
          }
        }
        parts.push(`TỔNG: ${formatVND(total)}`);
        return parts.filter(Boolean).join('\n');
      };

      const handleCopyOrder = async (order) => {
        try {
          const fullOrder = await ensureFullOrder(order);
          const text = getOrderCopyText(fullOrder);
          await window.KTM.clipboard.writeText(text);
          if (typeof showToast === 'function') showToast('Đã copy thông tin đơn hàng', 'success');
          else alert('Đã copy thông tin đơn hàng');
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast('Copy thất bại (trình duyệt chặn clipboard)', 'danger');
          else alert('Copy thất bại (trình duyệt chặn clipboard)');
        }
      };

      const getOrderShipInfo = (items) => window.KTM.orders.getOrderShipInfo(items, getProductById);

      const getItemsSubtotal = (items) => window.KTM.orders.getItemsSubtotal(items, getProductById);

      const getMonthKey = (dateValue) => {
        try {
          const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
          if (!d || Number.isNaN(d.getTime())) return '';
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          return `${y}-${m}`;
        } catch {
          return '';
        }
      };

      const getActiveMonthKey = () => {
        if (filterMonth) return String(filterMonth);
        return getMonthKey(new Date());
      };

      const makeOrderFingerprint = (nextForm) => {
        const name = String(nextForm?.customer_name || '').trim().toLowerCase();
        const phone = normalizePhone(nextForm?.phone || '');
        const address = String(nextForm?.address || '').trim().toLowerCase();
        const adj = getAdjustmentDerivedFromForm(nextForm).amount;

        const items = Array.isArray(nextForm?.items) ? nextForm.items : [];
        const normalizedItems = items
          .map((it) => ({
            product_id: String(it?.product_id || '').trim(),
            quantity: Number(it?.quantity ?? 0),
            variant: String(it?.variant || '').trim(),
          }))
          .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0)
          .sort((a, b) => {
            if (a.product_id < b.product_id) return -1;
            if (a.product_id > b.product_id) return 1;
            if (a.variant < b.variant) return -1;
            if (a.variant > b.variant) return 1;
            return a.quantity - b.quantity;
          });

        return JSON.stringify({ name, phone, address, items: normalizedItems, adj });
      };

      const phoneMonthHistory = React.useMemo(() => {
        const phone = normalizePhone(form?.phone || '');
        if (!phone) return { count: 0, orders: [], monthKey: getActiveMonthKey() };

        const monthKey = getActiveMonthKey();
        const source = Array.isArray(phoneHistoryOrders) ? phoneHistoryOrders : [];
        const matched = source
          .filter((o) => {
            if (!o) return false;
            if (editingId && String(o.id) === String(editingId)) return false;
            if (normalizePhone(o.phone || '') !== phone) return false;
            const mk = getMonthKey(o.created_at);
            return mk && mk === monthKey;
          })
          .sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
          });

        return { count: matched.length, orders: matched, monthKey };
      }, [phoneHistoryOrders, form?.phone, filterMonth, editingId]);

      const makeOrderFingerprintFromOrder = (order) => {
        const name = String(order?.customer_name || '').trim().toLowerCase();
        const phone = normalizePhone(order?.phone || '');
        const address = String(order?.address || '').trim().toLowerCase();
        const adj = parseSignedMoney(order?.adjustment_amount ?? 0);

        const items = getOrderItems(order);
        const normalizedItems = (Array.isArray(items) ? items : [])
          .map((it) => ({
            product_id: String(it?.product_id || '').trim(),
            quantity: Number(it?.quantity ?? 0),
            variant: String(it?.variant || '').trim(),
          }))
          .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0)
          .sort((a, b) => {
            if (a.product_id < b.product_id) return -1;
            if (a.product_id > b.product_id) return 1;
            if (a.variant < b.variant) return -1;
            if (a.variant > b.variant) return 1;
            return a.quantity - b.quantity;
          });

        return JSON.stringify({ name, phone, address, items: normalizedItems, adj });
      };

      const duplicateMonthOrderWarning = React.useMemo(() => {
        if (editingId) return '';

        const phone = normalizePhone(form?.phone || '');
        if (!phone) return '';

        const monthKey = getActiveMonthKey();
        const currentFp = makeOrderFingerprint(form);

        const list = Array.isArray(phoneHistoryOrders) ? phoneHistoryOrders : [];
        for (const o of list) {
          if (!o) continue;
          if (editingId && String(o.id) === String(editingId)) continue;
          if (normalizePhone(o.phone || '') !== phone) continue;
          const mk = getMonthKey(o.created_at);
          if (!mk || mk !== monthKey) continue;
          const fp = makeOrderFingerprintFromOrder(o);
          if (fp && fp === currentFp) {
            return `Đơn này giống 100% một đơn trong tháng ${monthKey}${o?.id ? ` (#${o.id})` : ''}`;
          }
        }

        return '';
      }, [phoneHistoryOrders, form, filterMonth, editingId]);

      const computeOrderValidation = (nextForm) => {
        const errors = [];
        const warnings = [];

        const name = String(nextForm?.customer_name || '').trim();
        const phone = normalizePhone(nextForm?.phone || '');
        const address = String(nextForm?.address || '').trim();

        if (!name) errors.push('Thiếu tên khách hàng');
        if (!phone) errors.push('Thiếu số điện thoại');
        if (phone && !isValidPhone(phone)) errors.push('Số điện thoại không hợp lệ (cần 9-12 chữ số)');
        if (!address) warnings.push('Thiếu địa chỉ');

        const items = Array.isArray(nextForm?.items) ? nextForm.items : [];
        const selectedItems = items.filter((it) => it && it.product_id);
        if (selectedItems.length === 0) errors.push('Chưa chọn sản phẩm');

        const invalidQty = selectedItems.some((it) => {
          const q = Number(it?.quantity ?? 0);
          return !Number.isFinite(q) || q <= 0;
        });
        if (invalidQty) errors.push('Số lượng phải > 0');

        const seen = new Set();
        let hasDup = false;
        for (const it of selectedItems) {
          const pid = String(it.product_id || '').trim();
          const variant = String(it?.variant || '').trim();
          if (!pid) continue;
          const key = `${pid}||${variant}`;
          if (seen.has(key)) {
            hasDup = true;
            break;
          }
          seen.add(key);
        }
        if (hasDup) warnings.push('Sản phẩm bị trùng dòng (nên gộp số lượng)');

        const subtotal = getItemsSubtotal(selectedItems);
        const shipInfo = getOrderShipInfo(selectedItems);
        const ship = shipInfo?.found ? Number(shipInfo?.fee ?? 0) : 0;
        const adjFormItems = Array.isArray(nextForm?.adjustment_items) ? nextForm.adjustment_items : [];
        const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
        const adj = computeAdjustmentSum(cleanAdjItems);
        const hasMissingAdjNote = cleanAdjItems.some((it) => (Number(it?.amount) || 0) !== 0 && !String(it?.note || '').trim());

        if (shipInfo?.found) {
          if (ship >= 200000 || (subtotal > 0 && ship > subtotal * 0.6)) {
            warnings.push(`Ship có vẻ bất thường: ${formatVND(ship)}`);
          }
        }

        if (hasMissingAdjNote) warnings.push('Có điều chỉnh nhưng thiếu ghi chú điều chỉnh');
        const absAdj = Math.abs(adj);
        if (absAdj >= 500000 || (subtotal > 0 && absAdj > subtotal * 0.5)) {
          if (adj !== 0) warnings.push(`Điều chỉnh có vẻ bất thường: ${formatVND(adj)}`);
        }

        return { errors, warnings, canSubmit: errors.length === 0 };
      };

      const orderValidation = React.useMemo(() => {
        return computeOrderValidation(form);
      }, [form, products]);

      const orderFieldIssues = React.useMemo(() => {
        const name = String(form?.customer_name || '').trim();
        const phone = normalizePhone(form?.phone || '');
        const address = String(form?.address || '').trim();

        const items = Array.isArray(form?.items) ? form.items : [];
        const counts = new Map();
        for (const it of items) {
          const pid = String(it?.product_id || '').trim();
          const variant = String(it?.variant || '').trim();
          if (!pid) continue;
          const key = `${pid}||${variant}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }

        const perItem = items.map((it) => {
          const pid = String(it?.product_id || '').trim();
          const q = Number(it?.quantity ?? 0);
          const productError = pid ? '' : 'Chưa chọn sản phẩm';
          const qtyError = Number.isFinite(q) && q > 0 ? '' : 'Số lượng phải > 0';
          const variant = String(it?.variant || '').trim();
          const key = `${pid}||${variant}`;
          const dupWarn = pid && (counts.get(key) || 0) > 1 ? 'Sản phẩm bị trùng dòng (nên gộp số lượng)' : '';
          return { productError, qtyError, dupWarn };
        });

        const selectedItems = items.filter((it) => it && it.product_id);
        const subtotal = getItemsSubtotal(selectedItems);
        const shipInfo = getOrderShipInfo(selectedItems);
        const ship = shipInfo?.found ? Number(shipInfo?.fee ?? 0) : 0;

        const adjFormItems = Array.isArray(form?.adjustment_items) ? form.adjustment_items : [];
        const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
        const adj = computeAdjustmentSum(cleanAdjItems);
        const hasMissingAdjNote = cleanAdjItems.some((it) => (Number(it?.amount) || 0) !== 0 && !String(it?.note || '').trim());
        const absAdj = Math.abs(adj);
        const adjustmentNoteWarn = hasMissingAdjNote ? 'Có điều chỉnh nhưng thiếu ghi chú điều chỉnh' : '';
        const adjustmentAbnormalWarn = (adj !== 0 && (absAdj >= 500000 || (subtotal > 0 && absAdj > subtotal * 0.5)))
          ? `Điều chỉnh có vẻ bất thường: ${formatVND(adj)}`
          : '';
        const shipAbnormalWarn = shipInfo?.found && (ship >= 200000 || (subtotal > 0 && ship > subtotal * 0.6))
          ? `Ship có vẻ bất thường: ${formatVND(ship)}`
          : '';

        const nameError = name ? '' : 'Thiếu tên khách hàng';
        const phoneError = !phone
          ? 'Thiếu số điện thoại'
          : (!isValidPhone(phone) ? 'Số điện thoại không hợp lệ (cần 9-12 chữ số)' : '');
        const addressWarn = address ? '' : 'Thiếu địa chỉ';

        const canSubmit = !nameError && !phoneError && perItem.every((x) => !x.productError && !x.qtyError);

        return {
          nameError,
          phoneError,
          addressWarn,
          items: perItem,
          shipAbnormalWarn,
          adjustmentNoteWarn,
          adjustmentAbnormalWarn,
          canSubmit,
        };
      }, [form, products]);

      const saveOrder = async (options) => {
        const mode = options?.mode || 'close'; // 'close' | 'new'
        const origin = options?.origin || 'modal'; // 'modal' | 'drawer'

        const validation = computeOrderValidation(form);
        if (!validation.canSubmit) {
          const msg = validation.errors[0] || 'Thiếu dữ liệu bắt buộc';
          if (typeof showToast === 'function') showToast(msg, 'danger');
          else alert(msg);
          return;
        }

        // Confirm only when duplicate order is detected
        if (!editingId && duplicateMonthOrderWarning) {
          const msg = `${duplicateMonthOrderWarning}\n\nBạn có muốn tiếp tục lưu không?`;
          const ok = window.confirm(msg);
          if (!ok) {
            // Help user review: open phone history if any
            if (phoneMonthHistory?.count > 0) setShowPhoneHistory(true);
            setTimeout(() => {
              const el = document.getElementById('order-phone-input');
              if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                el.focus?.();
              }
            }, 0);
            return;
          }
        }

        const normalizedPhone = normalizePhone(form.phone);
        const items = Array.isArray(form.items) ? form.items : [];
        const normalizedItems = items
          .map((it) => ({
            product_id: it?.product_id || '',
            quantity: Number(it?.quantity ?? 1),
            variant: String(it?.variant || '').trim() || null,
            variant_json: it?.variant_json ?? null,
            unit_price: (() => {
              const raw = it?.unit_price;
              // IMPORTANT: Number(null) === 0, so treat null/empty as "not provided"
              // and fall back to computing unit price from product + variant selections.
              const n = raw === '' || raw == null ? NaN : Number(raw);
              if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));
              const p = getProductById(it?.product_id);
              const selections = it?.variant_json && typeof it.variant_json === 'object' ? it.variant_json : null;
              return computeUnitPriceForProductAndSelections(p, selections);
            })(),
          }))
          .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0);

        setSaving(true);
        try {
          const savedIdBefore = editingId;
          const url = editingId 
            ? `${API_BASE}/api/orders/${editingId}` 
            : `${API_BASE}/api/orders`;

          const primary = normalizedItems[0];
          const adjFormItems = Array.isArray(form?.adjustment_items) ? form.adjustment_items : [];
          const cleanAdjItems = cleanAdjustmentItemsForPayload(adjFormItems);
          const adjAmountNow = computeAdjustmentSum(cleanAdjItems);
          const adjNoteNow = serializeAdjustmentItems(cleanAdjItems);
          const payload = {
            customer_name: form.customer_name,
            phone: normalizedPhone,
            address: form.address,
            note: (form.note || '').trim(),
            adjustment_amount: adjAmountNow,
            adjustment_note: adjNoteNow,
            adjustment_items: cleanAdjItems,
            // Back-compat fields (API will normalize from items anyway)
            product_id: primary.product_id,
            quantity: primary.quantity,
            status: form.status,
            items: normalizedItems,
            ...(editingId ? { id: editingId } : {}),
          };

          if (editingId) {
            await window.KTM.api.putJSON(url, payload, 'Lỗi lưu đơn hàng');
          } else {
            const created = await window.KTM.api.postJSON(url, payload, 'Lỗi lưu đơn hàng');
            lastCreatedOrderRef.current = {
              id: created?.id ?? created?.order?.id ?? null,
              fingerprint: makeOrderFingerprint(form),
              ts: Date.now(),
            };
          }

          // Keep phone->customer cache in sync with edits so future "tạo đơn" prefill is updated.
          upsertCustomerLookupCacheFromForm(normalizedPhone, form.customer_name, form.address);

          if (origin === 'drawer') {
            // Drawer edit: keep inspector open and switch back to view mode.
            resetOrderForm('');
            setEditingId(null);
            setShowModal(false);
            setInspectorEditMode(false);
            setShowPhoneHistory(false);
            setSplitDeliverNow([]);
            loadOrders();

            if (savedIdBefore) {
              setInspectorLoading(true);
              setInspectorError('');
              try {
                const refreshed = await fetchOrderById(savedIdBefore);
                if (refreshed && typeof refreshed === 'object') {
                  setInspectorOrder(refreshed);
                }
              } catch (e) {
                setInspectorError(e?.message || 'Không tải được chi tiết đơn');
              } finally {
                setInspectorLoading(false);
              }
            }
          } else {
            if (mode === 'new' && !editingId) {
              resetOrderForm('');
              setEditingId(null);
              setShowModal(true);
            } else {
              resetOrderForm('');
              setEditingId(null);
              setShowModal(false);
            }
            loadOrders();
          }
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast(err.message, 'danger');
          else alert(err.message);
          return;
        } finally {
          setSaving(false);
        }
      };

      const getOrderTotalMoney = (order) => window.KTM.orders.getOrderTotalMoney(order, getProductById);

      const deleteOrder = async (id) => {
        if (!confirm("Xóa đơn hàng này?")) return;
        setDeletingId(id);
        try {
          await window.KTM.api.deleteJSON(`${API_BASE}/api/orders/${id}`, 'Lỗi xóa đơn hàng');
          loadOrders();
          loadAllOrdersForAlerts();
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast(err.message, 'danger');
          else alert(err.message);
        } finally {
          setDeletingId(null);
        }
      };

      const flushStatusToastBatch = () => {
        const batch = statusToastBatchRef.current;
        if (!batch) return;
        if (batch.timer) {
          try { clearTimeout(batch.timer); } catch {}
          batch.timer = null;
        }

        const events = Array.isArray(batch.events) ? batch.events.splice(0) : [];
        if (!events.length) return;
        if (typeof showToast !== 'function') return;

        // Keep only the latest change per order.
        const byId = new Map();
        for (const ev of events) {
          const id = String(ev?.orderId || '').trim();
          if (!id) continue;
          byId.set(id, ev);
        }
        const list = Array.from(byId.values());
        if (!list.length) return;

        const makeUndo = (undoList) => async () => {
          try {
            for (const ev of undoList) {
              if (!ev?.prevStatus || !ev?.orderId) continue;
              await updateOrderStatus({ id: ev.orderId, status: ev.nextStatus }, ev.prevStatus, { silentToast: true, skipToastBatch: true, fromUndo: true });
            }
            showToast(undoList.length > 1 ? `Đã hoàn tác ${undoList.length} đơn` : 'Đã hoàn tác', 'info');
          } catch {
            showToast('Hoàn tác thất bại', 'danger');
          }
        };

        if (list.length === 1) {
          const ev = list[0];
          const label = `${getStatusLabel(ev.prevStatus)} → ${getStatusLabel(ev.nextStatus)}`.trim();
          showToast(`Đã cập nhật trạng thái: ${label}`, 'success', {
            actionLabel: 'Undo',
            durationMs: 8500,
            onAction: makeUndo([ev]),
          });
          return;
        }

        showToast(`Đã cập nhật ${list.length} đơn`, 'success', {
          actionLabel: 'Undo',
          durationMs: 9500,
          onAction: makeUndo(list),
        });
      };

      const queueStatusToastEvent = (ev) => {
        const batch = statusToastBatchRef.current;
        if (!batch) return;
        if (!Array.isArray(batch.events)) batch.events = [];
        batch.events.push(ev);
        if (batch.timer) return;
        batch.timer = setTimeout(() => flushStatusToastBatch(), 320);
      };

      useEffect(() => {
        return () => {
          try {
            const batch = statusToastBatchRef.current;
            if (batch?.timer) clearTimeout(batch.timer);
          } catch {
            // ignore
          }
        };
      }, []);

      const updateOrderStatus = async (order, nextStatus, options = {}) => {
        const fullOrder = await ensureFullOrder(order);
        const orderId = fullOrder?.id;
        if (!orderId || !nextStatus) return;

        const prevStatus = normalizeOrderStatus(fullOrder?.status);

        setUpdatingId(orderId);
        try {
          const items = getOrderItems(fullOrder);
          const normalizedItems = (Array.isArray(items) ? items : [])
            .map((it) => ({
              product_id: it?.product_id || '',
              quantity: Number(it?.quantity ?? 1),
              variant: String(it?.variant || '').trim() || null,
              variant_json: it?.variant_json ?? null,
              unit_price: (() => {
                const raw = it?.unit_price ?? it?.unitPrice;
                const n = Number(raw);
                return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
              })(),
            }))
            .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0);

          if (!normalizedItems.length) {
            throw new Error('Không thể cập nhật trạng thái: đơn không có sản phẩm hợp lệ');
          }

          const primary = normalizedItems[0];
          const payload = {
            id: orderId,
            customer_name: fullOrder?.customer_name || '',
            phone: normalizePhone(fullOrder?.phone || ''),
            address: fullOrder?.address || '',
            note: (fullOrder?.note || '').trim(),
            adjustment_amount: Number(fullOrder?.adjustment_amount ?? 0) || 0,
            adjustment_note: fullOrder?.adjustment_note || '',
            // Back-compat fields
            product_id: primary.product_id,
            quantity: primary.quantity,
            status: nextStatus,
            items: normalizedItems,
          };

          await window.KTM.api.putJSON(`${API_BASE}/api/orders/${orderId}`, payload, 'Lỗi cập nhật trạng thái');

          setOrders((prev) => (
            Array.isArray(prev)
              ? prev.map((o) => (o?.id === orderId ? { ...o, status: nextStatus } : o))
              : prev
          ));

          setAllOrders((prev) => (
            Array.isArray(prev)
              ? prev.map((o) => (o?.id === orderId ? { ...o, status: nextStatus } : o))
              : prev
          ));

          // If this order was in the offline sync queue, clear its syncing badge.
          setSyncingFor(orderId, false);
          markOrderRecentlyUpdated(orderId);

          if (options?.silentToast) return;
          if (options?.skipToastBatch) {
            if (typeof showToast === 'function') showToast('Đã cập nhật trạng thái', 'success', { durationMs: 4500 });
            return;
          }
          queueStatusToastEvent({
            orderId,
            prevStatus,
            nextStatus: normalizeOrderStatus(nextStatus),
          });
        } catch (err) {
          console.error(err);
          const isNetErr = !navigator.onLine || err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('failed to fetch');
          if (isNetErr && !options?.fromSync) {
            // Optimistic UI + queue for retry
            setOrders((prev) => (
              Array.isArray(prev)
                ? prev.map((o) => (o?.id === orderId ? { ...o, status: nextStatus } : o))
                : prev
            ));
            setAllOrders((prev) => (
              Array.isArray(prev)
                ? prev.map((o) => (o?.id === orderId ? { ...o, status: nextStatus } : o))
                : prev
            ));
            enqueueStatusSync(orderId, nextStatus, prevStatus);
            if (typeof showToast === 'function') showToast('Mất mạng/timeout • Đã xếp hàng đồng bộ', 'info', { durationMs: 6500 });
            return;
          }

          if (typeof showToast === 'function') showToast(err.message, 'danger');
          else alert(err.message);
        } finally {
          setUpdatingId(null);
        }
      };

      useEffect(() => {
        const onHotkey = (e) => {
          const key = e?.detail?.key;
          if (!key) return;

          if (key === '/') {
            setTimeout(() => {
              orderSearchInputRef.current?.focus?.();
            }, 0);
            return;
          }

          if (key === 'N' || key === 'n') {
            openCreateModal();
            return;
          }

          if ((key === 'j' || key === 'J' || key === 'k' || key === 'K') && inspectorOpen && inspectorOrder?.id) {
            const list = Array.isArray(ordersToRender) ? ordersToRender : [];
            const idx = list.findIndex((o) => String(o?.id) === String(inspectorOrder?.id));
            if (idx < 0) return;
            const dir = (key === 'j' || key === 'J') ? -1 : 1;
            const next = list[idx + dir];
            if (next) openOrderInspector(next);
          }
        };

        window.addEventListener('ktm-admin-hotkey', onHotkey);
        return () => window.removeEventListener('ktm-admin-hotkey', onHotkey);
      }, [ordersToRender, inspectorOpen, inspectorOrder]);

      const renderOrderFormFields = () => (
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-semibold small text-muted mb-1">Tên khách hàng *</label>
            <input
              className="form-control"
              value={form.customer_name}
              onChange={e => setForm({ ...form, customer_name: e.target.value })}
              placeholder="Nhập tên khách hàng"
              required
              style={{ borderRadius: 10, padding: 12 }}
            />
            {!!orderFieldIssues.nameError && (
              <div className="form-text text-danger">{orderFieldIssues.nameError}</div>
            )}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold small text-muted mb-1">Số điện thoại *</label>
            <input
              className="form-control"
              type="tel"
              inputMode="numeric"
              pattern="[0-9+\s-]*"
              id="order-phone-input"
              value={form.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="Nhập số điện thoại"
              required
              style={{ borderRadius: 10, padding: 12 }}
            />
            {!!orderFieldIssues.phoneError && (
              <div className="form-text text-danger">{orderFieldIssues.phoneError}</div>
            )}

            {!orderFieldIssues.phoneError && phoneMonthHistory.count > 0 && (
              <div className="form-text text-warning d-flex align-items-center justify-content-between gap-2">
                <span>
                  Khách này đã có {phoneMonthHistory.count} đơn trong tháng {phoneMonthHistory.monthKey}.
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning"
                  onClick={() => setShowPhoneHistory((v) => !v)}
                >
                  {showPhoneHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
                </button>
              </div>
            )}

            {showPhoneHistory && phoneMonthHistory.orders.length > 0 && (
              <div className="mt-2 border rounded-3 p-2" style={{ background: '#fff' }}>
                <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                  <div className="small fw-semibold">Lịch sử đơn (cùng tháng)</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setShowPhoneHistory(false)}
                  >
                    Ẩn
                  </button>
                </div>
                <div className="d-grid gap-2">
                  {phoneMonthHistory.orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="d-flex align-items-start justify-content-between gap-2">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="small fw-semibold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          #{o.id} • <span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusLabel(o.status)}</span>
                        </div>
                        <div className="text-muted small">{formatDateTime(o.created_at)} • {formatVND(getOrderTotalMoney(o))}</div>
                        <div className="text-muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getOrderProductSummary(o)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          if (!confirm(`Mở đơn #${o.id}? Dữ liệu đang nhập sẽ mất.`)) return;
                          editOrder(o);
                        }}
                      >
                        Mở
                      </button>
                    </div>
                  ))}
                </div>
                {phoneMonthHistory.orders.length > 5 && (
                  <div className="text-muted small mt-2">Chỉ hiển thị 5 đơn gần nhất.</div>
                )}
              </div>
            )}

            {customerLookup?.status === 'loading' && (
              <div className="form-text">Đang tìm khách theo SĐT...</div>
            )}
            {customerLookup?.status === 'found' && (
              <div className="form-text text-success">Đã có khách, tự động điền thông tin.</div>
            )}
            {customerLookup?.status === 'not-found' && (
              <div className="form-text text-muted">Chưa có khách, sẽ tạo mới khi lưu đơn.</div>
            )}
            {customerLookup?.status === 'error' && (
              <div className="form-text text-danger">Không tra được khách (lỗi mạng/server).</div>
            )}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold small text-muted mb-1">Trạng thái</label>
            <select
              className="form-select"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              style={{ borderRadius: 10, padding: 12 }}
            >
              <option value="draft">Đơn nháp</option>
              <option value="pending">Chờ xử lý</option>
              <option value="processing">Đang vận chuyển</option>
              <option value="done">Hoàn thành</option>
              <option value="paid">Đã nhận tiền</option>
              <option value="canceled">Hủy đơn</option>
            </select>
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold small text-muted mb-1">Địa chỉ</label>
            <input
              className="form-control"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Nhập địa chỉ (không bắt buộc)"
              style={{ borderRadius: 10, padding: 12 }}
            />
            {!!orderFieldIssues.addressWarn && (
              <div className="form-text text-warning">{orderFieldIssues.addressWarn}</div>
            )}
          </div>

          <div className="col-12">
            <label className="form-label fw-semibold small text-muted mb-1">Ghi chú đơn hàng</label>
            <textarea
              className="form-control"
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="Ví dụ: Giao giờ hành chính / Gọi trước khi giao..."
              rows={2}
              style={{ borderRadius: 10, padding: 12, resize: 'vertical' }}
            />
          </div>

          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between">
              <label className="form-label fw-semibold small text-muted mb-1">Điều chỉnh giá (thêm/bớt)</label>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    adjustment_items: [
                      ...(Array.isArray(prev.adjustment_items) ? prev.adjustment_items : [{ amount: '', note: '' }]),
                      { amount: '', note: '' },
                    ],
                  }));
                }}
              >
                <i className="fas fa-plus me-2"></i>Thêm điều chỉnh
              </button>
            </div>

            <div className="d-grid gap-2">
              {normalizeAdjustmentFormItems(form.adjustment_items).map((adj, idx) => (
                <div key={idx} className="row g-2 align-items-end">
                  <div className="col-12 col-md-3">
                    <label className="form-label small text-muted mb-1">Số tiền</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      value={adj.amount}
                      onChange={(e) => {
                        const nextAmount = e.target.value;
                        setForm((prev) => {
                          const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                          arr[idx] = { ...arr[idx], amount: nextAmount };
                          return { ...prev, adjustment_items: arr };
                        });
                      }}
                      placeholder="+500000 hoặc -200000"
                      style={{ borderRadius: 10, padding: 12 }}
                    />
                  </div>
                  <div className="col-12 col-md-8">
                    <label className="form-label small text-muted mb-1">Ghi chú</label>
                    <input
                      className="form-control"
                      value={adj.note}
                      onChange={(e) => {
                        const nextNote = e.target.value;
                        setForm((prev) => {
                          const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                          arr[idx] = { ...arr[idx], note: nextNote };
                          return { ...prev, adjustment_items: arr };
                        });
                      }}
                      placeholder="Ví dụ: thêm van 1 tay / giảm giá..."
                      style={{ borderRadius: 10, padding: 12 }}
                    />
                  </div>
                  <div className="col-12 col-md-1 d-flex">
                    <button
                      type="button"
                      className="btn btn-outline-danger w-100"
                      onClick={() => {
                        setForm((prev) => {
                          const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                          arr.splice(idx, 1);
                          return { ...prev, adjustment_items: arr.length ? arr : [{ amount: '', note: '' }] };
                        });
                      }}
                      disabled={saving || normalizeAdjustmentFormItems(form.adjustment_items).length <= 1}
                      title="Xóa điều chỉnh"
                      style={{ borderRadius: 10, padding: 12 }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-text">Âm = giảm giá, dương = cộng thêm.</div>
            {!!orderFieldIssues.adjustmentAbnormalWarn && (
              <div className="form-text text-warning">{orderFieldIssues.adjustmentAbnormalWarn}</div>
            )}
            {!!orderFieldIssues.adjustmentNoteWarn && (
              <div className="form-text text-warning">{orderFieldIssues.adjustmentNoteWarn}</div>
            )}
          </div>
          <div className="col-12 col-md-8">
            <div className="d-flex align-items-center justify-content-between">
              <label className="form-label fw-semibold small text-muted mb-1">Sản phẩm *</label>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    items: [...(Array.isArray(prev.items) ? prev.items : []), { product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
                  }));
                  setItemSearches((prev) => [...(Array.isArray(prev) ? prev : []), '']);
                  if (editingId) {
                    setSplitDeliverNow((prev) => [...(Array.isArray(prev) ? prev : []), true]);
                  }
                }}
                disabled={saving}
              >
                <i className="fas fa-plus me-2"></i>Thêm sản phẩm
              </button>
            </div>

            <div className="d-grid gap-2">
              {(Array.isArray(form.items) ? form.items : [{ product_id: "", quantity: 1 }]).map((it, idx) => (
                <div key={idx} className="row g-2 align-items-end">
                  <div className="col-12 col-md-8">
                    <div
                      className="dropdown w-100"
                      ref={(el) => {
                        productDropdownRefs.current[idx] = el;
                      }}
                    >
                      <button
                        type="button"
                        className="form-control text-start d-flex align-items-center justify-content-between"
                        style={{ borderRadius: 10, padding: 12 }}
                        onClick={() => {
                          setOpenProductDropdownIdx((prev) => (prev === idx ? null : idx));
                          setTimeout(() => {
                            const input = document.getElementById(`order-product-search-${idx}`);
                            if (input) input.focus();
                          }, 0);
                        }}
                      >
                        <span className={it.product_id ? '' : 'text-muted'} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getProductLabel(it.product_id)}
                        </span>
                        <i className="fas fa-chevron-down text-muted" style={{ marginLeft: 8, flexShrink: 0 }}></i>
                      </button>

                      {openProductDropdownIdx === idx && (
                        <div
                          className="dropdown-menu show w-100 p-2"
                          style={{ maxHeight: 320, overflowY: 'auto' }}
                        >
                          <input
                            id={`order-product-search-${idx}`}
                            className="form-control"
                            value={itemSearches[idx] || ''}
                            onChange={(e) => {
                              const next = e.target.value;
                              setItemSearches((prev) => {
                                const arr = Array.isArray(prev) ? [...prev] : [];
                                arr[idx] = next;
                                return arr;
                              });
                            }}
                            placeholder="Tìm theo tên / mã..."
                            style={{ borderRadius: 10, padding: 10 }}
                          />
                          <div className="mt-2" />
                          {(() => {
                            const filtered = getFilteredProducts(idx);
                            if (filtered.length === 0) {
                              return <div className="text-muted small px-2 py-1">Không có sản phẩm phù hợp</div>;
                            }
                            return filtered.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="dropdown-item"
                                onClick={() => {
                                  const next = String(p.id);
                                  const groups = normalizeVariantGroups(p?.variants);
                                  const selections = {};
                                  for (const g of groups) {
                                    const groupName = String(g?.name || '').trim();
                                    const first = Array.isArray(g?.options) ? g.options[0] : null;
                                    const firstLabel = String(first?.label || '').trim();
                                    if (groupName && firstLabel) selections[groupName] = firstLabel;
                                  }
                                  const variantText = buildVariantTextFromSelections(selections);
                                  const unitPrice = computeUnitPriceForProductAndSelections(p, selections);
                                  setForm((prev) => {
                                    const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                    items[idx] = {
                                      ...(items[idx] || { quantity: 1 }),
                                      product_id: next,
                                      variant_json: Object.keys(selections).length ? selections : null,
                                      variant: variantText,
                                      unit_price: groups.length ? unitPrice : null,
                                    };
                                    return { ...prev, items };
                                  });
                                  setOpenProductDropdownIdx(null);
                                }}
                              >
                                {p.name}{p.code ? ` (${p.code})` : ''}
                              </button>
                            ));
                          })()}
                        </div>
                      )}

                      {/* Keep native required validation */}
                      <select
                        className="form-select"
                        value={it.product_id}
                        onChange={() => {}}
                        required
                        style={{ position: 'absolute', opacity: 0, height: 0, pointerEvents: 'none' }}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <option value="">-- chọn sản phẩm --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const issue = orderFieldIssues.items?.[idx];
                      if (!issue) return null;
                      return (
                        <>
                          {!!issue.productError && <div className="form-text text-danger">{issue.productError}</div>}
                          {!!issue.dupWarn && <div className="form-text text-warning">{issue.dupWarn}</div>}
                        </>
                      );
                    })()}

                    {(() => {
                      if (!it?.product_id) return null;
                      const p = getProductById(it.product_id);
                      const groups = normalizeVariantGroups(p?.variants);
                      if (!groups.length) return null;

                      const selections = (it?.variant_json && typeof it.variant_json === 'object') ? it.variant_json : {};

                      return (
                        <div className="mt-2 d-grid gap-2">
                          {groups.map((g, gi) => {
                            const groupName = String(g?.name || `Biến thể ${gi + 1}`).trim();
                            const selected = String(selections?.[groupName] || '').trim();
                            return (
                              <div key={groupName}>
                                <label className="form-label small text-muted mb-1">{groupName}</label>
                                <select
                                  className="form-select"
                                  value={selected}
                                  onChange={(e) => {
                                    const nextLabel = String(e.target.value || '').trim();
                                    setForm((prev) => {
                                      const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                      const cur = { ...(items[idx] || {}) };
                                      const p = getProductById(cur.product_id);
                                      const groups = normalizeVariantGroups(p?.variants);
                                      const nextSelections = (cur?.variant_json && typeof cur.variant_json === 'object') ? { ...cur.variant_json } : {};
                                      if (nextLabel) nextSelections[groupName] = nextLabel;
                                      else delete nextSelections[groupName];
                                      const variantText = buildVariantTextFromSelections(nextSelections);
                                      const unitPrice = computeUnitPriceForProductAndSelections(p, nextSelections);
                                      items[idx] = {
                                        ...cur,
                                        variant_json: Object.keys(nextSelections).length ? nextSelections : null,
                                        variant: variantText,
                                        unit_price: unitPrice,
                                      };
                                      return { ...prev, items };
                                    });
                                  }}
                                  style={{ borderRadius: 10, padding: 12 }}
                                >
                                  <option value="">-- chọn {groupName} --</option>
                                  {(Array.isArray(g?.options) ? g.options : []).map((opt) => (
                                    <option key={opt.label} value={opt.label}>
                                      {opt.label}{Number.isFinite(Number(opt?.price)) ? ` (${formatVND(Number(opt.price))})` : (Number(opt?.price_delta) ? ` (${opt.price_delta > 0 ? '+' : ''}${opt.price_delta})` : '')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {editingId && (
                      <div className="form-check mt-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`order-split-deliver-${idx}`}
                          checked={!!splitDeliverNow[idx]}
                          onChange={(e) => {
                            const checked = !!e.target.checked;
                            setSplitDeliverNow((prev) => {
                              const arr = Array.isArray(prev) ? [...prev] : [];
                              const targetLen = Array.isArray(form.items) ? form.items.length : 0;
                              while (arr.length < targetLen) arr.push(true);
                              arr[idx] = checked;
                              return arr;
                            });
                          }}
                          disabled={saving || splitting}
                        />
                        <label className="form-check-label small text-muted" htmlFor={`order-split-deliver-${idx}`}>
                          Giao đợt 1
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="col-8 col-md-3">
                    <input
                      type="number"
                      className="form-control"
                      value={it.quantity}
                      onChange={(e) => {
                        const nextQty = e.target.value;
                        setForm((prev) => {
                          const items = Array.isArray(prev.items) ? [...prev.items] : [];
                          items[idx] = { ...(items[idx] || { product_id: "" }), quantity: nextQty };
                          return { ...prev, items };
                        });
                      }}
                      min="1"
                      style={{ borderRadius: 10, padding: 12 }}
                    />
                    {(() => {
                      const issue = orderFieldIssues.items?.[idx];
                      if (!issue) return null;
                      return !!issue.qtyError ? (
                        <div className="form-text text-danger">{issue.qtyError}</div>
                      ) : null;
                    })()}
                  </div>
                  <div className="col-4 col-md-1 d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => {
                        setForm((prev) => {
                          const items = Array.isArray(prev.items) ? [...prev.items] : [];
                          items.splice(idx, 1);
                          return { ...prev, items: items.length ? items : [{ product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }] };
                        });
                        setItemSearches((prev) => {
                          const arr = Array.isArray(prev) ? [...prev] : [];
                          arr.splice(idx, 1);
                          return arr.length ? arr : [''];
                        });
                        setSplitDeliverNow((prev) => {
                          const arr = Array.isArray(prev) ? [...prev] : [];
                          arr.splice(idx, 1);
                          return arr;
                        });
                        setOpenProductDropdownIdx((prev) => {
                          if (prev == null) return prev;
                          if (prev === idx) return null;
                          if (prev > idx) return prev - 1;
                          return prev;
                        });
                      }}
                      disabled={saving || splitting || (Array.isArray(form.items) ? form.items.length : 1) <= 1}
                      title="Xóa sản phẩm"
                      style={{ borderRadius: 10, padding: 10 }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(() => {
            const items = Array.isArray(form.items) ? form.items : [];
            const normalizedItems = items.filter(it => it?.product_id);
            const subtotal = getItemsSubtotal(normalizedItems);
            const shipInfo = getOrderShipInfo(normalizedItems);
            const adjDerived = getAdjustmentDerivedFromForm(form);
            const adj = adjDerived.amount;
            const total = subtotal + (shipInfo.found ? shipInfo.fee : 0) + adj;

            return (
              <div className="col-12">
                <div className="d-flex flex-column gap-1 small bg-light rounded-3 p-3">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Tạm tính</span>
                    <span className="fw-semibold">{formatVND(subtotal)}</span>
                  </div>
                  {shipInfo.found && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Ship</span>
                      <span className="fw-semibold">{formatVND(shipInfo.fee)}</span>
                    </div>
                  )}
                  {!!orderFieldIssues.shipAbnormalWarn && (
                    <div className="text-warning">{orderFieldIssues.shipAbnormalWarn}</div>
                  )}
                  {adj !== 0 && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Điều chỉnh</span>
                      <span className="fw-semibold">{formatVND(adj)}</span>
                    </div>
                  )}
                  {(form.note || '').trim() && (
                    <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      Ghi chú đơn: {(form.note || '').trim()}
                    </div>
                  )}
                  {!!adjDerived.summaryText && (
                    <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      Ghi chú điều chỉnh: {adjDerived.summaryText}
                    </div>
                  )}
                  <div className="d-flex justify-content-between pt-1 border-top">
                    <span className="text-muted">Tổng</span>
                    <span className="fw-bold">{formatVND(total)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );

      return (
        <div className="product-manager">
          <Loading show={saving || !!deletingId || !!updatingId} />

          <div className="orders-ops-toolbar card p-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="mb-0">Đơn hàng</h5>
                  <span className="badge rounded-pill bg-dark bg-opacity-10 text-dark">
                    {statusCounts.all} đơn
                  </span>
                  {isSearchActive && (
                    <span className="badge rounded-pill bg-warning bg-opacity-25 text-dark">
                      Search mode
                    </span>
                  )}
                </div>
                <div className="text-muted small mt-1">
                  Hotkeys: <span className="fw-semibold">/</span> search • <span className="fw-semibold">N</span> tạo đơn • <span className="fw-semibold">Esc</span> đóng drawer
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => (isSearchActive ? runOrderSearch(orderSearchQuery) : loadOrders())}
                  disabled={orderSearchLoading}
                  title="Làm mới"
                >
                  <i className="fas fa-rotate"></i>
                </button>
                <button className="btn btn-dark btn-sm" onClick={() => openCreateModal()} disabled={saving || !!deletingId}>
                  <i className="fas fa-plus me-2"></i>Tạo đơn
                </button>
              </div>
            </div>

            <div className="orders-chip-row mt-3">
              <button
                type="button"
                className={`orders-chip d-md-none ${pinnedOnly && !overdueOnly && !isSearchActive ? 'active' : ''}`}
                onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setTodayOnly(false); setPinnedOnly((v) => !v); }}
                title="Đơn ưu tiên (đã ghim)"
              >
                <i className="fas fa-star me-1"></i>Ưu tiên{' '}
                <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{pinnedCount}</span>
              </button>
              <button
                type="button"
                className={`orders-chip d-md-none ${todayOnly && !overdueOnly && !isSearchActive ? 'active' : ''}`}
                onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setPinnedOnly(false); setTodayOnly((v) => !v); }}
                title="Đơn cần xử lý hôm nay"
              >
                <i className="fas fa-calendar me-1"></i>Hôm nay{' '}
                <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{todayCount}</span>
              </button>

              <button
                type="button"
                className={`orders-chip ${!filterStatus && !overdueOnly && !isSearchActive ? 'active' : ''}`}
                onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus(''); }}
              >
                Tất cả <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.all}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'draft' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('draft'); setFilterMonth(''); }}>
                Nháp <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.draft}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'pending' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('pending'); }}>
                Chờ xử lý <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.pending}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'processing' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('processing'); }}>
                Vận chuyển <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.processing}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'done' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('done'); }}>
                Hoàn thành <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.done}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'paid' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('paid'); }}>
                Đã nhận tiền <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.paid}</span>
              </button>
              <button type="button" className={`orders-chip ${filterStatus === 'canceled' && !overdueOnly && !isSearchActive ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus('canceled'); }}>
                Hủy <span className="ms-1 badge rounded-pill bg-dark bg-opacity-10 text-dark">{statusCounts.canceled}</span>
              </button>
            </div>

            <div className="orders-presets mt-2 d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => applyOrdersPreset('thisMonth')} disabled={isSearchActive}>
                <i className="fas fa-calendar me-2"></i>Tháng này
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => applyOrdersPreset('overduePending')} disabled={isSearchActive}>
                <i className="fas fa-triangle-exclamation me-2"></i>Chậm &gt; {OVERDUE_PENDING_DAYS} ngày
              </button>
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => applyOrdersPreset('draftExpiring')} disabled={isSearchActive}>
                <i className="fas fa-clock me-2"></i>Nháp sắp hủy
              </button>
              {(filterStatus || overdueOnly || (!filterMonth && !isSearchActive)) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => applyOrdersPreset('all')}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="orders-filterbar mt-3 d-flex flex-wrap gap-2 align-items-center">
              <div className="input-group input-group-sm orders-search">
                <span className="input-group-text" aria-hidden="true"><i className="fas fa-search"></i></span>
                <input
                  ref={orderSearchInputRef}
                  type="text"
                  className="form-control"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search tên / SĐT… (nhấn /)"
                  aria-label="Search đơn hàng theo tên hoặc SĐT"
                />
                {String(orderSearchQuery || '').trim() && (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setOrderSearchQuery('')} disabled={orderSearchLoading}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
                {orderSearchLoading && (
                  <span className="input-group-text" title="Đang search..." aria-label="Đang search">
                    <span className="spinner-border spinner-border-sm text-warning" role="status" aria-hidden="true"></span>
                  </span>
                )}
              </div>

              <div className="input-group input-group-sm orders-month">
                <span className="input-group-text" aria-hidden="true"><i className="fas fa-calendar-alt"></i></span>
                <input
                  type="month"
                  className="form-control"
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  aria-label="Chọn tháng"
                  disabled={overdueOnly || isSearchActive}
                />
              </div>

              <div className="text-muted small ms-auto">
                {isSearchActive ? 'Search bỏ qua filter' : (overdueOnly ? 'Đang xem đơn chậm' : (filterStatus ? `Lọc: ${getStatusLabel(filterStatus)}` : ''))}
              </div>
            </div>
          </div>

          {/* Mobile sticky context header */}
          <div className={`orders-context-header d-md-none ${mobileContextHeaderVisible ? 'visible' : ''}`}>
            <div className="orders-context-text">
              {(() => {
                if (isSearchActive) {
                  const q = String(orderSearchQuery || '').trim();
                  return `Search: ${q ? `"${q}"` : ''} • ${ordersToRender.length} kết quả`;
                }
                if (overdueOnly) return `Đơn chậm • ${ordersToRender.length} đơn`;
                if (pinnedOnly) return `Ưu tiên • ${ordersToRender.length} đơn`;
                if (todayOnly) return `Hôm nay • ${ordersToRender.length} đơn`;
                if (filterStatus) return `Lọc: ${getStatusLabel(filterStatus)} • ${ordersToRender.length} đơn`;
                return `Tất cả • ${ordersToRender.length} đơn`;
              })()}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setOrderSearchQuery('');
                setPinnedOnly(false);
                setTodayOnly(false);
                applyOrdersPreset('all');
              }}
              aria-label="Clear"
            >
              Clear
            </button>
          </div>

          <div className="card p-3">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="mb-0">Danh sách đơn hàng</h6>
              <span className="text-muted small">
                {isSearchActive
                  ? `${ordersToRender.length} kết quả`
                  : (filterStatus ? `${filteredOrders.length}/${orders.length} đơn` : `${orders.length}${ordersHasMore ? '+' : ''} đơn`)
                }
              </span>
            </div>

            {isSearchActive && orderSearchError && (
              <div className="alert alert-danger mt-3 mb-0" role="alert">
                {orderSearchError}
              </div>
            )}

            {overduePendingOrdersAll.length > 0 && (
              <div className="alert alert-warning d-flex align-items-center justify-content-between gap-2 mt-3 mb-0" role="alert">
                <div style={{ minWidth: 0 }}>
                  <i className="fas fa-triangle-exclamation me-2"></i>
                  Có <strong>{overduePendingOrdersAll.length}</strong> đơn <strong>Chờ xử lý</strong> quá {OVERDUE_PENDING_DAYS} ngày.
                  {loadingAllOrders && <span className="ms-2 text-muted small">(đang cập nhật...)</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => {
                    setOverdueOnly(true);
                    setFilterStatus('pending');
                  }}
                >
                  Xem ngay
                </button>
              </div>
            )}

            {draftExpiringOrdersAll.length > 0 && (
              <div className="alert alert-warning d-flex align-items-center justify-content-between gap-2 mt-3 mb-0" role="alert">
                <div style={{ minWidth: 0 }}>
                  <i className="fas fa-clock me-2"></i>
                  Có <strong>{draftExpiringOrdersAll.length}</strong> đơn <strong>Nháp</strong> sắp tự hủy (còn ≤ {DRAFT_WARN_REMAINING_DAYS} ngày).
                  {loadingDraftExpiringOrders && <span className="ms-2 text-muted small">(đang cập nhật...)</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => {
                    setOverdueOnly(false);
                    setFilterStatus('draft');
                    setFilterMonth('');
                    loadOrders();
                  }}
                >
                  Xem ngay
                </button>
              </div>
            )}

            {(isSearchActive ? orderSearchLoading : loading) ? (
              <div className="orders-skeleton-wrap mt-3">
                <div className="d-md-none">
                  {new Array(6).fill(0).map((_, idx) => (
                    <div key={idx} className="card mb-2">
                      <div className="card-body p-3">
                        <div className="admin-skeleton-line w-50 mb-2"></div>
                        <div className="admin-skeleton-line w-75 mb-2"></div>
                        <div className="admin-skeleton-line w-35"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="d-none d-md-block">
                  <div className="table-responsive orders-table-wrap mt-3">
                    <table className="table orders-table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Khách hàng</th>
                          <th>SĐT</th>
                          <th>Sản phẩm</th>
                          <th>SL</th>
                          <th>Tổng tiền</th>
                          <th>Trạng thái</th>
                          <th>Thời gian</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {new Array(10).fill(0).map((_, idx) => (
                          <tr key={idx}>
                            <td><div className="admin-skeleton-line w-60"></div></td>
                            <td><div className="admin-skeleton-line w-70"></div></td>
                            <td><div className="admin-skeleton-line w-85"></div></td>
                            <td><div className="admin-skeleton-line w-30"></div></td>
                            <td><div className="admin-skeleton-line w-50"></div></td>
                            <td><div className="admin-skeleton-line w-40"></div></td>
                            <td><div className="admin-skeleton-line w-55"></div></td>
                            <td><div className="admin-skeleton-line w-40"></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (isSearchActive ? ordersToRender.length === 0 : orders.length === 0) ? (
              <div className="text-center py-4 text-muted">{isSearchActive ? 'Không có kết quả' : 'Chưa có đơn hàng'}</div>
            ) : (!isSearchActive && filteredOrders.length === 0) ? (
              <div className="text-center py-4 text-muted">Không có đơn phù hợp</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="d-md-none mt-3">
                  {mobileOrdersToRender.map(order => (
                    <div
                      key={order.id}
                      className={`orders-mobile-swipe-shell mb-2 ${swipePreview?.id === String(order.id) ? `swipe-preview swipe-${swipePreview?.dir || ''}` : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (swipeConsumeClickRef.current) {
                          swipeConsumeClickRef.current = false;
                          return;
                        }
                        openOrderInspector(order);
                      }}
                      onPointerDown={(e) => {
                        if (mobileSheetOpen || mobileFilterSheetOpen || statusPopoverOpen) return;
                        if (e.button != null && e.button !== 0) return;
                        const id = String(order.id);
                        swipeConsumeClickRef.current = false;
                        swipeRef.current = { active: true, id, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, lock: null, pointerId: e.pointerId, captured: false };
                        setSwipePreview((p) => (p?.id === id ? p : { id, dir: null }));

                        // Reset swipe visuals
                        try {
                          e.currentTarget.classList.remove('swiping');
                          e.currentTarget.style.setProperty('--swipe-x', '0px');
                          e.currentTarget.style.setProperty('--swipe-p', '0');
                          e.currentTarget.style.setProperty('--swipe-l', '0');
                          e.currentTarget.style.setProperty('--swipe-r', '0');
                        } catch {}

                        // Prefetch detail if user pauses on the card (makes drawer open instantly)
                        try {
                          if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                        } catch {}
                        prefetchOrderIdRef.current = id;
                        prefetchTimerRef.current = setTimeout(async () => {
                          const targetId = prefetchOrderIdRef.current;
                          if (!targetId) return;
                          try {
                            if (orderDetailCacheRef.current?.has?.(targetId)) return;
                            const full = await fetchOrderById(targetId);
                            if (full && typeof full === 'object') {
                              orderDetailCacheRef.current?.set?.(targetId, full);
                            }
                          } catch {
                            // ignore
                          }
                        }, 150);
                      }}
                      onPointerMove={(e) => {
                        const s = swipeRef.current;
                        if (!s?.active || String(s.id) !== String(order.id)) return;
                        const dx = (e.clientX - s.startX);
                        const dy = (e.clientY - s.startY);
                        s.dx = dx;
                        s.dy = dy;

                        if (Math.abs(dx) > 14 || Math.abs(dy) > 14) {
                          try {
                            if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                          } catch {}
                          prefetchTimerRef.current = null;
                          prefetchOrderIdRef.current = null;
                        }
                        if (!s.lock) {
                          const adx = Math.abs(dx);
                          const ady = Math.abs(dy);
                          if (adx > 10 || ady > 10) {
                            s.lock = (adx > ady * 1.2) ? 'x' : 'y';
                            if (s.lock === 'x' && !s.captured) {
                              try {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                s.captured = true;
                              } catch {}
                            }
                          }
                        }
                        if (s.lock !== 'x') {
                          try {
                            e.currentTarget.classList.remove('swiping');
                            e.currentTarget.style.setProperty('--swipe-x', '0px');
                            e.currentTarget.style.setProperty('--swipe-p', '0');
                            e.currentTarget.style.setProperty('--swipe-l', '0');
                            e.currentTarget.style.setProperty('--swipe-r', '0');
                          } catch {}
                          if (Math.abs(dy) > 24) {
                            setSwipePreview((p) => (p?.id === s.id ? { id: s.id, dir: null } : p));
                          }
                          return;
                        }

                        const canRight = !!getSwipeTargetStatus(order?.status, 'right');
                        const canLeft = !!getSwipeTargetStatus(order?.status, 'left');

                        // Lock X: visualize swipe (card follows finger + labels reveal)
                        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
                        const rawClampedDx = clamp(dx, -140, 140);
                        const clampedDx = (rawClampedDx > 0 && !canRight)
                          ? rawClampedDx * 0.35
                          : ((rawClampedDx < 0 && !canLeft) ? rawClampedDx * 0.35 : rawClampedDx);
                        const progress = clamp(Math.abs(clampedDx) / 88, 0, 1);
                        try {
                          e.currentTarget.classList.add('swiping');
                          e.currentTarget.style.setProperty('--swipe-x', `${clampedDx}px`);
                          e.currentTarget.style.setProperty('--swipe-p', String(progress));
                          // dx>0 reveals LEFT side; dx<0 reveals RIGHT side
                          e.currentTarget.style.setProperty('--swipe-l', (clampedDx > 0 && canRight) ? String(progress) : '0');
                          e.currentTarget.style.setProperty('--swipe-r', (clampedDx < 0 && canLeft) ? String(progress) : '0');
                        } catch {}
                        if (Math.abs(clampedDx) > 12) swipeConsumeClickRef.current = true;

                        if (dx > 72 && canRight) setSwipePreview({ id: s.id, dir: 'right' });
                        else if (dx < -72 && canLeft) setSwipePreview({ id: s.id, dir: 'left' });
                        else setSwipePreview({ id: s.id, dir: null });
                      }}
                      onPointerCancel={(e) => {
                        try {
                          if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                        } catch {}
                        prefetchTimerRef.current = null;
                        prefetchOrderIdRef.current = null;
                        const s = swipeRef.current;
                        try {
                          if (s?.captured && s?.pointerId != null) e.currentTarget.releasePointerCapture(s.pointerId);
                        } catch {}
                        swipeRef.current = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0, lock: null, pointerId: null, captured: false };
                        setSwipePreview({ id: null, dir: null });

                        // Reset swipe visuals
                        try {
                          e.currentTarget.classList.remove('swiping');
                          e.currentTarget.style.setProperty('--swipe-x', '0px');
                          e.currentTarget.style.setProperty('--swipe-p', '0');
                          e.currentTarget.style.setProperty('--swipe-l', '0');
                          e.currentTarget.style.setProperty('--swipe-r', '0');
                        } catch {}
                      }}
                      onPointerUp={(e) => {
                        try {
                          if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                        } catch {}
                        prefetchTimerRef.current = null;
                        prefetchOrderIdRef.current = null;
                        const s = swipeRef.current;
                        if (!s?.active || String(s.id) !== String(order.id)) {
                          setSwipePreview({ id: null, dir: null });
                          return;
                        }
                        try {
                          if (s?.captured && s?.pointerId != null) {
                            e.currentTarget.releasePointerCapture(s.pointerId);
                          }
                        } catch {}
                        swipeRef.current = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0, lock: null, pointerId: null, captured: false };

                        const dx = Number(s.dx) || 0;
                        const adx = Math.abs(dx);
                        const lockedX = s.lock === 'x';
                        const status = normalizeOrderStatus(order?.status);
                        setSwipePreview({ id: null, dir: null });

                        // Snap visuals back
                        try {
                          e.currentTarget.classList.remove('swiping');
                          e.currentTarget.style.setProperty('--swipe-x', '0px');
                          e.currentTarget.style.setProperty('--swipe-p', '0');
                          e.currentTarget.style.setProperty('--swipe-l', '0');
                          e.currentTarget.style.setProperty('--swipe-r', '0');
                        } catch {}

                        if (lockedX && adx > 12) {
                          swipeConsumeClickRef.current = true;
                        }

                        if (!lockedX || adx < 88) return;
                        e.preventDefault();
                        e.stopPropagation();

                        const target = dx > 0
                          ? getSwipeTargetStatus(order?.status, 'right')
                          : getSwipeTargetStatus(order?.status, 'left');
                        const next = normalizeOrderStatus(target);
                        if (!next || next === status) return;
                        updateOrderStatus(order, next);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openOrderInspector(order);
                        }
                      }}
                      title="Xem chi tiết"
                    >
                      <div className="orders-mobile-swipe-bg" aria-hidden="true">
                        <div className="orders-mobile-swipe-bg-left">
                          <div className="orders-mobile-swipe-label">
                            {(() => {
                              const target = getSwipeTargetStatus(order?.status, 'right');
                              const meta = getSwipeLabelMeta(target);
                              const text = meta?.label || String(target || '').trim();
                              if (!text) return null;
                              return (
                                <>
                                  <i className={`fas ${meta.icon || 'fa-circle'}`}></i>
                                  {text}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="orders-mobile-swipe-bg-right">
                          <div className="orders-mobile-swipe-label">
                            {(() => {
                              const target = getSwipeTargetStatus(order?.status, 'left');
                              const meta = getSwipeLabelMeta(target);
                              const text = meta?.label || String(target || '').trim();
                              if (!text) return null;
                              return (
                                <>
                                  <i className={`fas ${meta.icon || 'fa-circle'}`}></i>
                                  {text}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className={`card orders-mobile-card ${recentlyUpdatedIds?.[String(order.id)] ? 'order-recent-updated' : ''}`}>
                        <div className="card-body p-3 order-card-mobile">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="fw-semibold order-customer-name">{order.customer_name}</div>
                            <div
                              className="fw-bold font-monospace order-phone"
                              role="button"
                              tabIndex={0}
                              onPointerDown={(e) => startPhoneLongPress(e, order.phone)}
                              onPointerMove={cancelPhoneLongPress}
                              onPointerUp={cancelPhoneLongPress}
                              onPointerCancel={cancelPhoneLongPress}
                              onPointerLeave={cancelPhoneLongPress}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (phoneLongPressFiredRef.current) {
                                  phoneLongPressFiredRef.current = false;
                                  return;
                                }
                                handlePhoneCall(order.phone);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePhoneCall(order.phone);
                                }
                              }}
                              title="Chạm để gọi • Giữ để copy"
                            >
                              {order.phone}
                            </div>
                            {Number(order?.split_seq ?? 0) > 0 && (
                              <div className="text-muted small">Đợt {order.split_seq}</div>
                            )}
                            {(() => {
                              const addr = getOrderAddressText(order);
                              if (!addr) return null;
                              const expanded = expandedOrderIds.has(String(order.id));
                              const longText = addr.length > 84 || getOrderNoteText(order).length > 84;
                              return (
                                <>
                                  <div className={`text-muted small order-address ${!expanded ? 'order-text-collapsed' : ''}`}>
                                    {addr}
                                  </div>
                                  {longText && (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 order-expand-btn"
                                      onClick={(e) => { e.stopPropagation(); toggleOrderExpanded(order.id); }}
                                    >
                                      {expanded ? 'Thu gọn' : 'Xem thêm'}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                            {(() => {
                              const note = getOrderNoteText(order);
                              if (!note) return null;
                              const expanded = expandedOrderIds.has(String(order.id));
                              const addrLen = getOrderAddressText(order).length;
                              const longText = addrLen > 84 || note.length > 84;
                              return (
                                <>
                                  <div className={`text-muted small order-note ${!expanded ? 'order-text-collapsed' : ''}`}>
                                    <span className="fw-semibold">Ghi chú:</span> {note}
                                  </div>
                                  {longText && addrLen <= 0 && (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 order-expand-btn"
                                      onClick={(e) => { e.stopPropagation(); toggleOrderExpanded(order.id); }}
                                    >
                                      {expanded ? 'Thu gọn' : 'Xem thêm'}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="d-flex align-items-start gap-1 flex-shrink-0">
                            <button
                              type="button"
                              className={`btn btn-sm btn-link order-pin-btn ${pinnedOrderIds.has(String(order.id)) ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); togglePinnedOrder(order.id); }}
                              title={pinnedOrderIds.has(String(order.id)) ? 'Bỏ ghim' : 'Ghim'}
                              aria-label={pinnedOrderIds.has(String(order.id)) ? 'Bỏ ghim' : 'Ghim'}
                            >
                              <i className={pinnedOrderIds.has(String(order.id)) ? 'fas fa-star' : 'far fa-star'}></i>
                            </button>
                            {!!syncingIds?.[String(order.id)] && (
                              <span className="badge bg-info text-dark orders-sync-badge" title="Đang đồng bộ" aria-label="Đang đồng bộ">
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Sync
                              </span>
                            )}
                            <button
                              type="button"
                              className={`badge ${getStatusBadgeClass(order.status)} order-status-badge-btn`}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                statusPopoverLongPressFiredRef.current = false;
                                try {
                                  if (statusPopoverLongPressTimerRef.current) clearTimeout(statusPopoverLongPressTimerRef.current);
                                } catch {}
                                statusPopoverLongPressTimerRef.current = setTimeout(() => {
                                  statusPopoverLongPressFiredRef.current = true;
                                  openStatusPopover(order, e.currentTarget);
                                }, 420);
                              }}
                              onPointerUp={(e) => {
                                e.stopPropagation();
                                try {
                                  if (statusPopoverLongPressTimerRef.current) clearTimeout(statusPopoverLongPressTimerRef.current);
                                } catch {}
                                statusPopoverLongPressTimerRef.current = null;
                              }}
                              onPointerCancel={(e) => {
                                e.stopPropagation();
                                try {
                                  if (statusPopoverLongPressTimerRef.current) clearTimeout(statusPopoverLongPressTimerRef.current);
                                } catch {}
                                statusPopoverLongPressTimerRef.current = null;
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (statusPopoverLongPressFiredRef.current) {
                                  statusPopoverLongPressFiredRef.current = false;
                                  return;
                                }
                                if (statusPopoverOpen && String(statusPopoverOrder?.id) === String(order.id)) closeStatusPopover();
                                else openStatusPopover(order, e.currentTarget);
                              }}
                              title="Đổi trạng thái nhanh"
                            >
                              {getStatusLabel(order.status)}
                            </button>
                            {isOverduePending(order) && (
                              <span className="badge bg-danger" title={`Chờ xử lý quá ${OVERDUE_PENDING_DAYS} ngày`}>
                                ⚠ Chậm {getOrderAgeDays(order)}d
                              </span>
                            )}
                            {isDraftExpiringSoon(order) && (
                              <span className="badge bg-warning text-dark" title={`Đơn nháp sẽ tự hủy sau ${DRAFT_AUTO_DELETE_DAYS} ngày`}>
                                ⏳ Còn {getDraftRemainingDays(order)}d
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 small">
                          <div>
                            <div className="text-muted">Sản phẩm:</div>
                            {(() => {
                              const rows = getOrderItemRows(order);
                              if (!rows.length) {
                                return (
                                  <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    {getOrderProductSummary(order)}
                                  </div>
                                );
                              }
                              return (
                                <div className="mt-1">
                                  {rows.map((r, idx) => (
                                    <div key={idx} className="d-flex justify-content-between gap-2" style={{ lineHeight: 1.25 }}>
                                      <div className="fw-semibold" style={{ minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word', flex: 1 }}>
                                        <span className="text-muted me-1">{idx + 1}.</span>
                                        {r.name}
                                      </div>
                                      <div className="text-muted small text-end text-nowrap" style={{ flexShrink: 0 }}>
                                        x{r.qty}{Number(r.unitPrice) > 0 ? ` • ${formatVND(r.unitPrice)}` : ''}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                          {(getOrderAdjustmentMoney(order) !== 0 || getOrderAdjustmentSummaryText(order)) && (
                            <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              <span className="text-muted">Điều chỉnh:</span>{' '}
                              <span className="fw-semibold">{formatVND(getOrderAdjustmentMoney(order))}</span>
                              {getOrderAdjustmentSummaryText(order) ? (
                                <span className="text-muted">{' '}({getOrderAdjustmentSummaryText(order)})</span>
                              ) : null}
                            </div>
                          )}
                          <div className="d-flex justify-content-between">
                            <span className="text-muted">Tổng tiền</span>
                            <span className="fw-bold">{formatVND(getOrderTotalMoney(order))}</span>
                          </div>
                          <div className="text-muted"><span>Thời gian:</span> {formatDateTime(order.created_at)}</div>
                        </div>

                        <div className="mt-3 d-flex gap-2 align-items-center order-card-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={(e) => { e.stopPropagation(); handleCopyOrder(order); }}
                            disabled={saving || !!deletingId || updatingId === order.id}
                          >
                            <i className="fas fa-copy me-1"></i>Copy
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-dark orders-mobile-action"
                            onClick={(e) => { e.stopPropagation(); openMobileSheet(order); }}
                            disabled={saving || !!deletingId || updatingId === order.id}
                            aria-label="Mở thao tác nhanh"
                          >
                            <i className="fas fa-bolt me-1"></i>Thao tác
                          </button>
                        </div>
                        </div>
                      </div>
                      </div>
                  ))}

                  <div ref={mobileListSentinelRef} className="orders-mobile-sentinel" aria-hidden="true" />
                  {Array.isArray(ordersToRender) && mobileOrdersToRender.length < ordersToRender.length && (
                    <div className="text-center text-muted small py-2">Đang tải thêm…</div>
                  )}
                </div>

                {/* Inline status popover */}
                {statusPopoverOpen && statusPopoverOrder && (
                  <div className="orders-status-popover-root" role="dialog" aria-modal="true" onClick={() => closeStatusPopover()}>
                    <div
                      className={`orders-status-popover ${statusPopoverPos?.placement || ''}`}
                      style={{ left: statusPopoverPos.left, top: statusPopoverPos.top }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="orders-status-popover-title">
                        <div className="fw-semibold" style={{ minWidth: 0 }}>
                          {statusPopoverOrder.customer_name || 'Đơn hàng'}
                        </div>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => closeStatusPopover()} aria-label="Đóng">
                          <i className="fas fa-xmark"></i>
                        </button>
                      </div>
                      <div className="orders-status-popover-grid">
                        {ORDER_STATUS_OPTIONS.map((opt) => {
                          const active = normalizeOrderStatus(statusPopoverOrder.status) === normalizeOrderStatus(opt.value);
                          const busy = saving || !!deletingId || updatingId === statusPopoverOrder.id;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`orders-status-chip ${active ? 'active' : ''}`}
                              onClick={() => {
                                if (active) return;
                                updateOrderStatus(statusPopoverOrder, opt.value);
                                closeStatusPopover();
                              }}
                              disabled={busy}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="orders-status-popover-footer">
                        <button type="button" className="btn btn-sm btn-dark" onClick={() => { openMobileSheet(statusPopoverOrder); closeStatusPopover(); }}>
                          <i className="fas fa-bolt me-2"></i>Thao tác
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile quick action sheet */}
                {mobileSheetOpen && mobileSheetOrder && (
                  <div className="admin-sheet-root" role="dialog" aria-modal="true" onClick={() => closeMobileSheet()}>
                    <div className="admin-sheet" onClick={(e) => e.stopPropagation()}>
                      <div className="admin-sheet-handle" />
                      <div className="admin-sheet-header">
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-semibold admin-sheet-title">{mobileSheetOrder.customer_name || 'Đơn hàng'}</div>
                          <div className="text-muted small d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                            <span className="font-monospace">{mobileSheetOrder.phone || ''}</span>
                            <span className={`badge ${getStatusBadgeClass(mobileSheetOrder.status)}`}>{getStatusLabel(mobileSheetOrder.status)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => closeMobileSheet()}
                          aria-label="Đóng"
                        >
                          <i className="fas fa-xmark"></i>
                        </button>
                      </div>

                      <div className="admin-sheet-actions">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => { handleCopyOrder(mobileSheetOrder); closeMobileSheet(); }}
                          disabled={saving || !!deletingId || updatingId === mobileSheetOrder.id}
                        >
                          <i className="fas fa-copy me-2"></i>Copy
                        </button>
                        {!!String(mobileSheetOrder.phone || '').trim() && (
                          <a
                            className="btn btn-outline-secondary"
                            href={`tel:${String(mobileSheetOrder.phone || '').trim()}`}
                            onClick={() => closeMobileSheet()}
                          >
                            <i className="fas fa-phone me-2"></i>Gọi
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn btn-dark"
                          onClick={() => { openOrderInspector(mobileSheetOrder); closeMobileSheet(); }}
                        >
                          <i className="fas fa-eye me-2"></i>Mở chi tiết
                        </button>
                      </div>

                      <div className="admin-sheet-section-title">Đổi trạng thái</div>
                      <div className="orders-status-grid">
                        {ORDER_STATUS_OPTIONS.map((opt) => {
                          const active = normalizeOrderStatus(mobileSheetOrder.status) === normalizeOrderStatus(opt.value);
                          const busy = saving || !!deletingId || updatingId === mobileSheetOrder.id;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`orders-status-chip ${active ? 'active' : ''}`}
                              onClick={() => {
                                if (active) return;
                                updateOrderStatus(mobileSheetOrder, opt.value);
                                closeMobileSheet();
                              }}
                              disabled={busy}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile filter sheet */}
                {mobileFilterSheetOpen && (
                  <div className="admin-sheet-root" role="dialog" aria-modal="true" onClick={() => closeMobileFilterSheet()}>
                    <div className="admin-sheet" onClick={(e) => e.stopPropagation()}>
                      <div className="admin-sheet-handle" />
                      <div className="admin-sheet-header">
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-semibold admin-sheet-title">Lọc đơn hàng</div>
                          <div className="text-muted small">Tối ưu cho thao tác một tay</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => closeMobileFilterSheet()}
                          aria-label="Đóng"
                        >
                          <i className="fas fa-xmark"></i>
                        </button>
                      </div>

                      <div className="p-3">
                        <div className="d-flex flex-wrap gap-2">
                          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => applyOrdersPreset('thisMonth')} disabled={isSearchActive}>
                            <i className="fas fa-calendar me-2"></i>Tháng này
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => applyOrdersPreset('overduePending')} disabled={isSearchActive}>
                            <i className="fas fa-triangle-exclamation me-2"></i>Chậm
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => applyOrdersPreset('draftExpiring')} disabled={isSearchActive}>
                            <i className="fas fa-clock me-2"></i>Nháp sắp hủy
                          </button>
                        </div>

                        <div className="mt-3">
                          <div className="fw-semibold mb-2">Trạng thái</div>
                          <div className="orders-filter-chip-grid">
                            <button type="button" className={`orders-filter-chip ${!filterStatus && !overdueOnly ? 'active' : ''}`} onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus(''); }}>
                              Tất cả
                            </button>
                            {ORDER_STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`orders-filter-chip ${filterStatus === opt.value && !overdueOnly ? 'active' : ''}`}
                                onClick={() => { if (isSearchActive) setOrderSearchQuery(''); setOverdueOnly(false); setFilterStatus(opt.value); if (opt.value === 'draft') setFilterMonth(''); }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="form-label small text-muted mb-1">Tháng</label>
                          <input
                            type="month"
                            className="form-control"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            disabled={overdueOnly || isSearchActive}
                          />
                          <div className="form-text">Bật “Chậm” sẽ bỏ qua tháng.</div>
                        </div>

                        <div className="form-check mt-3">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="ordersOverdueOnly"
                            checked={overdueOnly}
                            onChange={(e) => {
                              if (isSearchActive) setOrderSearchQuery('');
                              const v = !!e.target.checked;
                              setOverdueOnly(v);
                              if (v) {
                                setFilterMonth('');
                                setFilterStatus('pending');
                              }
                            }}
                            disabled={isSearchActive}
                          />
                          <label className="form-check-label" htmlFor="ordersOverdueOnly">
                            Chỉ xem đơn chậm &gt; {OVERDUE_PENDING_DAYS} ngày
                          </label>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                          <button type="button" className="btn btn-outline-secondary" onClick={() => applyOrdersPreset('all')} disabled={isSearchActive}>
                            Reset
                          </button>
                          <button type="button" className="btn btn-dark flex-grow-1" onClick={() => closeMobileFilterSheet()}>
                            Xong
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile sticky mini-toolbar (one-hand reach) */}
                <div className={`orders-mobile-toolbar d-md-none ${mobileMiniToolbarVisible ? 'visible' : ''}`}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onPointerDown={(e) => {
                      if (e.button != null && e.button !== 0) return;
                      searchBtnLongPressFiredRef.current = false;
                      try {
                        if (searchBtnLongPressTimerRef.current) clearTimeout(searchBtnLongPressTimerRef.current);
                      } catch {}
                      searchBtnLongPressTimerRef.current = setTimeout(() => {
                        searchBtnLongPressFiredRef.current = true;
                        openSearchPalette(orderSearchQuery);
                      }, 460);
                    }}
                    onPointerUp={() => {
                      try {
                        if (searchBtnLongPressTimerRef.current) clearTimeout(searchBtnLongPressTimerRef.current);
                      } catch {}
                      searchBtnLongPressTimerRef.current = null;
                    }}
                    onPointerCancel={() => {
                      try {
                        if (searchBtnLongPressTimerRef.current) clearTimeout(searchBtnLongPressTimerRef.current);
                      } catch {}
                      searchBtnLongPressTimerRef.current = null;
                    }}
                    onClick={() => {
                      if (searchBtnLongPressFiredRef.current) {
                        searchBtnLongPressFiredRef.current = false;
                        return;
                      }
                      try {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } catch {
                        // ignore
                      }
                      setTimeout(() => orderSearchInputRef.current?.focus?.(), 120);
                    }}
                    aria-label="Search"
                  >
                    <i className="fas fa-search me-2"></i>Search
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => openCreateModal()}
                    disabled={saving || !!deletingId}
                    aria-label="Tạo đơn"
                  >
                    <i className="fas fa-plus me-2"></i>Tạo đơn
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => openMobileFilterSheet()}
                    aria-label="Lọc"
                  >
                    <i className="fas fa-sliders me-2"></i>Lọc
                  </button>
                </div>

                {/* Search palette overlay */}
                {searchPaletteOpen && (
                  <div
                    className="orders-search-palette-root"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => {
                      addSearchHistory(searchPaletteQuery);
                      closeSearchPalette();
                    }}
                  >
                    <div
                      className="orders-search-palette"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => {
                        const t = e.touches && e.touches[0];
                        if (!t) return;
                        pullToSearchRef.current = { active: true, startY: t.clientY, startX: t.clientX, fired: false };
                      }}
                      onTouchMove={(e) => {
                        const s = pullToSearchRef.current;
                        if (!s?.active || s.fired) return;
                        const t = e.touches && e.touches[0];
                        if (!t) return;
                        const dy = t.clientY - s.startY;
                        const dx = t.clientX - s.startX;
                        if (Math.abs(dx) > 24) return;
                        if (dy > 90) {
                          s.fired = true;
                          addSearchHistory(searchPaletteQuery);
                          closeSearchPalette();
                        }
                      }}
                      onTouchEnd={() => {
                        pullToSearchRef.current = { active: false, startY: 0, startX: 0, fired: false };
                      }}
                    >
                      <div className="orders-search-palette-header">
                        <div className="fw-semibold">Tìm nhanh</div>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { addSearchHistory(searchPaletteQuery); closeSearchPalette(); }} aria-label="Đóng">
                          <i className="fas fa-xmark"></i>
                        </button>
                      </div>

                      <div className="orders-search-palette-body">
                        <div className="input-group">
                          <span className="input-group-text"><i className="fas fa-search"></i></span>
                          <input
                            ref={searchPaletteInputRef}
                            type="text"
                            className="form-control"
                            value={searchPaletteQuery}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSearchPaletteQuery(v);
                              setOrderSearchQuery(v);
                            }}
                            placeholder="Nhập tên / SĐT…"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addSearchHistory(searchPaletteQuery);
                                closeSearchPalette();
                              }
                            }}
                          />
                          {!!String(searchPaletteQuery || '').trim() && (
                            <button type="button" className="btn btn-outline-secondary" onClick={() => { setSearchPaletteQuery(''); setOrderSearchQuery(''); }}>
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>

                        {Array.isArray(searchHistory) && searchHistory.length > 0 && (
                          <div className="mt-3">
                            <div className="text-muted small mb-2">Gần đây</div>
                            <div className="orders-chip-row" style={{ marginTop: 0 }}>
                              {searchHistory.slice(0, 8).map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  className="orders-chip"
                                  onClick={() => { setSearchPaletteQuery(q); setOrderSearchQuery(q); addSearchHistory(q); closeSearchPalette(); }}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <div className="text-muted small mb-2">Filter nhanh</div>
                          <div className="orders-filter-chip-grid">
                            <button type="button" className={`orders-filter-chip ${pinnedOnly ? 'active' : ''}`} onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly(false); setTodayOnly(false); setPinnedOnly((v) => !v); closeSearchPalette(); }}>
                              <i className="fas fa-star me-2"></i>Ưu tiên
                            </button>
                            <button type="button" className={`orders-filter-chip ${todayOnly ? 'active' : ''}`} onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly(false); setPinnedOnly(false); setTodayOnly((v) => !v); closeSearchPalette(); }}>
                              <i className="fas fa-calendar me-2"></i>Hôm nay
                            </button>
                            <button type="button" className={`orders-filter-chip ${overdueOnly ? 'active' : ''}`} onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly((v) => !v); if (!overdueOnly) { setFilterMonth(''); setFilterStatus('pending'); } closeSearchPalette(); }}>
                              <i className="fas fa-triangle-exclamation me-2"></i>Chậm
                            </button>
                            <button type="button" className={`orders-filter-chip ${!filterStatus && !overdueOnly && !pinnedOnly && !todayOnly ? 'active' : ''}`} onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly(false); setPinnedOnly(false); setTodayOnly(false); setFilterStatus(''); closeSearchPalette(); }}>
                              Tất cả
                            </button>
                            {ORDER_STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`orders-filter-chip ${filterStatus === opt.value && !overdueOnly ? 'active' : ''}`}
                                onClick={() => { setOrderSearchQuery(''); setSearchPaletteQuery(''); setOverdueOnly(false); setPinnedOnly(false); setTodayOnly(false); setFilterStatus(opt.value); if (opt.value === 'draft') setFilterMonth(''); closeSearchPalette(); }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="orders-search-palette-hint text-muted small">
                        Tip: Giữ nút Search để mở • Vuốt xuống để đóng
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop table */}
                <div className="d-none d-md-block">
                  <div className="table-responsive orders-table-wrap mt-3">
                    <table className="table orders-table table-hover align-middle mb-0">
                      <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>SĐT</th>
                        <th>Sản phẩm</th>
                        <th>SL</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                        <th>Thời gian</th>
                        <th></th>
                      </tr>
                      </thead>
                      <tbody>
                      {ordersToRender.map(order => (
                        <tr
                          key={order.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => openOrderInspector(order)}
                          title="Xem chi tiết"
                        >
                          <td>
                            <div className="fw-semibold">{order.customer_name}</div>
                            {(order?.note || '').trim() && (
                              <div className="text-muted small" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <span className="fw-semibold">Ghi chú:</span> {(order.note || '').trim()}
                              </div>
                            )}
                          </td>
                          <td>{order.phone}</td>
                          <td>
                            {(() => {
                              const rows = getOrderItemRows(order);
                              if (!rows.length) return getOrderProductSummary(order);
                              return (
                                <div className="d-grid gap-1">
                                  {rows.map((r, idx) => (
                                    <div key={idx} className="small" style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.2 }}>
                                      <span className="text-muted me-1">{idx + 1}.</span>
                                      <span className="fw-semibold">{r.name}</span>{' '}
                                      <span className="text-muted">x{r.qty}</span>
                                      {Number(r.unitPrice) > 0 && (
                                        <span className="text-muted">{' '}• {formatVND(r.unitPrice)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td>{getOrderTotalQty(order)}</td>
                          <td className="fw-semibold">{formatVND(getOrderTotalMoney(order))}</td>
                          <td>
                            <div className="d-flex align-items-center gap-1 flex-wrap">
                              <span className={`badge ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                              {isOverduePending(order) && (
                                <span className="badge bg-danger" title={`Chờ xử lý quá ${OVERDUE_PENDING_DAYS} ngày`}>
                                  ⚠ Chậm {getOrderAgeDays(order)}d
                                </span>
                              )}
                              {isDraftExpiringSoon(order) && (
                                <span className="badge bg-warning text-dark" title={`Đơn nháp sẽ tự hủy sau ${DRAFT_AUTO_DELETE_DAYS} ngày`}>
                                  ⏳ Còn {getDraftRemainingDays(order)}d
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{formatDateTime(order.created_at)}</td>
                          <td>
                            <div className="d-flex gap-2 justify-content-end">
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={(e) => { e.stopPropagation(); handleCopyOrder(order); }} disabled={saving || !!deletingId || updatingId === order.id}>
                                <i className="fas fa-copy"></i>
                              </button>
                              <select
                                className="form-select form-select-sm orders-status-quick"
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const v = String(e.target.value || '').trim();
                                  e.target.value = '';
                                  if (!v) return;
                                  updateOrderStatus(order, v);
                                }}
                                disabled={saving || !!deletingId || updatingId === order.id}
                                aria-label="Đổi trạng thái"
                              >
                                <option value="">Status…</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="done">Done</option>
                                <option value="paid">Paid</option>
                                <option value="canceled">Hủy</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!isSearchActive && ordersHasMore && !overdueOnly && (
                  <div className="d-flex justify-content-center mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={loadMoreOrders}
                      disabled={loading || loadingMoreOrders}
                    >
                      {loadingMoreOrders ? (
                        <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Đang tải thêm...</>
                      ) : (
                        <><i className="fas fa-angle-down me-2"></i>Tải thêm đơn</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <AdminDrawer
            open={inspectorOpen}
            title={(() => {
              const o = inspectorOrder;
              const id = o?.id ? `#${o.id}` : '';
              const st = o?.status ? `• ${getStatusLabel(o.status)}` : '';
              return `Đơn hàng ${id} ${st}`.trim();
            })()}
            subtitle={(() => {
              const o = inspectorOrder;
              const who = String(o?.customer_name || '').trim();
              const phone = String(o?.phone || '').trim();
              const when = o?.created_at ? formatDateTime(o.created_at) : '';
              return [who || phone || null, when || null].filter(Boolean).join(' • ');
            })()}
            onClose={closeOrderInspector}
            footer={(
              <div className="d-flex flex-wrap gap-2 justify-content-between">
                {inspectorEditMode ? (
                  <>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setInspectorEditMode(false);
                          setEditingId(null);
                          resetOrderForm('');
                          setShowPhoneHistory(false);
                          setSplitDeliverNow([]);
                        }}
                        disabled={saving || splitting}
                      >
                        <i className="fas fa-xmark me-2"></i>Hủy sửa
                      </button>

                      {!!editingId && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary fw-semibold"
                          onClick={splitOrderDeliverNow}
                          disabled={saving || splitting}
                          title="Chọn sản phẩm giao đợt 1 và tách phần còn lại sang đơn chờ hàng"
                        >
                          {splitting ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang tách...</>
                          ) : (
                            <><i className="fas fa-random me-2"></i>Tách giao ngay</>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-warning fw-semibold"
                        onClick={() => saveOrder({ mode: 'close', origin: 'drawer' })}
                        disabled={saving || splitting || !orderFieldIssues.canSubmit}
                        style={{ boxShadow: '0 4px 12px rgba(255,193,7,0.25)' }}
                      >
                        {saving ? (
                          <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                        ) : (
                          <><i className="fas fa-check me-2"></i>Lưu</>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => inspectorOrder && handleCopyOrder(inspectorOrder)}
                        disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId}
                      >
                        <i className="fas fa-copy me-2"></i>Copy
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => inspectorOrder && editOrder(inspectorOrder)}
                        disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId}
                      >
                        <i className="fas fa-pen me-2"></i>Sửa
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      <select
                        className="form-select form-select-sm"
                        defaultValue=""
                        onChange={(e) => {
                          const v = String(e.target.value || '').trim();
                          e.target.value = '';
                          if (!v) return;
                          inspectorOrder && updateOrderStatus(inspectorOrder, v);
                        }}
                        disabled={!inspectorOrder || inspectorLoading || saving || !!deletingId || updatingId === inspectorOrder?.id}
                        aria-label="Đổi trạng thái"
                        style={{ minWidth: 140 }}
                      >
                        <option value="">Status…</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="done">Done</option>
                        <option value="paid">Paid</option>
                        <option value="canceled">Hủy</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          >
            {inspectorEditMode ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveOrder({ mode: 'close', origin: 'drawer' });
                }}
              >
                <div className="admin-drawer-section">
                  <h6><i className="fas fa-pen me-2 text-warning"></i>Chỉnh sửa</h6>
                  {renderOrderFormFields()}
                </div>
              </form>
            ) : inspectorLoading ? (
              <div className="admin-drawer-section">
                <div className="text-muted small mb-2">Đang tải chi tiết…</div>
                <div className="d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm text-warning" aria-hidden="true"></span>
                  <span className="text-muted">Vui lòng chờ</span>
                </div>
              </div>
            ) : inspectorError ? (
              <div className="alert alert-danger" role="alert">{inspectorError}</div>
            ) : !inspectorOrder ? (
              <div className="text-muted">Chưa có dữ liệu</div>
            ) : (
              <>
                <div className="admin-drawer-section">
                  <h6><i className="fas fa-circle-info me-2 text-warning"></i>Tổng quan</h6>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <span className={`badge ${getStatusBadgeClass(inspectorOrder.status)}`}>{getStatusLabel(inspectorOrder.status)}</span>
                    {isOverduePending(inspectorOrder) && (
                      <span className="badge bg-danger" title={`Chờ xử lý quá ${OVERDUE_PENDING_DAYS} ngày`}>
                        ⚠ Chậm {getOrderAgeDays(inspectorOrder)}d
                      </span>
                    )}
                    {isDraftExpiringSoon(inspectorOrder) && (
                      <span className="badge bg-warning text-dark" title={`Đơn nháp sẽ tự hủy sau ${DRAFT_AUTO_DELETE_DAYS} ngày`}>
                        ⏳ Còn {getDraftRemainingDays(inspectorOrder)}d
                      </span>
                    )}
                  </div>
                  <div className="admin-kv">
                    <div className="k">Tổng tiền</div>
                    <div className="v">{formatVND(getOrderTotalMoney(inspectorOrder))}</div>
                    <div className="k">Số lượng</div>
                    <div className="v">{getOrderTotalQty(inspectorOrder)}</div>
                    <div className="k">Thời gian</div>
                    <div className="v">{formatDateTime(inspectorOrder.created_at)}</div>
                  </div>
                </div>

                <div className="admin-drawer-section">
                  <h6><i className="fas fa-user me-2 text-info"></i>Khách hàng</h6>
                  <div className="admin-kv">
                    <div className="k">Tên</div>
                    <div className="v">{inspectorOrder.customer_name || '—'}</div>
                    <div className="k">SĐT</div>
                    <div className="v" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="font-monospace">{inspectorOrder.phone || '—'}</span>
                      {!!String(inspectorOrder.phone || '').trim() && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => window.KTM.clipboard.writeText(String(inspectorOrder.phone || '').trim())}
                          title="Copy SĐT"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      )}
                    </div>
                    <div className="k">Địa chỉ</div>
                    <div className="v">{inspectorOrder.address || '—'}</div>
                  </div>
                  {(inspectorOrder?.note || '').trim() && (
                    <div className="mt-2 text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <span className="fw-semibold">Ghi chú:</span> {(inspectorOrder.note || '').trim()}
                    </div>
                  )}
                </div>

                <div className="admin-drawer-section">
                  <h6><i className="fas fa-boxes-stacked me-2 text-primary"></i>Sản phẩm</h6>
                  {(() => {
                    const rows = getOrderItemRows(inspectorOrder);
                    if (!rows.length) {
                      return (
                        <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {getOrderProductSummary(inspectorOrder) || '—'}
                        </div>
                      );
                    }
                    return (
                      <div className="d-grid gap-2">
                        {rows.map((r, idx) => (
                          <div key={idx} className="d-flex justify-content-between gap-2">
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <span className="text-muted me-1">{idx + 1}.</span>{r.name}
                              </div>
                              {r.variant ? <div className="text-muted small">{r.variant}</div> : null}
                            </div>
                            <div className="text-muted small text-end text-nowrap" style={{ flexShrink: 0 }}>
                              x{r.qty}{Number(r.unitPrice) > 0 ? ` • ${formatVND(r.unitPrice)}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {(getOrderAdjustmentMoney(inspectorOrder) !== 0 || getOrderAdjustmentSummaryText(inspectorOrder)) && (
                    <div className="mt-2" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <span className="text-muted">Điều chỉnh:</span>{' '}
                      <span className="fw-semibold">{formatVND(getOrderAdjustmentMoney(inspectorOrder))}</span>
                      {getOrderAdjustmentSummaryText(inspectorOrder) ? (
                        <span className="text-muted">{' '}({getOrderAdjustmentSummaryText(inspectorOrder)})</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </AdminDrawer>

          {/* Order create/edit modal */}
          {showModal && (
            <div className="modal show d-block order-modal" style={{ background: 'rgba(0,0,0,0.6)' }} role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-scrollable">
                <div className="modal-content" style={{ borderRadius: 16 }}>
                  <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ffc107, #ffca2c)', border: 'none', borderRadius: '16px 16px 0 0' }}>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      <i className="fas fa-receipt me-2"></i>
                      {editingId ? 'Sửa đơn hàng' : 'Tạo đơn hàng'}
                    </h5>
                    <button type="button" className="btn-close" onClick={closeModal}></button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveOrder({ mode: 'close', origin: 'modal' });
                    }}
                  >
                    <div className="modal-body" ref={orderModalBodyRef}>
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Tên khách hàng *</label>
                          <input
                            className="form-control"
                            value={form.customer_name}
                            onChange={e => setForm({ ...form, customer_name: e.target.value })}
                            placeholder="Nhập tên khách hàng"
                            required
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.nameError && (
                            <div className="form-text text-danger">{orderFieldIssues.nameError}</div>
                          )}
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small text-muted mb-1">Số điện thoại *</label>
                          <input
                            className="form-control"
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9+\s-]*"
                            id="order-phone-input"
                            value={form.phone}
                            onChange={e => handlePhoneChange(e.target.value)}
                            onBlur={handlePhoneBlur}
                            placeholder="Nhập số điện thoại"
                            required
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.phoneError && (
                            <div className="form-text text-danger">{orderFieldIssues.phoneError}</div>
                          )}

                          {!orderFieldIssues.phoneError && phoneMonthHistory.count > 0 && (
                            <div className="form-text text-warning d-flex align-items-center justify-content-between gap-2">
                              <span>
                                Khách này đã có {phoneMonthHistory.count} đơn trong tháng {phoneMonthHistory.monthKey}.
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning"
                                onClick={() => setShowPhoneHistory((v) => !v)}
                              >
                                {showPhoneHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
                              </button>
                            </div>
                          )}

                          {showPhoneHistory && phoneMonthHistory.orders.length > 0 && (
                            <div className="mt-2 border rounded-3 p-2" style={{ background: '#fff' }}>
                              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                                <div className="small fw-semibold">Lịch sử đơn (cùng tháng)</div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => setShowPhoneHistory(false)}
                                >
                                  Ẩn
                                </button>
                              </div>
                              <div className="d-grid gap-2">
                                {phoneMonthHistory.orders.slice(0, 5).map((o) => (
                                  <div key={o.id} className="d-flex align-items-start justify-content-between gap-2">
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div className="small fw-semibold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        #{o.id} • <span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusLabel(o.status)}</span>
                                      </div>
                                      <div className="text-muted small">{formatDateTime(o.created_at)} • {formatVND(getOrderTotalMoney(o))}</div>
                                      <div className="text-muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {getOrderProductSummary(o)}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => {
                                        if (!confirm(`Mở đơn #${o.id}? Dữ liệu đang nhập sẽ mất.`)) return;
                                        editOrder(o);
                                      }}
                                    >
                                      Mở
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {phoneMonthHistory.orders.length > 5 && (
                                <div className="text-muted small mt-2">Chỉ hiển thị 5 đơn gần nhất.</div>
                              )}
                            </div>
                          )}

                          {customerLookup?.status === 'loading' && (
                            <div className="form-text">Đang tìm khách theo SĐT...</div>
                          )}
                          {customerLookup?.status === 'found' && (
                            <div className="form-text text-success">Đã có khách, tự động điền thông tin.</div>
                          )}
                          {customerLookup?.status === 'not-found' && (
                            <div className="form-text text-muted">Chưa có khách, sẽ tạo mới khi lưu đơn.</div>
                          )}
                          {customerLookup?.status === 'error' && (
                            <div className="form-text text-danger">Không tra được khách (lỗi mạng/server).</div>
                          )}
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small text-muted mb-1">Trạng thái</label>
                          <select
                            className="form-select"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            style={{ borderRadius: 10, padding: 12 }}
                          >
                            <option value="draft">Đơn nháp</option>
                            <option value="pending">Chờ xử lý</option>
                            <option value="processing">Đang vận chuyển</option>
                            <option value="done">Hoàn thành</option>
                            <option value="paid">Đã nhận tiền</option>
                            <option value="canceled">Hủy đơn</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Địa chỉ</label>
                          <input
                            className="form-control"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                            placeholder="Nhập địa chỉ (không bắt buộc)"
                            style={{ borderRadius: 10, padding: 12 }}
                          />
                          {!!orderFieldIssues.addressWarn && (
                            <div className="form-text text-warning">{orderFieldIssues.addressWarn}</div>
                          )}
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted mb-1">Ghi chú đơn hàng</label>
                          <textarea
                            className="form-control"
                            value={form.note}
                            onChange={e => setForm({ ...form, note: e.target.value })}
                            placeholder="Ví dụ: Giao giờ hành chính / Gọi trước khi giao..."
                            rows={2}
                            style={{ borderRadius: 10, padding: 12, resize: 'vertical' }}
                          />
                        </div>

                        <div className="col-12">
                          <div className="d-flex align-items-center justify-content-between">
                            <label className="form-label fw-semibold small text-muted mb-1">Điều chỉnh giá (thêm/bớt)</label>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  adjustment_items: [
                                    ...(Array.isArray(prev.adjustment_items) ? prev.adjustment_items : [{ amount: '', note: '' }]),
                                    { amount: '', note: '' },
                                  ],
                                }));
                              }}
                            >
                              <i className="fas fa-plus me-2"></i>Thêm điều chỉnh
                            </button>
                          </div>

                          <div className="d-grid gap-2">
                            {normalizeAdjustmentFormItems(form.adjustment_items).map((adj, idx) => (
                              <div key={idx} className="row g-2 align-items-end">
                                <div className="col-12 col-md-3">
                                  <label className="form-label small text-muted mb-1">Số tiền</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    className="form-control"
                                    value={adj.amount}
                                    onChange={(e) => {
                                      const nextAmount = e.target.value;
                                      setForm((prev) => {
                                        const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                                        arr[idx] = { ...arr[idx], amount: nextAmount };
                                        return { ...prev, adjustment_items: arr };
                                      });
                                    }}
                                    placeholder="+500000 hoặc -200000"
                                    style={{ borderRadius: 10, padding: 12 }}
                                  />
                                </div>
                                <div className="col-12 col-md-8">
                                  <label className="form-label small text-muted mb-1">Ghi chú</label>
                                  <input
                                    className="form-control"
                                    value={adj.note}
                                    onChange={(e) => {
                                      const nextNote = e.target.value;
                                      setForm((prev) => {
                                        const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                                        arr[idx] = { ...arr[idx], note: nextNote };
                                        return { ...prev, adjustment_items: arr };
                                      });
                                    }}
                                    placeholder="Ví dụ: thêm van 1 tay / giảm giá..."
                                    style={{ borderRadius: 10, padding: 12 }}
                                  />
                                </div>
                                <div className="col-12 col-md-1 d-flex">
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger w-100"
                                    onClick={() => {
                                      setForm((prev) => {
                                        const arr = normalizeAdjustmentFormItems(prev.adjustment_items);
                                        arr.splice(idx, 1);
                                        return { ...prev, adjustment_items: arr.length ? arr : [{ amount: '', note: '' }] };
                                      });
                                    }}
                                    disabled={saving || normalizeAdjustmentFormItems(form.adjustment_items).length <= 1}
                                    title="Xóa điều chỉnh"
                                    style={{ borderRadius: 10, padding: 12 }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="form-text">Âm = giảm giá, dương = cộng thêm.</div>
                          {!!orderFieldIssues.adjustmentAbnormalWarn && (
                            <div className="form-text text-warning">{orderFieldIssues.adjustmentAbnormalWarn}</div>
                          )}
                          {!!orderFieldIssues.adjustmentNoteWarn && (
                            <div className="form-text text-warning">{orderFieldIssues.adjustmentNoteWarn}</div>
                          )}
                        </div>
                        <div className="col-12 col-md-8">
                          <div className="d-flex align-items-center justify-content-between">
                            <label className="form-label fw-semibold small text-muted mb-1">Sản phẩm *</label>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  items: [...(Array.isArray(prev.items) ? prev.items : []), { product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }],
                                }));
                                setItemSearches((prev) => [...(Array.isArray(prev) ? prev : []), '']);
                                if (editingId) {
                                  setSplitDeliverNow((prev) => [...(Array.isArray(prev) ? prev : []), true]);
                                }
                              }}
                              disabled={saving}
                            >
                              <i className="fas fa-plus me-2"></i>Thêm sản phẩm
                            </button>
                          </div>

                          <div className="d-grid gap-2">
                            {(Array.isArray(form.items) ? form.items : [{ product_id: "", quantity: 1 }]).map((it, idx) => (
                              <div key={idx} className="row g-2 align-items-end">
                                <div className="col-12 col-md-8">
                                  <div
                                    className="dropdown w-100"
                                    ref={(el) => {
                                      productDropdownRefs.current[idx] = el;
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="form-control text-start d-flex align-items-center justify-content-between"
                                      style={{ borderRadius: 10, padding: 12 }}
                                      onClick={() => {
                                        setOpenProductDropdownIdx((prev) => (prev === idx ? null : idx));
                                        setTimeout(() => {
                                          const input = document.getElementById(`order-product-search-${idx}`);
                                          if (input) input.focus();
                                        }, 0);
                                      }}
                                    >
                                      <span className={it.product_id ? '' : 'text-muted'} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {getProductLabel(it.product_id)}
                                      </span>
                                      <i className="fas fa-chevron-down text-muted" style={{ marginLeft: 8, flexShrink: 0 }}></i>
                                    </button>

                                    {openProductDropdownIdx === idx && (
                                      <div
                                        className="dropdown-menu show w-100 p-2"
                                        style={{ maxHeight: 320, overflowY: 'auto' }}
                                      >
                                        <input
                                          id={`order-product-search-${idx}`}
                                          className="form-control"
                                          value={itemSearches[idx] || ''}
                                          onChange={(e) => {
                                            const next = e.target.value;
                                            setItemSearches((prev) => {
                                              const arr = Array.isArray(prev) ? [...prev] : [];
                                              arr[idx] = next;
                                              return arr;
                                            });
                                          }}
                                          placeholder="Tìm theo tên / mã..."
                                          style={{ borderRadius: 10, padding: 10 }}
                                        />
                                        <div className="mt-2" />
                                        {(() => {
                                          const filtered = getFilteredProducts(idx);
                                          if (filtered.length === 0) {
                                            return <div className="text-muted small px-2 py-1">Không có sản phẩm phù hợp</div>;
                                          }
                                          return filtered.map((p) => (
                                            <button
                                              key={p.id}
                                              type="button"
                                              className="dropdown-item"
                                              onClick={() => {
                                                const next = String(p.id);
                                                const groups = normalizeVariantGroups(p?.variants);
                                                const selections = {};
                                                for (const g of groups) {
                                                  const groupName = String(g?.name || '').trim();
                                                  const first = Array.isArray(g?.options) ? g.options[0] : null;
                                                  const firstLabel = String(first?.label || '').trim();
                                                  if (groupName && firstLabel) selections[groupName] = firstLabel;
                                                }
                                                const variantText = buildVariantTextFromSelections(selections);
                                                const unitPrice = computeUnitPriceForProductAndSelections(p, selections);
                                                setForm((prev) => {
                                                  const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                                  items[idx] = {
                                                    ...(items[idx] || { quantity: 1 }),
                                                    product_id: next,
                                                    variant_json: Object.keys(selections).length ? selections : null,
                                                    variant: variantText,
                                                    unit_price: groups.length ? unitPrice : null,
                                                  };
                                                  return { ...prev, items };
                                                });
                                                setOpenProductDropdownIdx(null);
                                              }}
                                            >
                                              {p.name}{p.code ? ` (${p.code})` : ''}
                                            </button>
                                          ));
                                        })()}
                                      </div>
                                    )}

                                    {/* Keep native required validation */}
                                    <select
                                      className="form-select"
                                      value={it.product_id}
                                      onChange={() => {}}
                                      required
                                      style={{ position: 'absolute', opacity: 0, height: 0, pointerEvents: 'none' }}
                                      tabIndex={-1}
                                      aria-hidden="true"
                                    >
                                      <option value="">-- chọn sản phẩm --</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {(() => {
                                    const issue = orderFieldIssues.items?.[idx];
                                    if (!issue) return null;
                                    return (
                                      <>
                                        {!!issue.productError && <div className="form-text text-danger">{issue.productError}</div>}
                                        {!!issue.dupWarn && <div className="form-text text-warning">{issue.dupWarn}</div>}
                                      </>
                                    );
                                  })()}

                                  {(() => {
                                    if (!it?.product_id) return null;
                                    const p = getProductById(it.product_id);
                                    const groups = normalizeVariantGroups(p?.variants);
                                    if (!groups.length) return null;

                                    const selections = (it?.variant_json && typeof it.variant_json === 'object') ? it.variant_json : {};

                                    return (
                                      <div className="mt-2 d-grid gap-2">
                                        {groups.map((g, gi) => {
                                          const groupName = String(g?.name || `Biến thể ${gi + 1}`).trim();
                                          const selected = String(selections?.[groupName] || '').trim();
                                          return (
                                            <div key={groupName}>
                                              <label className="form-label small text-muted mb-1">{groupName}</label>
                                              <select
                                                className="form-select"
                                                value={selected}
                                                onChange={(e) => {
                                                  const nextLabel = String(e.target.value || '').trim();
                                                  setForm((prev) => {
                                                    const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                                    const cur = { ...(items[idx] || {}) };
                                                    const p = getProductById(cur.product_id);
                                                    const groups = normalizeVariantGroups(p?.variants);
                                                    const nextSelections = (cur?.variant_json && typeof cur.variant_json === 'object') ? { ...cur.variant_json } : {};
                                                    if (nextLabel) nextSelections[groupName] = nextLabel;
                                                    else delete nextSelections[groupName];
                                                    const variantText = buildVariantTextFromSelections(nextSelections);
                                                    const unitPrice = computeUnitPriceForProductAndSelections(p, nextSelections);
                                                    items[idx] = {
                                                      ...cur,
                                                      variant_json: Object.keys(nextSelections).length ? nextSelections : null,
                                                      variant: variantText,
                                                      unit_price: unitPrice,
                                                    };
                                                    return { ...prev, items };
                                                  });
                                                }}
                                                style={{ borderRadius: 10, padding: 12 }}
                                              >
                                                <option value="">-- chọn {groupName} --</option>
                                                {(Array.isArray(g?.options) ? g.options : []).map((opt) => (
                                                  <option key={opt.label} value={opt.label}>
                                                    {opt.label}{Number.isFinite(Number(opt?.price)) ? ` (${formatVND(Number(opt.price))})` : (Number(opt?.price_delta) ? ` (${opt.price_delta > 0 ? '+' : ''}${opt.price_delta})` : '')}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}

                                  {editingId && (
                                    <div className="form-check mt-1">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`order-split-deliver-${idx}`}
                                        checked={!!splitDeliverNow[idx]}
                                        onChange={(e) => {
                                          const checked = !!e.target.checked;
                                          setSplitDeliverNow((prev) => {
                                            const arr = Array.isArray(prev) ? [...prev] : [];
                                            const targetLen = Array.isArray(form.items) ? form.items.length : 0;
                                            while (arr.length < targetLen) arr.push(true);
                                            arr[idx] = checked;
                                            return arr;
                                          });
                                        }}
                                        disabled={saving || splitting}
                                      />
                                      <label className="form-check-label small text-muted" htmlFor={`order-split-deliver-${idx}`}>
                                        Giao đợt 1
                                      </label>
                                    </div>
                                  )}
                                </div>
                                <div className="col-8 col-md-3">
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={it.quantity}
                                    onChange={(e) => {
                                      const nextQty = e.target.value;
                                      setForm((prev) => {
                                        const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                        items[idx] = { ...(items[idx] || { product_id: "" }), quantity: nextQty };
                                        return { ...prev, items };
                                      });
                                    }}
                                    min="1"
                                    style={{ borderRadius: 10, padding: 12 }}
                                  />
                                  {(() => {
                                    const issue = orderFieldIssues.items?.[idx];
                                    if (!issue) return null;
                                    return !!issue.qtyError ? (
                                      <div className="form-text text-danger">{issue.qtyError}</div>
                                    ) : null;
                                  })()}
                                </div>
                                <div className="col-4 col-md-1 d-flex justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => {
                                      setForm((prev) => {
                                        const items = Array.isArray(prev.items) ? [...prev.items] : [];
                                        items.splice(idx, 1);
                                        return { ...prev, items: items.length ? items : [{ product_id: "", quantity: 1, unit_price: null, variant: '', variant_json: null }] };
                                      });
                                      setItemSearches((prev) => {
                                        const arr = Array.isArray(prev) ? [...prev] : [];
                                        arr.splice(idx, 1);
                                        return arr.length ? arr : [''];
                                      });
                                      setSplitDeliverNow((prev) => {
                                        const arr = Array.isArray(prev) ? [...prev] : [];
                                        arr.splice(idx, 1);
                                        return arr;
                                      });
                                      setOpenProductDropdownIdx((prev) => {
                                        if (prev == null) return prev;
                                        if (prev === idx) return null;
                                        if (prev > idx) return prev - 1;
                                        return prev;
                                      });
                                    }}
                                    disabled={saving || splitting || (Array.isArray(form.items) ? form.items.length : 1) <= 1}
                                    title="Xóa sản phẩm"
                                    style={{ borderRadius: 10, padding: 10 }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {(() => {
                          const items = Array.isArray(form.items) ? form.items : [];
                          const normalizedItems = items.filter(it => it?.product_id);
                          const subtotal = getItemsSubtotal(normalizedItems);
                          const shipInfo = getOrderShipInfo(normalizedItems);
                          const adjDerived = getAdjustmentDerivedFromForm(form);
                          const adj = adjDerived.amount;
                          const total = subtotal + (shipInfo.found ? shipInfo.fee : 0) + adj;

                          return (
                            <div className="col-12">
                              <div className="d-flex flex-column gap-1 small bg-light rounded-3 p-3">
                                <div className="d-flex justify-content-between">
                                  <span className="text-muted">Tạm tính</span>
                                  <span className="fw-semibold">{formatVND(subtotal)}</span>
                                </div>
                                {shipInfo.found && (
                                  <div className="d-flex justify-content-between">
                                    <span className="text-muted">Ship</span>
                                    <span className="fw-semibold">{formatVND(shipInfo.fee)}</span>
                                  </div>
                                )}
                                {!!orderFieldIssues.shipAbnormalWarn && (
                                  <div className="text-warning">{orderFieldIssues.shipAbnormalWarn}</div>
                                )}
                                {adj !== 0 && (
                                  <div className="d-flex justify-content-between">
                                    <span className="text-muted">Điều chỉnh</span>
                                    <span className="fw-semibold">{formatVND(adj)}</span>
                                  </div>
                                )}
                                {(form.note || '').trim() && (
                                  <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    Ghi chú đơn: {(form.note || '').trim()}
                                  </div>
                                )}
                                {!!adjDerived.summaryText && (
                                  <div className="text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    Ghi chú điều chỉnh: {adjDerived.summaryText}
                                  </div>
                                )}
                                <div className="d-flex justify-content-between pt-1 border-top">
                                  <span className="text-muted">Tổng</span>
                                  <span className="fw-bold">{formatVND(total)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="modal-footer" style={{ border: 'none' }}>
                      <button type="button" className="btn btn-light" onClick={closeModal} disabled={saving || splitting} style={{ borderRadius: 10 }}>
                        Hủy
                      </button>

                      {!!editingId && (
                        <button
                          type="button"
                          className="btn btn-outline-primary fw-semibold"
                          onClick={splitOrderDeliverNow}
                          disabled={saving || splitting}
                          style={{ borderRadius: 10 }}
                          title="Chọn sản phẩm giao đợt 1 và tách phần còn lại sang đơn chờ hàng"
                        >
                          {splitting ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang tách...</>
                          ) : (
                            <><i className="fas fa-random me-2"></i>Tách đơn giao ngay</>
                          )}
                        </button>
                      )}

                      {!editingId && (
                        <button
                          type="button"
                          className="btn btn-outline-warning fw-semibold"
                          onClick={() => saveOrder({ mode: 'new', origin: 'modal' })}
                          disabled={saving || !orderFieldIssues.canSubmit}
                          style={{ borderRadius: 10 }}
                          title="Lưu xong giữ form để tạo đơn mới"
                        >
                          <i className="fas fa-plus me-2"></i>Lưu &amp; tạo đơn mới
                        </button>
                      )}

                      <button type="submit" className="btn btn-warning fw-semibold" disabled={saving || splitting || !orderFieldIssues.canSubmit} style={{ borderRadius: 10, boxShadow: '0 4px 12px rgba(255,193,7,0.3)' }}>
                        {saving ? (
                          <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                        ) : (
                          <><i className="fas fa-check me-2"></i>Lưu</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
