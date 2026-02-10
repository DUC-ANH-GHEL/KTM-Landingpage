          query += ` OR (c.phone LIKE $${params.length + 1} OR o.phone LIKE $${params.length + 1})`;
          params.push(`%${searchDigits}%`);
        }

        query += ' )';
      } else if (draftExpiring) {
        // Draft orders that are within <= remainingDays days of auto-cancel.
        // Also limit to drafts created within the last DRAFT_AUTO_DELETE_DAYS (older drafts are auto-canceled).
        query += " WHERE o.status = 'draft' AND o.created_at IS NOT NULL";
        query += " AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))";
        params.push(DRAFT_AUTO_DELETE_DAYS);
        if (warnAgeDays > 0) {
          query += " AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))";
          params.push(warnAgeDays);
        }
      } else if (overdue) {
        query += " WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))";
        params.push(overdueDays);
      } else if (monthStartDate) {
        // Index-friendly filter for a specific month.
        query += " WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')";
        params.push(monthStartDate);
      } else if (month) {
        // Back-compat fallback (should be rare; month param should be YYYY-MM)
        query += " WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1";
        params.push(month);
      }

      query += ' GROUP BY o.id, c.id, p0.id ORDER BY o.created_at DESC';

      // Optional pagination (used by admin UI for faster first paint)
      if (Number.isFinite(limit) && limit > 0) {
        const effectiveLimit = withMeta ? (limit + 1) : limit;
        query += ` LIMIT $${params.length + 1}`;
        params.push(effectiveLimit);
        if (offset > 0) {
          query += ` OFFSET $${params.length + 1}`;
          params.push(offset);
        }
      } else if (offset > 0) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      // Optionally allow skipping items aggregation entirely
      if (!includeItems) {
        // Keep response stable: return orders without items and without the heavy join.
        // This is best-effort and primarily for alert banners.
        let lightQuery = `
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
            '[]'::json AS items,
            COALESCE(
              (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = (o.id::text)),
              o.quantity,
              0
            ) AS total_quantity
          FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
          LEFT JOIN products p0 ON p0.id = o.product_id
        `;

        // Rebuild WHERE using same params logic (kept simple; matches the above branches)
        const p2 = [];
        if (searchQuery) {
          lightQuery += ' WHERE (';
          lightQuery += ' (c.name ILIKE $1 OR o.customer_name ILIKE $1)';
          p2.push(`%${searchQuery}%`);
          if (searchDigits) {
            if (searchDigits.length >= 9) {
              lightQuery += ` OR (c.phone = $${p2.length + 1} OR o.phone = $${p2.length + 1})`;
              p2.push(searchDigits);
            }
            lightQuery += ` OR (c.phone LIKE $${p2.length + 1} OR o.phone LIKE $${p2.length + 1})`;
            p2.push(`%${searchDigits}%`);
          }
          lightQuery += ' )';
        } else if (draftExpiring) {
          lightQuery += " WHERE o.status = 'draft' AND o.created_at IS NOT NULL";
          lightQuery += " AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))";
          p2.push(DRAFT_AUTO_DELETE_DAYS);
          if (warnAgeDays > 0) {
            lightQuery += " AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))";
            p2.push(warnAgeDays);
          }
        } else if (overdue) {
          lightQuery += " WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))";
          p2.push(overdueDays);
        } else if (monthStartDate) {
          lightQuery += " WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')";
          p2.push(monthStartDate);
        } else if (month) {
          lightQuery += " WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1";
          p2.push(month);
        }

        lightQuery += ' ORDER BY o.created_at DESC';
        if (Number.isFinite(limit) && limit > 0) {
          const effectiveLimit = withMeta ? (limit + 1) : limit;
          lightQuery += ` LIMIT $${p2.length + 1}`;
          p2.push(effectiveLimit);
          if (offset > 0) {
            lightQuery += ` OFFSET $${p2.length + 1}`;
            p2.push(offset);
          }
        } else if (offset > 0) {
          lightQuery += ` OFFSET $${p2.length + 1}`;
          p2.push(offset);
        }

        const q0 = debug ? Date.now() : 0;
        const result = await sql(lightQuery, p2);
        const q1 = debug ? Date.now() : 0;
        let rows = Array.isArray(result) ? result : [];
        let hasMore = false;
        if (withMeta && Number.isFinite(limit) && limit > 0 && rows.length > limit) {
          hasMore = true;
          rows = rows.slice(0, limit);
        }
        if (withMeta) {
          return res.status(200).json({
            orders: rows,
            meta: {
              includeItems: false,
              limit: Number.isFinite(limit) && limit > 0 ? limit : null,
              offset,
              count: rows.length,
              hasMore,
              ...(wantDebugMeta ? { timingsMs: { schema: tSchema - t0, cleanup: tCleanup - tSchema, autoAdvance: autoAdvanceMs, query: q1 - q0, total: q1 - t0 } } : {}),
            },
          });
        }
        return res.status(200).json(rows);
      }

      const q0 = debug ? Date.now() : 0;
      const result = await sql(query, params);
      const q1 = debug ? Date.now() : 0;
      let rows = (Array.isArray(result) ? result : []).map(synthesizeItemsFromLegacy);
      let hasMore = false;
      if (withMeta && Number.isFinite(limit) && limit > 0 && rows.length > limit) {
        hasMore = true;
        rows = rows.slice(0, limit);
      }

      if (withMeta) {
        return res.status(200).json({
          orders: rows,
          meta: {
            includeItems: true,
            limit: Number.isFinite(limit) && limit > 0 ? limit : null,
            offset,
            count: rows.length,
            hasMore,
            ...(wantDebugMeta ? { timingsMs: { schema: tSchema - t0, cleanup: tCleanup - tSchema, autoAdvance: autoAdvanceMs, query: q1 - q0, total: q1 - t0 } } : {}),
          },
        });
      }

      return res.status(200).json(rows);
    }

    // POST /api/orders
    if (req.method === 'POST') {
      if (id) {
        return res.status(400).json({ error: 'Use /api/orders for creating orders (no id in URL)' });
      }
      const { customer_name, phone, address, product_id, quantity, status, items, adjustment_amount, adjustment_note, note, parent_order_id, split_seq, created_at, created_at_from_order_id } = req.body;

      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'phone is required' });
      }

      const customer = await upsertCustomerByPhone({
        name: customer_name,
        phone: normalizedPhone,
        address,
      });

      const normalizedItems = normalizeOrderItems(items, product_id, quantity);
      if (!normalizedItems.length) {
        return res.status(400).json({ error: 'items is required' });
      }
      const primary = normalizedItems[0];

      const adj = Number(adjustment_amount);
      const adjAmount = Number.isFinite(adj) ? Math.trunc(adj) : 0;
      const adjNote = adjustment_note != null && String(adjustment_note).trim() ? String(adjustment_note).trim() : null;
      const orderNote = note != null && String(note).trim() ? String(note).trim() : null;

      // Optional: preserve created_at for split orders.
      // Prefer copying from an existing order to avoid timezone/format pitfalls.
      let createdAtOverride = null;
      const copyFromId = created_at_from_order_id != null && String(created_at_from_order_id).trim()
        ? String(created_at_from_order_id).trim()
        : null;
      if (copyFromId) {
        const src = await sql`SELECT created_at FROM orders WHERE id = ${copyFromId} LIMIT 1`;
        if (!src.length) {
          return res.status(400).json({ error: 'created_at_from_order_id not found' });
        }
        createdAtOverride = src[0]?.created_at ?? null;
      } else if (created_at != null && String(created_at).trim()) {
        const raw = String(created_at).trim();
        const t = new Date(raw);
        if (!Number.isFinite(t.getTime())) {
          return res.status(400).json({ error: 'created_at is invalid' });
        }
        createdAtOverride = raw;
      }

      let parentOrderId = parent_order_id != null && String(parent_order_id).trim() ? String(parent_order_id).trim() : null;
      let splitSeq = 0;

      // Allow creating a "root" split order (no parent) with split_seq=1
      if (!parentOrderId) {
        const seqNum = Number(split_seq);
        if (Number.isFinite(seqNum) && Math.trunc(seqNum) === 1) {
          splitSeq = 1;
        }
      }

      if (parentOrderId) {
        const parent = await sql`SELECT id, split_seq FROM orders WHERE id = ${parentOrderId} LIMIT 1`;
        if (!parent.length) {
          return res.status(400).json({ error: 'parent_order_id not found' });
        }

        // Ensure parent is marked as first split when creating children.
        await sql`
          UPDATE orders
          SET split_seq = 1
          WHERE id = ${parentOrderId} AND (split_seq IS NULL OR split_seq = 0)
        `;

        const nextSeqRows = await sql`
          SELECT (GREATEST(COALESCE(MAX(split_seq), 0), 1) + 1) AS next_seq
          FROM orders
          WHERE id = ${parentOrderId} OR parent_order_id = ${parentOrderId}
        `;
        const nextSeq = Number(nextSeqRows?.[0]?.next_seq ?? 2);
        splitSeq = Number.isFinite(nextSeq) ? Math.trunc(nextSeq) : 2;
        if (splitSeq < 2) splitSeq = 2;
      }

      const created = createdAtOverride == null
        ? await sql`
            INSERT INTO orders (customer_id, parent_order_id, split_seq, product_id, quantity, status, status_updated_at, adjustment_amount, adjustment_note, note)
            VALUES (${customer.id}, ${parentOrderId}, ${splitSeq}, ${primary.product_id}, ${primary.quantity}, ${status}, NOW(), ${adjAmount}, ${adjNote}, ${orderNote})
            RETURNING id
          `
        : await sql`
            INSERT INTO orders (customer_id, parent_order_id, split_seq, product_id, quantity, status, status_updated_at, adjustment_amount, adjustment_note, note, created_at)
            VALUES (${customer.id}, ${parentOrderId}, ${splitSeq}, ${primary.product_id}, ${primary.quantity}, ${status}, NOW(), ${adjAmount}, ${adjNote}, ${orderNote}, ${createdAtOverride}::timestamp)
            RETURNING id
          `;

      const orderId = created?.[0]?.id;
      if (orderId == null) return res.status(500).json({ error: 'Failed to create order' });
      const orderIdStr = String(orderId);

      for (const it of normalizedItems) {
        const variantJson = it.variant_json != null ? JSON.stringify(it.variant_json) : null;
        await sql`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, variant, variant_json)
          VALUES (${crypto.randomUUID()}, ${orderIdStr}, ${it.product_id}, ${it.quantity}, ${it.unit_price}, ${it.variant}, ${variantJson}::jsonb)
        `;
      }

      return res.status(201).json({ success: true, id: orderId });
    }

    // PUT /api/orders/:id (or PUT /api/orders with body.id)
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Order ID is required' });

      const { customer_name, phone, address, product_id, quantity, status, items, adjustment_amount, adjustment_note, note } = req.body;
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'phone is required' });
      }

      const currentRows = await sql`SELECT parent_order_id, split_seq, status FROM orders WHERE id = ${id} LIMIT 1`;
      if (!currentRows.length) return res.status(404).json({ error: 'Order not found' });
      const cur = currentRows[0];

      const hasParentField = Object.prototype.hasOwnProperty.call(req.body || {}, 'parent_order_id');
      const hasSplitField = Object.prototype.hasOwnProperty.call(req.body || {}, 'split_seq');

      let nextParentOrderId = cur.parent_order_id ?? null;
      if (hasParentField) {
        const raw = req.body.parent_order_id;
        nextParentOrderId = raw != null && String(raw).trim() ? String(raw).trim() : null;
      }

      let nextSplitSeq = Number(cur.split_seq ?? 0);
      if (!Number.isFinite(nextSplitSeq)) nextSplitSeq = 0;
      nextSplitSeq = Math.trunc(nextSplitSeq);
      if (hasSplitField) {
        const seqNum = Number(req.body.split_seq);
        nextSplitSeq = Number.isFinite(seqNum) ? Math.max(0, Math.trunc(seqNum)) : 0;
      }

      const customer = await upsertCustomerByPhone({
        name: customer_name,
        phone: normalizedPhone,
        address,
      });

      const normalizedItems = normalizeOrderItems(items, product_id, quantity);
      if (!normalizedItems.length) {
        return res.status(400).json({ error: 'items is required' });
      }
      const primary = normalizedItems[0];

      const adj = Number(adjustment_amount);
      const adjAmount = Number.isFinite(adj) ? Math.trunc(adj) : 0;
      const adjNote = adjustment_note != null && String(adjustment_note).trim() ? String(adjustment_note).trim() : null;
      const orderNote = note != null && String(note).trim() ? String(note).trim() : null;

      await sql`
        UPDATE orders SET
          customer_id = ${customer.id},
          parent_order_id = ${nextParentOrderId},
          split_seq = ${nextSplitSeq},
          product_id = ${primary.product_id},
          quantity = ${primary.quantity},
          status = ${status},
          status_updated_at = CASE WHEN status IS DISTINCT FROM ${status} THEN NOW() ELSE status_updated_at END,
          adjustment_amount = ${adjAmount},
          adjustment_note = ${adjNote},
          note = ${orderNote},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // Replace items
      await sql`DELETE FROM order_items WHERE order_id = ${orderIdText}`;
      for (const it of normalizedItems) {
        const variantJson = it.variant_json != null ? JSON.stringify(it.variant_json) : null;
        await sql`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, variant, variant_json)
          VALUES (${crypto.randomUUID()}, ${orderIdText}, ${it.product_id}, ${it.quantity}, ${it.unit_price}, ${it.variant}, ${variantJson}::jsonb)
        `;
      }

      return res.status(200).json({ success: true });
    }

    // DELETE /api/orders/:id
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Order ID is required' });
      await sql`DELETE FROM order_items WHERE order_id = ${orderIdText}`;
      await sql`DELETE FROM orders WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
