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
          if (window?.KTM?.clipboard?.writeText) {
            await window.KTM.clipboard.writeText(phone);
          } else {
            await (navigator.clipboard?.writeText?.(phone) ?? Promise.reject(new Error('Clipboard not available')));
          }
          if (typeof showToast === 'function') showToast('Đã copy SĐT', 'success');
        } catch {
          if (typeof showToast === 'function') showToast('Không copy được SĐT', 'danger');
        }
      };
