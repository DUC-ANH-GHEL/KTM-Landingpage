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