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