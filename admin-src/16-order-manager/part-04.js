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
