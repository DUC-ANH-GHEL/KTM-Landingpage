            if (t1 == null || t2 == null) return false;
            const dd = Math.abs(t1 - t2) / (24 * 60 * 60 * 1000);
            return dd > 0 && dd <= 1.01;
          })();

          const nameSim = similarityScore(String(group?.productNorm || ''), String(order?.productNorm || ''));

          const hasPhone = Boolean(phoneKey);
          const weights = hasPhone
            ? { phone: 0.50, cod: 0.30, day: 0.08, name: 0.12 }
            : { phone: 0, cod: 0.45, day: 0.10, name: 0.45 };

          const phoneScore = phoneMatch ? weights.phone : 0;
          const codScore = codExact ? weights.cod : (codWithin ? weights.cod * (1 - (bestDiff / Math.max(1, tol))) : 0);
          const dayScore = dayExact ? weights.day : (dayNear ? weights.day * 0.6 : 0);
          const nameScore = Math.max(0, Math.min(1, nameSim)) * weights.name;

          const score = phoneScore + codScore + dayScore + nameScore;
          const reasons = [];
          if (phoneMatch) reasons.push('SĐT trùng');
          if (codExact) reasons.push('COD trùng');
          else if (codWithin) reasons.push(`COD lệch ${window.KTM.money.formatNumber(bestDiff)} (<= ${window.KTM.money.formatNumber(tol)})`);
          else if (bestCand > 0 && Number.isFinite(bestDiff) && bestDiff !== Infinity) reasons.push(`COD lệch ${window.KTM.money.formatNumber(bestDiff)}`);
          if (dayExact) reasons.push('Cùng ngày');
          else if (dayNear) reasons.push('Ngày gần đúng (±1)');
          if (nameSim >= 0.8) reasons.push(`Tên tương đương ${Math.round(nameSim * 100)}%`);
          else if (nameSim >= 0.6) reasons.push(`Tên tương đương ${Math.round(nameSim * 100)}%`);
          return { score, reasons, nameSim, phoneMatch, codExact, codWithin, codDiff: bestDiff, bestCand };
        };

        const reconcileExcelAgainstSystem = async (file) => {
          setReconError('');
          setReconResult(null);
          setReconFileName(file?.name || '');
          setReconRunning(true);
          setReconProgress('Đang đọc file Excel...');

          try {
            await ensureProductsLoaded();

            const parsed = await parseExcelFileRows(file);
            const excelRows = parsed.rows;
            const monthKeys = parsed.monthKeys.length ? parsed.monthKeys : [month];

            const excelGroups = buildExcelGroups(excelRows);
            setReconProgress(`Đọc được ${excelRows.length} dòng (${excelGroups.length} cụm). Đang chuẩn bị đối soát...`);

            const sysOrders = await buildSystemOrderRecords(monthKeys);
            setReconProgress(`Đang đối soát (${excelGroups.length} cụm Excel vs ${sysOrders.length} đơn hệ thống)...`);

            const usedOrderIds = new Set();
            const matches = [];
            const excelOnly = []; // { group, suggestions }
            const amountMismatch = []; // { group, order, score, diff, reason }

            const codTolerance = reconEnableCodTolerance ? Math.max(0, Number(reconCodTolerance || 0) || 0) : 0;

            // Pass 1: composite match by phone + COD + day + product name
            const systemByPhone = new Map();
            for (const o of sysOrders) {
              const p = String(o.phoneNorm || '').trim();
              if (!p) continue;
              const arr = systemByPhone.get(p) || [];
              arr.push(o);
              systemByPhone.set(p, arr);
            }

            // Also keep a COD index for groups without phone
            const moneyMap = new Map();
            for (const o of sysOrders) {
              const key = String(o.cod);
              const arr = moneyMap.get(key) || [];
              arr.push(o);
              moneyMap.set(key, arr);
            }

            for (const g of excelGroups) {
              const phoneKey = String(g.phoneNorm || '').trim();
              let candidates = [];
              if (phoneKey) {
                candidates = (systemByPhone.get(phoneKey) || []).filter((o) => !usedOrderIds.has(o.id));
              } else {
                candidates = (moneyMap.get(String(g.cod)) || []).filter((o) => !usedOrderIds.has(o.id));
              }

              // Prefer same day when provided
              if (g.dayKey && candidates.length) {
                const sameDay = candidates.filter((o) => String(o.dayKey || '') === String(g.dayKey || ''));
                if (sameDay.length) candidates = sameDay;
              }

              if (!candidates.length) {
                excelOnly.push({ group: g, suggestions: [] });
                continue;
              }

              // Strongest shortcut: phone + any exact COD candidate uniquely identifies an order
              if (phoneKey) {
                const codCands = Array.isArray(g.codCandidates) && g.codCandidates.length ? g.codCandidates : [Number(g.cod || 0) || 0];
                const exactPool = candidates.filter((o) => codCands.some((c) => Number(c || 0) === Number(o.cod || 0)));
                let exactPool2 = exactPool;
                if (g.dayKey && exactPool2.length) {
                  const sameDay2 = exactPool2.filter((o) => String(o.dayKey || '') === String(g.dayKey || ''));
                  if (sameDay2.length) exactPool2 = sameDay2;
                }
                if (exactPool2.length === 1) {
                  const only = exactPool2[0];
                  usedOrderIds.add(only.id);
                  matches.push({ group: g, order: only, score: 1, reasons: ['SĐT trùng', 'COD trùng', ...(g.dayKey ? ['Cùng ngày'] : [])] });
                  continue;
                }
              }

              // Score all candidates
              const scored = candidates
                .map((o) => {
                  const s = scoreCandidate(g, o, { codTolerance });
                  return { order: o, ...s };
                })
                .sort((a, b) => b.score - a.score);

              const best = scored[0];
              const suggestions = scored.slice(0, 3).map((x) => ({
                id: x.order.id,
                cod: x.order.cod,
                productSummary: x.order.productSummary,
                score: x.score,
                reasons: x.reasons,
              }));

              const threshold = phoneKey ? 0.70 : 0.80;
              if (best && best.score >= threshold && best.codExact) {
                usedOrderIds.add(best.order.id);
                matches.push({ group: g, order: best.order, score: best.score, reasons: best.reasons });
              } else if (best && phoneKey && (best.codWithin || (codTolerance > 0 && Number.isFinite(best.codDiff) && best.codDiff <= codTolerance)) && best.nameSim >= 0.55) {
                usedOrderIds.add(best.order.id);
                const diff = Number(g.cod || 0) - Number(best.order.cod || 0);
                amountMismatch.push({ group: g, order: best.order, score: best.score, diff, reason: best.reasons.join(' · ') });
              } else {
                excelOnly.push({ group: g, suggestions });
              }
            }

            const stillExcelOnly = excelOnly;

            const systemOnly = sysOrders.filter((o) => !usedOrderIds.has(o.id));

            const ok = stillExcelOnly.length === 0 && systemOnly.length === 0 && amountMismatch.length === 0;

            setReconResult({
              ok,
              monthKeys,
              excelCount: excelRows.length,
              excelGroupCount: excelGroups.length,
              systemCount: sysOrders.length,
              matches,
              excelOnly: stillExcelOnly,
              systemOnly,
              amountMismatch,
            });
            setReconProgress(ok ? 'OK ✅' : 'Đã đối soát xong');
          } catch (e) {
            setReconError(String(e?.message || e || 'Lỗi đối soát'));
            setReconProgress('');
          } finally {
            setReconRunning(false);
          }
        };

        }

        const handleStatsTouchStart = (e) => {
          try {
            if (!e?.touches || e.touches.length !== 1) return;
            if (swipeAnimating) return;
            const target = e.target;
            if (target && typeof target.closest === 'function') {
              // Avoid hijacking gestures on interactive controls
              const interactive = target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"], .dropdown-menu, .modal');
              if (interactive) {
                swipeStartRef.current = null;
                return;
              }
            }
            const t = e.touches[0];
            swipeStartRef.current = { x: t.clientX, y: t.clientY, at: Date.now(), swiping: false };
          } catch {
            swipeStartRef.current = null;
          }
        };

        const handleStatsTouchMove = (e) => {
          const start = swipeStartRef.current;
          if (!start || swipeAnimating) return;
          const t = e?.touches && e.touches[0];
          if (!t) return;

          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          const adx = Math.abs(dx);
          const ady = Math.abs(dy);

          if (!start.swiping) {
            if (adx > 12 && adx > ady * 1.2) {
              start.swiping = true;
              setSwipeAnimating(false);
            } else {
              return;
            }
          }

          const maxDx = getSwipeMax();
          setSwipeDx(clamp(dx, -maxDx, maxDx));
        };

        const handleStatsTouchEnd = (e) => {
          const start = swipeStartRef.current;
          swipeStartRef.current = null;
          if (!start || swipeAnimating || !start.swiping) {
            setSwipeDx(0);
            return;
          }

          const t = e?.changedTouches && e.changedTouches[0];
          if (!t) return;

          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          const dt = Date.now() - start.at;

          const adx = Math.abs(dx);
          const ady = Math.abs(dy);

          // Only handle clear horizontal swipes; keep vertical scroll natural
          if (dt > 1000) return;
          if (adx < 30) {
            setSwipeDx(0);
            return;
          }
          if (adx < ady * 1.5) return;

          const threshold = getNavThreshold();
          const shouldNav = adx >= threshold;
          const sign = dx > 0 ? 1 : -1;

          if (!shouldNav) {
            setSwipeAnimating(true);
            setSwipeDx(0);
            setTimeout(() => setSwipeAnimating(false), 220);
            return;
          }

          const delta = sign > 0 ? -1 : 1;
          const candidate = shiftMonthKey(month, delta);
          if (!isMonthInRange(candidate)) {
            setSwipeAnimating(true);
            setSwipeDx(sign * Math.floor(getSwipeMax() * 0.55));
            setTimeout(() => {
              setSwipeDx(0);
              setTimeout(() => setSwipeAnimating(false), 200);
            }, 140);
            maybeToastMonthLimit(candidate > maxMonthKey ? 'future' : 'past');
            return;
          }

          setSwipeAnimating(true);
          setSwipeDx(sign * getSwipeMax());
          setTimeout(() => {
            setMonth((prev) => shiftMonthKey(prev, delta));
            // create a simple slide-through effect
            setSwipeDx(-sign * getSwipeMax());
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setSwipeDx(0);
                setTimeout(() => setSwipeAnimating(false), 220);
              });
            });
          }, 140);
        };

        const handleStatsTouchCancel = () => {
          swipeStartRef.current = null;
          setSwipeDx(0);
        };

        // Desktop/DevTools support: drag mouse to simulate swipe
        const handleStatsPointerDown = (e) => {
          try {
            if (!e) return;
            if (e.pointerType === 'touch') return; // handled by touch events
            if (typeof e.button === 'number' && e.button !== 0) return;
            if (swipeAnimating) return;
            const target = e.target;
            if (target && typeof target.closest === 'function') {
              const interactive = target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"], .dropdown-menu, .modal');
              if (interactive) {
                swipeStartRef.current = null;
                return;
              }
            }
            swipeStartRef.current = { x: e.clientX, y: e.clientY, at: Date.now(), swiping: false };
            try {
              e.currentTarget?.setPointerCapture?.(e.pointerId);
            } catch {
              // ignore
            }
          } catch {
            swipeStartRef.current = null;
          }
        };

        const handleStatsPointerMove = (e) => {
          try {
            if (!e) return;
            if (e.pointerType === 'touch') return;
            const start = swipeStartRef.current;
            if (!start || swipeAnimating) return;

            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const adx = Math.abs(dx);
            const ady = Math.abs(dy);

            if (!start.swiping) {
              if (adx > 12 && adx > ady * 1.2) {
                start.swiping = true;
                setSwipeAnimating(false);
              } else {
                return;
              }
            }

            const maxDx = getSwipeMax();
            setSwipeDx(clamp(dx, -maxDx, maxDx));
          } catch {
            // ignore
          }
        };

        const handleStatsPointerUp = (e) => {
          try {
            if (!e) return;
            if (e.pointerType === 'touch') return;
            const start = swipeStartRef.current;
            swipeStartRef.current = null;
            if (!start || swipeAnimating || !start.swiping) {
              setSwipeDx(0);
              return;
            }

            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const dt = Date.now() - start.at;

            const adx = Math.abs(dx);
            const ady = Math.abs(dy);

            if (dt > 1000) return;
            if (adx < 30) {
              setSwipeDx(0);
              return;
            }
            if (adx < ady * 1.5) return;

            const threshold = getNavThreshold();
            const shouldNav = adx >= threshold;
            const sign = dx > 0 ? 1 : -1;

            if (!shouldNav) {
              setSwipeAnimating(true);
              setSwipeDx(0);
              setTimeout(() => setSwipeAnimating(false), 220);
              return;
            }

            const delta = sign > 0 ? -1 : 1;
            const candidate = shiftMonthKey(month, delta);
            if (!isMonthInRange(candidate)) {
              setSwipeAnimating(true);
              setSwipeDx(sign * Math.floor(getSwipeMax() * 0.55));
              setTimeout(() => {
                setSwipeDx(0);
                setTimeout(() => setSwipeAnimating(false), 200);
              }, 140);
              maybeToastMonthLimit(candidate > maxMonthKey ? 'future' : 'past');
              return;
            }

            setSwipeAnimating(true);
            setSwipeDx(sign * getSwipeMax());
            setTimeout(() => {
              setMonth((prev) => shiftMonthKey(prev, delta));
              setSwipeDx(-sign * getSwipeMax());
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setSwipeDx(0);
                  setTimeout(() => setSwipeAnimating(false), 220);
                });
              });
            }, 140);
          } catch {
            swipeStartRef.current = null;
          }
        };

        const handleStatsPointerCancel = () => {
          swipeStartRef.current = null;
          setSwipeDx(0);
        };

        const swipeHint = swipeDx > 0 ? 'Tháng trước' : (swipeDx < 0 ? 'Tháng sau' : '');
        const rawTargetMonth = swipeDx > 0 ? shiftMonthKey(month, -1) : (swipeDx < 0 ? shiftMonthKey(month, 1) : '');
        const swipeTargetMonth = rawTargetMonth && isMonthInRange(rawTargetMonth) ? rawTargetMonth : '';
        const swipeHintOpacity = Math.min(1, Math.abs(swipeDx) / Math.max(1, getNavThreshold()));

        return (
          <div
            className="product-manager pb-5 mb-4 stats-manager"
            ref={statsRootRef}
            style={{
              touchAction: 'pan-y',
              transform: `translateX(${swipeDx}px)`,
              transition: swipeAnimating ? 'transform 220ms ease' : 'none',
              willChange: 'transform',
            }}
            onTouchStartCapture={handleStatsTouchStart}
            onTouchMoveCapture={handleStatsTouchMove}
            onTouchEndCapture={handleStatsTouchEnd}
            onTouchCancelCapture={handleStatsTouchCancel}
            onPointerDown={handleStatsPointerDown}
            onPointerMove={handleStatsPointerMove}
            onPointerUp={handleStatsPointerUp}
            onPointerCancel={handleStatsPointerCancel}
          >
            {!!swipeHint && (
              <div
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  top: 84,
                  zIndex: 1060,
                  pointerEvents: 'none',
                  opacity: 0.15 + 0.55 * swipeHintOpacity,
                  transform: 'translateZ(0)',
                }}
              >
                <div className="d-flex justify-content-center">
                  <div className="px-3 py-2 rounded-pill bg-dark text-white shadow-sm" style={{ fontSize: 13 }}>
                    {swipeDx > 0 ? '←' : '→'} {swipeHint} · {swipeTargetMonth}
                  </div>
                </div>
              </div>
            )}
            <Loading show={loadingStats} />
            <div className="product-header">
              <h5 className="mb-0"><i className="fas fa-chart-column me-2 text-warning"></i>Thống kê</h5>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => loadStats(true)} disabled={loadingStats}>
                <i className="fas fa-rotate me-2"></i>Làm mới
              </button>
            </div>

            <div className="product-search">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-5">
                  <label className="form-label mb-1">Chọn tháng</label>
                  <div className="input-group">
                    <span className="input-group-text" aria-hidden="true"><i className="fas fa-calendar-alt"></i></span>
                    <input
                      type="month"
                      className="form-control"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      aria-label="Chọn tháng"
                    />
                  </div>
                </div>
                <div className="col-12 col-md-7 d-flex gap-2 justify-content-md-end">
                  <div className="d-flex flex-wrap gap-2 align-self-center">