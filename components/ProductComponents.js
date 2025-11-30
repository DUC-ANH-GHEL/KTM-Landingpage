// components/ProductComponents.js
// Chứa các component liên quan đến sản phẩm

// ================== PRODUCT LIST - COMBO SẢN PHẨM ==================
function ProductList() {
  const { useState, useEffect } = React;
  const [timeLeft, setTimeLeft] = useState("");
  const [isPromoOver, setIsPromoOver] = useState(false);
  const [showUrgencyPopup, setShowUrgencyPopup] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set(['van2tay']));
  const [modalImage, setModalImage] = useState(null);

  const deadline = new Date("2025-05-07T18:20:00");
  deadline.setDate(deadline.getDate() + 15);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const distance = deadline - now;

      if (distance <= 0) {
        setTimeLeft("Đã hết khuyến mãi");
        setIsPromoOver(true);
        clearInterval(interval);
        const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        beep.play();
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((distance / (1000 * 60)) % 60);
      const seconds = Math.floor((distance / 1000) % 60);

      setTimeLeft(`⏰ Còn lại ${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`);

      if (distance <= 86400000) {
        setShowUrgencyPopup(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const productGroups = {
    van2tay: {
      title: "🔧 Combo Van 2 Tay",
      subtitle: "Điều khiển linh hoạt, phù hợp mọi loại máy",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762120/combo_van_2_tay_2_ty_nghi%C3%AAng_gi%E1%BB%AFa_KTM_bwpf3o.jpg",
          name: "Combo van 2 tay 2 ty nghiêng giữa KTM",
          desc: "Bộ van 2 tay KTM + 1 xylanh nghiêng + 1 xylanh giữa chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp",
          price: "7.300.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762121/combo_van_2_tay_1_ty_nghi%C3%AAng_ktm_eumive.jpg",
          name: "Combo van 2 tay 1 ty nghiêng ktm",
          desc: "Bộ van 2 tay KTM + 1 xylanh nghiêng chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp - Van có lọc mạt",
          price: "5.080.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762402/combo_van_2_tay_1_ty_gi%E1%BB%AFa_KTM_e6ssao.jpg",
          name: "Combo van 2 tay 1 ty giữa ktm",
          desc: "Bộ van 2 tay KTM + 1 xylanh giữa chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp - Van có lọc mạt",
          price: "5.080.000đ",
          promo: false
        }
      ]
    },
    van1tay: {
      title: "🔧 Combo Van 1 Tay",
      subtitle: "Điều khiển đơn giản, phù hợp máy nhỏ",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1751807509/74_combo_van_1_tay_1_xylanh_%E1%BB%A7i_gvf1t1.jpg",
          name: "Combo Van 1 tay + 1 xylanh ủi",
          desc: "Bộ van 1 tay KTM + 1 xylanh ủi chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp - Van có lọc mạt",
          price: "5.000.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1751807509/74.1_Combo_1_tay_xylanh_nghi%C3%AAng_thbmua.jpg",
          name: "Combo Van 1 tay + 1 xylanh nghiêng/giữa",
          desc: "Bộ van 1 tay KTM + 1 xylanh nghiêng hoặc giữa chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp",
          price: "4.750.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762522/COMBO_VAN_1_TAY_1_TY_GI%E1%BB%AEA_KTM_ulsy1c.jpg",
          name: "Combo Van 1 tay + 1 xylanh nghiêng/giữa",
          desc: "Bộ van 1 tay KTM + 1 xylanh nghiêng hoặc giữa chống tụt + đủ phụ kiện dây ren giá đỡ sẵn lắp",
          price: "4.750.000đ",
          promo: false
        }
      ]
    },
    van3tay: {
      title: "🛠️ Combo Van 3 Tay",
      subtitle: "Phù hợp máy kéo 30-90hp",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749300157/Combo_van_3_tay_xylanh_gi%E1%BB%AFa_mxdsth.jpg",
          name: "Combo Van 3 tay + 1 xylanh giữa",
          desc: "Bộ van 3 tay KTM có lọc mạt + 1 xylanh giữa chống tụt, 2 đầu táo 19 phù hợp máy kéo 30-90hp",
          price: "5.550.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749300461/combo_van_3_tay_3_xylanh_nghi%C3%AAng_gi%E1%BB%AFa_%E1%BB%A7i_mgppxh.jpg",
          name: "Combo Van 3 tay + 3 xylanh",
          desc: "Bộ van 3 tay KTM có lọc mạt + 3 xylanh 1 Nghiêng 1 Giữa 1 nâng hạ rạch vạt + đủ phụ kiện bích dây ren giá đỡ chốt sẵn lắp.",
          price: "10.250.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749300324/Combo_Van_3_tay_2_xylanh_nghi%C3%AAng_gi%E1%BB%AFa_evihrt.jpg",
          name: "Combo Van 3 tay + 2 xylanh",
          desc: "Bộ van 3 tay KTM có lọc mạt + 2 xylanh 1 nghiêng 1 giữa 1 tay chờ kép ren 1/4 lõm nhật - đủ phụ kiện dây ren giá đỡ sẵn lắp",
          price: "7.800.000đ",
          promo: false
        }
      ]
    },
    van4tay: {
      title: "⚙️ Combo Van 4 Tay",
      subtitle: "Điều khiển 4 xy lanh độc lập",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1749135217/Combo_van_4_tay_1_xylanh_nghi%C3%AAng_1_xylanh_gi%E1%BB%AFa_nh6gjh.jpg",
          name: "Combo Van 4 tay + 2 xylanh",
          desc: "Combo van 4 tay 2 xylanh: 1 xylanh nghiêng + 1 xylanh giữa mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "8.300.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762675/combo_van_4_tay_1_ty_gi%E1%BB%AFa_ktm_auo6xo.jpg",
          name: "Combo van 4 tay 1 ty giữa ktm",
          desc: "Combo van 4 tay 1 xylanh giữa mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "6.050.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762677/combo_van_4_tay_1_ty_nghi%C3%AAng_ktm_eyk6fr.jpg",
          name: "Combo van 4 tay 1 ty nghiêng ktm",
          desc: "Combo van 4 tay 1 xylanh nghiêng mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "6.050.000đ",
          promo: false
        }
      ]
    },
    van5tay: {
      title: "🔧 Combo Van 5 Tay",
      subtitle: "Điều khiển 5 xy lanh chuyên nghiệp",
      products: [
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747537715/Combo_van_5_tay_2_xylanh_1_nghi%C3%AAng_1_gi%E1%BB%AFa_KTM_htd1au.jpg",
          name: "Combo Van 5 tay + 2 xylanh",
          desc: "Combo van 5 tay 2 xylanh: 1 xylanh nghiêng + 1 xylanh giữa mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "8.800.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747539250/Combo_van_5_tay_1_xylanh_nghi%C3%AAng_KTM_kv6irg.jpg",
          name: "Combo Van 5 tay + 1 xylanh",
          desc: "Combo van 5 tay + 1 xylanh nghiêng (giữa) mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "6.550.000đ",
          promo: false
        },
        {
          img: "https://res.cloudinary.com/diwxfpt92/image/upload/v1760762831/combo_van_5_tay_1_ty_gi%E1%BB%AFa_KTM_l74ame.jpg",
          name: "Combo Van 5 tay + 1 xylanh",
          desc: "Combo van 5 tay + 1 xylanh nghiêng (giữa) mới có chống tụt + đủ phụ kiện chi tiết hướng dẫn lắp đặt - Van có lọc mạt",
          price: "6.550.000đ",
          promo: false
        }
      ]
    }
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set();
    if (!expandedGroups.has(groupId)) {
      newExpanded.add(groupId);
      setTimeout(() => {
        const element = document.getElementById(`combo-${groupId}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <section className="py-5 position-relative">
      {showUrgencyPopup && !isPromoOver && (
        <div className="alert alert-warning text-center position-absolute top-0 start-50 translate-middle-x mt-2 shadow" style={{ zIndex: 1000, maxWidth: '500px' }}>
          🎯 <strong>Chỉ còn chưa đầy 24h!</strong> Mua ngay kẻo lỡ khuyến mãi hấp dẫn!
        </div>
      )}

      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold">📦 Combo Sản Phẩm Nổi Bật</h2>
          <p className="text-muted">Chọn combo phù hợp với nhu cầu của bạn</p>
        </div>

        <div className="row g-4">
          {Object.entries(productGroups).map(([groupId, group]) => (
            <div key={groupId} className="col-12" id={`combo-${groupId}`}>
              <div className="card border-0 shadow-sm">
                <div
                  className="card-header bg-primary text-white p-3 cursor-pointer"
                  onClick={() => toggleGroup(groupId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1 fw-bold">{group.title}</h5>
                      <small className="opacity-75">{group.subtitle}</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <span className="badge bg-light text-primary me-2">
                        {group.products.length} combo
                      </span>
                      <i className={`fas fa-chevron-${expandedGroups.has(groupId) ? 'up' : 'down'}`}></i>
                    </div>
                  </div>
                </div>

                {expandedGroups.has(groupId) && (
                  <div className="card-body p-0">
                    <div className="row g-0">
                      {group.products.map((product, index) => (
                        <div key={index} className="col-12 col-md-6 col-lg-4">
                          <div className="border-end border-bottom p-3 h-100">
                            <div className="text-center mb-3">
                              <img
                                src={product.img}
                                alt={product.name}
                                className="img-fluid rounded shadow-sm clickable"
                                style={{ maxHeight: '200px', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setModalImage(product.img)}
                              />
                            </div>

                            <h6 className="fw-bold text-primary mb-2">{product.name}</h6>
                            <p className="text-muted small mb-3" style={{ fontSize: '0.85rem' }}>
                              {product.desc}
                            </p>

                            <div className="text-center">
                              <div className="fw-bold text-danger fs-5 mb-3">
                                {product.price}
                              </div>

                              <a
                                href={`https://zalo.me/0966201140?message=${encodeURIComponent("Tôi muốn tư vấn về " + product.name + " – " + product.desc + " - " + product.price)}`}
                                target="_blank"
                                rel="noopener"
                                className="btn btn-primary btn-sm w-100"
                              >
                                <i className="fas fa-phone-alt me-2"></i>
                                Tư vấn ngay
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5">
          <div className="alert alert-info">
            <h6 className="fw-bold mb-2">💡 Không biết chọn combo nào?</h6>
            <p className="mb-3">Hãy cho chúng tôi biết loại máy và nhu cầu của bạn để được tư vấn phù hợp nhất!</p>
            <a
              href="https://zalo.me/0966201140"
              target="_blank"
              rel="noopener"
              className="btn btn-success btn-lg"
            >
              <i className="fas fa-comments me-2"></i>
              Tư vấn miễn phí
            </a>
          </div>
        </div>
      </div>

      {modalImage && (
        <ImageModal src={modalImage} onClose={() => setModalImage(null)} />
      )}
    </section>
  );
}

// ================== PRODUCT VAN TAY ==================
function ProductVanTay() {
  const vans = [
    { type: "Van 1 tay", price: "1.900.000 đ", color: "success", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/van1_sjzm7p.png" },
    { type: "Van 2 tay", price: "2.200.000 đ", color: "info", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/van2_hogp0r.png" },
    { type: "Van 3 tay", price: "2.700.000 đ", color: "warning", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/van3_qettd5.png" },
    { type: "Van 4 tay", price: "3.200.000 đ", color: "primary", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538311/van4_bxu8ry.png" },
    { type: "Van 5 tay", price: "3.600.000 đ", color: "secondary", icon: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/van5_pjllmw.png" },
    { type: "Van 6 tay", price: "4.100.000 đ", color: "dark", icon: "https://img.icons8.com/color/48/settings.png" }
  ];

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold">Van tay thủy lực KTM</h2>
          <p className="text-muted">Điều khiển xy lanh nâng – hạ – gập – trượt phù hợp nhiều dòng máy</p>
        </div>

        {/* DESKTOP */}
        <div className="d-none d-md-block">
          <div className="row align-items-center">
            <div className="col-lg-6 text-center mb-4 mb-lg-0">
              <img
                src="https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/8_q6acot.jpg"
                alt="Van tay thủy lực KTM"
                className="img-fluid rounded shadow mb-3"
                style={{ maxHeight: '400px' }}
              />
              <div>
                <a
                  href="https://zalo.me/0966201140"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg"
                >
                  Nhắn Zalo
                </a>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="row">
                {vans.map((v, i) => (
                  <div key={i} className="col-4 mb-4">
                    <div className="card h-100 border rounded p-3 text-center shadow-sm">
                      <img
                        src={v.icon}
                        alt={v.type}
                        style={{ width: '50%', height: '50%', margin: '0 auto' }}
                      />
                      <h5 className="mt-2">{v.type}</h5>
                      <p className="text-warning fw-bold">{v.price}</p>
                      <a
                        href="https://zalo.me/0966201140"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-primary"
                      >
                        Mua
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE */}
        <div className="d-block d-lg-none">
          <div className="row g-2 mb-4">
            {vans.map((v, i) => (
              <div className="col-4 text-center" key={i}>
                <img src={v.icon} alt={v.type} style={{ width: '50%', height: '50%' }} />
                <div className="fw-semibold small mt-1">{v.type}</div>
                <div className="fw-bold text-danger small">{v.price}</div>
                <a
                  href="https://zalo.me/0966201140"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn btn-sm btn-${v.color} mt-1`}
                >
                  Mua ngay
                </a>
              </div>
            ))}
          </div>

          <a
            href="https://zalo.me/0966201140"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-danger btn-lg fw-bold w-100"
          >
            Mua ngay
          </a>
        </div>
      </div>
    </section>
  );
}
