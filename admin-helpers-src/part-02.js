      const p = getP(pid);
      const note = it?.product_note ?? p?.note ?? null;
      const fee = money.parseShipFeeFromNote(note);
      if (fee == null) continue;
      found = true;
      if (fee > maxFee) maxFee = fee;
    }
    return { found, fee: maxFee };
  };

  orders.getOrderTotalMoney = orders.getOrderTotalMoney || function getOrderTotalMoney(order, getProductById) {
    const items = orders.getOrderItems(order);
    const subtotal = orders.getItemsSubtotal(items, getProductById);
    const ship = orders.getOrderShipInfo(items, getProductById).fee;
    const adj = orders.getOrderAdjustmentMoney(order);
    return subtotal + ship + adj;
  };

  orders.compareOrders = orders.compareOrders || function compareOrders(a, b) {
    const statusRank = { draft: -1, pending: 0, processing: 1, done: 2, paid: 3 };
    const getRank = (status) => (status in statusRank ? statusRank[status] : 99);
    const getCreatedTime = (v) => {
      if (!v) return Number.POSITIVE_INFINITY;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };

    const ra = getRank(a?.status);
    const rb = getRank(b?.status);
    if (ra !== rb) return ra - rb;

    const ta = getCreatedTime(a?.created_at);
    const tb = getCreatedTime(b?.created_at);
    if (ta !== tb) return tb - ta;

    const ia = Number(a?.id);
    const ib = Number(b?.id);
    if (Number.isFinite(ia) && Number.isFinite(ib)) return ib - ia;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  };

  orders.sortOrders = orders.sortOrders || function sortOrders(arr) {
    return [...(arr || [])].sort(orders.compareOrders);
  };
})();
