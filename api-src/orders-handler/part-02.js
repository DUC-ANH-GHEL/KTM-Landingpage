        }

        const shipPercent = normalizeShipPercent(req.query.ship_percent ?? req.query.shipPercent);
        const withMeta = parseBool(req.query.meta, false);

        // Load products for pricing/commission calculations (best-effort)
        let productsRows = [];
        try {
          productsRows = await sql`SELECT id, name, code, price, note, commission_percent, variants FROM products`;
        } catch {
          productsRows = [];
        }

        const productsById = new Map();
        for (const p of Array.isArray(productsRows) ? productsRows : []) {
          const pid = String(p?.id ?? '').trim();
          if (!pid) continue;
          productsById.set(pid, p);
        }

        const normalizeVariantGroups = (variantsRaw) => {
          const raw = Array.isArray(variantsRaw) ? variantsRaw : [];
          return raw
            .map((g) => {
              const name = String(g?.name || '').trim();
              if (!name) return null;
              const options = (Array.isArray(g?.options) ? g.options : [])
                .map((o) => {
                  const label = String(o?.label || '').trim();
                  if (!label) return null;

                  const pRaw = o?.price;
                  const pNum = (() => {
                    if (pRaw == null || pRaw === '') return NaN;
                    if (typeof pRaw === 'number') return pRaw;
                    if (typeof pRaw === 'string') return parseMoney(pRaw);
                    return Number(pRaw);
                  })();
                  const price = Number.isFinite(pNum) ? Math.trunc(pNum) : null;

                  const dRaw = o?.price_delta ?? o?.priceDelta ?? null;
                  const dNum = Number(dRaw);
                  const price_delta = Number.isFinite(dNum) ? Math.trunc(dNum) : 0;

                  return { label, price, price_delta };
                })
                .filter(Boolean);
              return { name, options };
            })
            .filter(Boolean);
        };

        const getProductById = (pid) => {
          const key = String(pid ?? '').trim();
          if (!key) return null;
          return productsById.get(key) || null;
        };

        const computeUnitPriceForItem = (it) => {
          const raw = it?.unit_price ?? it?.unitPrice;
          const n = raw == null || raw === '' ? NaN : Number(raw);
          if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));

          const pid = String(it?.product_id || '').trim();
          const product = getProductById(pid);
          const base = parseMoney(product?.price);

          const selectionsRaw = it?.variant_json ?? it?.variantJson;
          const selections = selectionsRaw && typeof selectionsRaw === 'object' ? selectionsRaw : null;
          if (!selections) return base;

          const groups = normalizeVariantGroups(product?.variants);
          if (!groups.length) return base;

          let current = base;
          for (const g of groups) {
            const groupName = String(g?.name || '').trim();
            const selectedLabel = String(selections?.[groupName] || '').trim();
            if (!groupName || !selectedLabel) continue;
            const opt = (Array.isArray(g.options) ? g.options : []).find(
              (o) => String(o?.label || '').trim() === selectedLabel
            );
            if (!opt) continue;

            if (Number.isFinite(Number(opt.price))) {
              current = Math.max(0, Math.trunc(Number(opt.price)));
              continue;
            }
            const dNum = Number(opt.price_delta);
            if (Number.isFinite(dNum)) current += Math.trunc(dNum);
          }

          return current;
        };

        const DEFAULT_COMMISSION_PERCENT = 5;
        const productCommissionById = new Map(
          (Array.isArray(productsRows) ? productsRows : []).map((p) => {
            const raw = p?.commission_percent ?? p?.commissionPercent;
            const parsed = Number(raw);
            const pct = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : DEFAULT_COMMISSION_PERCENT;
            return [String(p?.id), pct];
          })
        );

        const customerKey = (o) => o.customer_id || o.phone || 'unknown';

        const getOrderShipInfo = (items) => {
          const arr = Array.isArray(items) ? items : [];
          let found = false;
          let maxFee = 0;
          for (const it of arr) {
            const pid = String(it?.product_id || '').trim();
            const p = getProductById(pid);
            const note = it?.product_note ?? p?.note ?? null;
            const fee = parseShipFeeFromNote(note);
            if (fee == null) continue;
            found = true;
            if (fee > maxFee) maxFee = fee;
          }
          return { found, fee: maxFee };
        };

        const q0 = debug ? Date.now() : 0;
        const query = `
          SELECT
            o.id,
            o.parent_order_id,
            o.split_seq,
            o.product_id,
            o.quantity,
            o.status,
            o.created_at,
            o.customer_id,
            o.adjustment_amount,
            o.adjustment_note,
            o.note,
            p0.name AS product_name,
            p0.price AS product_price,
            p0.code AS product_code,
            p0.note AS product_note,
            COALESCE(c.name, o.customer_name) AS customer_name,
            COALESCE(c.phone, o.phone) AS phone,
            COALESCE(c.address, o.address) AS address,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'variant', oi.variant,
                  'variant_json', oi.variant_json
                )
              ) FILTER (WHERE oi.id IS NOT NULL),
              '[]'::json
            ) AS items,
            COALESCE(SUM(oi.quantity) FILTER (WHERE oi.id IS NOT NULL), o.quantity, 0) AS total_quantity
          FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
          LEFT JOIN products p0 ON p0.id = o.product_id
          LEFT JOIN order_items oi ON oi.order_id = (o.id::text)
          WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')
          GROUP BY o.id, c.id, p0.id
          ORDER BY o.created_at DESC
        `;

        const result = await sql(query, [monthStartDate]);
        const q1 = debug ? Date.now() : 0;
        const orders = (Array.isArray(result) ? result : []).map(synthesizeItemsFromLegacy);

        const statusCounts = { draft: 0, pending: 0, processing: 0, done: 0, paid: 0, canceled: 0, other: 0 };
        let activeOrders = 0;
        let totalQty = 0;
        let totalRevenue = 0;
        let doneRevenue = 0;
        let totalRevenueNoShip = 0;
        let doneRevenueNoShip = 0;
        let totalCommissionNoShip = 0;
        let doneCommissionNoShip = 0;

        const revenueByProduct = new Map();
        const revenueByCustomer = new Map();
        const byDay = new Map();

        for (const o of orders) {
          const status = normalizeOrderStatus(o?.status);
          const isCanceled = status === 'canceled';
          const isDraft = status === 'draft';
          const isExcludedFromTotals = isCanceled || isDraft;
          const items = Array.isArray(o?.items) ? o.items : [];

          let orderQty = 0;
          let orderRevenueProducts = 0;
          let orderCommissionProducts = 0;

          for (const it of items) {
            const qty = Number(it?.quantity || 0) || 0;
            const price = computeUnitPriceForItem(it);
            const revenue = qty * price;

            const pid = String(it?.product_id || '');
            const pct = productCommissionById.has(pid)
              ? productCommissionById.get(pid)
              : DEFAULT_COMMISSION_PERCENT;
            const rate = (Number(pct) || 0) / 100;

            orderQty += qty;
            orderRevenueProducts += revenue;
            orderCommissionProducts += revenue * rate;

            if (!isExcludedFromTotals) {
              const pidForAgg = it?.product_id || 'unknown';
              const prod = getProductById(pidForAgg);
              const p = revenueByProduct.get(pidForAgg) || {
                product_id: pidForAgg,
                product_name: prod?.name || '—',
                product_code: prod?.code || '',
                orders: 0,
                quantity: 0,
                revenue: 0,
              };
              p.orders += 1;
              p.quantity += qty;
              p.revenue += revenue;
              revenueByProduct.set(pidForAgg, p);
            }
          }

          const shipInfo = getOrderShipInfo(items);
          const adj = Number(o?.adjustment_amount ?? 0) || 0;
          const orderRevenue = orderRevenueProducts + (shipInfo.found ? shipInfo.fee : 0) + adj;
          const orderRevenueNoShip = orderRevenueProducts + adj;

          const estimatedShipCost = (!shipInfo.found && shipPercent > 0 && orderRevenueProducts > 0)
            ? (orderRevenueProducts * shipPercent / 100)
            : 0;

          const effectiveCommissionRate = orderRevenueProducts > 0
            ? (orderCommissionProducts / orderRevenueProducts)
            : (DEFAULT_COMMISSION_PERCENT / 100);
          const orderCommissionNoShip = orderCommissionProducts
            + (adj * effectiveCommissionRate)
            - (estimatedShipCost * effectiveCommissionRate);

          const isCompleted = status === 'done' || status === 'paid';

          if (status === 'draft') statusCounts.draft += 1;
          else if (status === 'pending') statusCounts.pending += 1;
          else if (status === 'processing') statusCounts.processing += 1;
          else if (status === 'canceled') statusCounts.canceled += 1;
          else if (status === 'paid') {
            statusCounts.paid += 1;
            statusCounts.done += 1;
            doneRevenue += orderRevenue;
            doneRevenueNoShip += orderRevenueNoShip;
            doneCommissionNoShip += orderCommissionNoShip;
          } else if (status === 'done') {
            statusCounts.done += 1;
            doneRevenue += orderRevenue;
            doneRevenueNoShip += orderRevenueNoShip;
            doneCommissionNoShip += orderCommissionNoShip;
          } else statusCounts.other += 1;

          if (!isExcludedFromTotals) {
            activeOrders += 1;
            totalQty += orderQty;
            totalRevenue += orderRevenue;
            totalRevenueNoShip += orderRevenueNoShip;
            totalCommissionNoShip += orderCommissionNoShip;

            const ck = customerKey(o);
            const c = revenueByCustomer.get(ck) || {
              key: ck,
              customer_name: o.customer_name || '',
              phone: o.phone || '',
              orders: 0,
              quantity: 0,
              revenue: 0,
            };
            c.orders += 1;
            c.quantity += orderQty;
            c.revenue += orderRevenue;
            if (!c.customer_name && o.customer_name) c.customer_name = o.customer_name;
            if (!c.phone && o.phone) c.phone = o.phone;
            revenueByCustomer.set(ck, c);

            const day = o.created_at ? new Date(o.created_at) : null;
            if (day && !Number.isNaN(day.getTime())) {
              const k = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
              const d = byDay.get(k) || { day: k, orders: 0, quantity: 0, revenue: 0, doneOrders: 0, doneRevenue: 0 };
              d.orders += 1;
              d.quantity += orderQty;
              d.revenue += orderRevenue;
              if (isCompleted) {
                d.doneOrders += 1;
                d.doneRevenue += orderRevenue;
              }
              byDay.set(k, d);
            }
          }
        }

        const topProducts = Array.from(revenueByProduct.values()).sort((a, b) => b.revenue - a.revenue);
        const customers = Array.from(revenueByCustomer.values()).sort((a, b) => b.revenue - a.revenue);
        const days = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
        const uniqueCustomers = revenueByCustomer.size;

        const avgOrderValue = activeOrders ? Math.round(totalRevenue / activeOrders) : 0;
        const avgQtyPerOrder = activeOrders ? (totalQty / activeOrders) : 0;
        const tempCommission = Math.round(doneCommissionNoShip);
        const tempCommissionAll = Math.round(totalCommissionNoShip);

        const payload = {
          statusCounts,
          activeOrders,
          totalQty,
          totalRevenue,
          doneRevenue,
          tempCommission,
          tempCommissionAll,
          products: topProducts,
          customers,
          days,
          uniqueCustomers,
          avgOrderValue,
          avgQtyPerOrder,
        };

        if (withMeta) {
          return res.status(200).json({
            stats: payload,
            meta: {
              month: monthKey,
              ship_percent: shipPercent,
              ordersCount: orders.length,
              ...(debug ? { timingsMs: { schema: tSchema - t0, cleanup: tCleanup - tSchema, autoAdvance: autoAdvanceMs, query: q1 - q0, total: q1 - t0 } } : {}),
            },
          });
        }

        return res.status(200).json(payload);
      }

      if (id) {
        const query = `
          SELECT
            o.id,
            o.parent_order_id,
            o.split_seq,
            o.product_id,
            o.quantity,
            o.status,
            o.created_at,
            o.customer_id,
            o.adjustment_amount,
            o.adjustment_note,
            o.note,
            p0.name AS product_name,
            p0.price AS product_price,
            p0.code AS product_code,
            p0.note AS product_note,
            COALESCE(c.name, o.customer_name) AS customer_name,
            COALESCE(c.phone, o.phone) AS phone,
            COALESCE(c.address, o.address) AS address,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'variant', oi.variant,
                  'variant_json', oi.variant_json
                )
              ) FILTER (WHERE oi.id IS NOT NULL),
              '[]'::json
            ) AS items,
            COALESCE(SUM(oi.quantity) FILTER (WHERE oi.id IS NOT NULL), o.quantity, 0) AS total_quantity
          FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
          LEFT JOIN products p0 ON p0.id = o.product_id
          LEFT JOIN order_items oi ON oi.order_id = (o.id::text)
          WHERE o.id = $1
          GROUP BY o.id, c.id, p0.id
        `;

        const rows = await sql(query, [id]);
        if (!rows.length) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json(synthesizeItemsFromLegacy(rows[0]));
      }

      const { month } = req.query;
      const monthStartDate = month ? parseMonthStartDate(month) : null;
      const searchRaw = req.query.search ?? req.query.q ?? '';
      const searchQuery = String(searchRaw ?? '').trim();
      const searchDigits = searchQuery.replace(/[^0-9]+/g, '');

      const includeItems = parseBool(req.query.includeItems ?? req.query.items ?? req.query.include_items, true);
      const withMeta = parseBool(req.query.meta, false);
      const limit = parseIntSafe(req.query.limit, null);
      const offset = Math.max(0, parseIntSafe(req.query.offset, 0) ?? 0);
      const wantDebugMeta = debug && withMeta;

      const overdue = String(req.query.overdue || '').trim() === '1' || String(req.query.overdue || '').trim().toLowerCase() === 'true';
      const draftExpiring = String(req.query.draftExpiring || req.query.draft_expiring || '').trim() === '1'
        || String(req.query.draftExpiring || req.query.draft_expiring || '').trim().toLowerCase() === 'true';
      const overdueDaysRaw = req.query.days ?? req.query.overdueDays ?? 3;
      let overdueDays = Number(overdueDaysRaw);
      if (!Number.isFinite(overdueDays) || overdueDays < 0) overdueDays = 3;
      overdueDays = Math.trunc(overdueDays);

      const remainingDaysRaw = req.query.remainingDays ?? req.query.remaining_days ?? 3;
      let remainingDays = Number(remainingDaysRaw);
      if (!Number.isFinite(remainingDays) || remainingDays < 0) remainingDays = 3;
      remainingDays = Math.trunc(remainingDays);
      if (remainingDays > DRAFT_AUTO_DELETE_DAYS) remainingDays = DRAFT_AUTO_DELETE_DAYS;
      const warnAgeDays = Math.max(0, DRAFT_AUTO_DELETE_DAYS - remainingDays);

      let query = `
        SELECT
          o.id,
          o.parent_order_id,
          o.split_seq,
          o.product_id,
          o.quantity,
          o.status,
          o.created_at,
          o.customer_id,
          o.adjustment_amount,
          o.adjustment_note,
          o.note,
          p0.name AS product_name,
          p0.price AS product_price,
          p0.code AS product_code,
          p0.note AS product_note,
          COALESCE(c.name, o.customer_name) AS customer_name,
          COALESCE(c.phone, o.phone) AS phone,
          COALESCE(c.address, o.address) AS address,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'variant', oi.variant,
                'variant_json', oi.variant_json
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) AS items,
          COALESCE(SUM(oi.quantity) FILTER (WHERE oi.id IS NOT NULL), o.quantity, 0) AS total_quantity
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN products p0 ON p0.id = o.product_id
        LEFT JOIN order_items oi ON oi.order_id = (o.id::text)
      `;

      const params = [];
      // ==================== SEARCH (all data, ignore other filters) ====================
      if (searchQuery) {
        // IMPORTANT for performance:
        // - Avoid COALESCE/regexp_replace in WHERE (kills index usage).
        // - Use OR across columns so Postgres can use indexes per-column.
        // - Prefer exact phone match when user typed a full phone number.
        query += ' WHERE (';

        // Name search (supports fuzzy ILIKE with pg_trgm indexes if available)
        query += ' (c.name ILIKE $1 OR o.customer_name ILIKE $1)';
        params.push(`%${searchQuery}%`);

        // Phone search
        if (searchDigits) {
          // Heuristic: if user typed a likely full phone number, do exact match for speed.
          if (searchDigits.length >= 9) {
            query += ` OR (c.phone = $${params.length + 1} OR o.phone = $${params.length + 1})`;
            params.push(searchDigits);
          }
          // Also support partial digits search