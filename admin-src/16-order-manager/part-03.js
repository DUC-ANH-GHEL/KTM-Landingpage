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