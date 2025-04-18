// app.js
const { useState, useEffect } = React;

function App() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.$ && $('.combo-carousel').slick) {
      $('.combo-carousel').slick({
        prevArrow: '<button type="button" class="slick-prev custom-arrow">❮</button>',
        nextArrow: '<button type="button" class="slick-next custom-arrow">❯</button>',
        dots: true,
        arrows: true,
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 4000,
        speed: 600,
        responsive: [
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 2
            }
          },
          {
            breakpoint: 576,
            settings: {
              slidesToShow: 1
            }
          }
        ]
      });
    }
  }, []);


  useEffect(() => {
    const interval = setInterval(() => {
      document.querySelectorAll('.btn-cta-animate').forEach(btn => {
        btn.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => btn.classList.remove('animate__animated', 'animate__pulse'), 1000);
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);


  return (
    <>
      <Header />
      <HeroSection />
      <ProductShowcaseTabs />
      <ProductList />
      <ProductVanTay />
      <CustomerReviews />
      <FloatingSocial />
    </>
  );
}

// function Header() {
//   return (
//     <header className="bg-white shadow-sm py-3" role="banner">
//       <div className="container d-flex justify-content-between align-items-center">
//         <h1 className="h4 m-0 text-primary fw-bold">Thiết bị thủy lực - Bá Đức</h1>
//         <a href="tel:+84966201140" className="btn btn-outline-primary d-none d-md-block">
//           <i className="fas fa-phone-alt me-2" aria-hidden="true"></i>Hotline: 0966.201.140
//         </a>
//       </div>
//     </header>
//   );
// }

function Header() {
    return (
      <header className="bg-white shadow-sm py-3 position-relative" role="banner">
        <div className="container d-flex justify-content-between align-items-center">
          <h1 className="h4 m-0 text-primary fw-bold">Thiết bị thủy lực - Bá Đức</h1>
          <a href="tel:+84966201140" className="btn btn-outline-primary d-none d-md-block">
           <i className="fas fa-phone-alt me-2" aria-hidden="true"></i>Hotline: 0966.201.140
         </a>
        </div>
        <img src="logo-small.png" alt="Logo nhỏ" className="position-absolute top-50 end-0 translate-middle-y d-block d-md-none me-3" style={{ height: '32px' }} />
      </header>
    );
  }
  

function HeroSection() {
  return (
    <section className="hero-section text-white position-relative bg-dark" style={{ backgroundImage: 'url(1.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', padding: '6rem 0' }} aria-label="Giới thiệu sản phẩm chính">
      <div className="container text-center">
        <h2 className="display-5 fw-bold mb-3">Ty xy lanh – Trang gạt KTM chính hãng</h2>
        <p className="lead mb-4">Bền bỉ – Lắp vừa mọi máy – Giao hàng toàn quốc – Bảo hành 12 tháng</p>
        <div className="d-flex justify-content-center flex-wrap gap-3">
          <a href="https://zalo.me/0966201140" target="_blank" rel="noopener" className="btn btn-success px-4 py-2 fw-semibold rounded-pill">
            <img width="20" src="https://img.icons8.com/color/48/zalo.png" alt="Zalo icon" className="me-2" /> Nhắn Zalo
          </a>
          <a href="tel:+84966201140" className="btn btn-warning px-4 py-2 fw-semibold rounded-pill">
            <i className="fas fa-phone-alt me-2"></i> Gọi ngay
          </a>
          <a href="https://www.facebook.com/profile.php?id=61574648098644" target="_blank" rel="noopener" className="btn btn-primary px-4 py-2 fw-semibold rounded-pill">
            <i className="fab fa-facebook-messenger me-2"></i> Facebook
          </a>
        </div>
      </div>
    </section>
  );
}

function FloatingSocial() {
  return (
    <div className="floating-social" aria-label="Nút liên hệ nhanh">
      <a href="https://zalo.me/0966201140" target="_blank" rel="noopener" className="social-button btn-zalo" aria-label="Liên hệ Zalo">
        <img width="35" height="35" src="https://img.icons8.com/color/48/zalo.png" alt="Zalo icon" />
      </a>
      <a href="https://www.facebook.com/profile.php?id=61574648098644" target="_blank" rel="noopener" className="social-button btn-messenger" aria-label="Liên hệ Facebook">
        <i className="fab fa-facebook-messenger fa-lg" aria-hidden="true"></i>
      </a>
    </div>
  );
}



function ProductShowcaseTabs() {
    const [activeTab, setActiveTab] = useState(0);
    const products = [
      {
        title: "Xy lanh giữa",
        image: "2.jpg",
        price: "1.950.000đ",
        icon: "https://img.icons8.com/?size=100&id=YcNwFnEjuzC1&format=png&color=000000",
        specs: ["Lực đẩy: 4200kg", "Lực kéo: 3400kg", "Chiều dài rút: 480mm", "Chiều dài kéo: 730mm", "Hành trình: 110mm", "Trọng lượng: 7kg"]
      },
      {
        title: "Xy lanh nghiêng",
        image: "3.jpg",
        price: "1.950.000đ",
        icon: "https://img.icons8.com/?size=100&id=rmNQmrTGoOyp&format=png&color=000000",
        specs: ["Lực đẩy: 4200kg", "Lực kéo: 3400kg", "Chiều dài rút: 438mm", "Chiều dài kéo: 548mm", "Hành trình: 110mm", "Trọng lượng: 7kg"]
      },
      {
        title: "Xy lanh ủi",
        image: "4.jpg",
        price: "2.200.000đ",
        icon: "https://img.icons8.com/?size=100&id=33908&format=png&color=000000",
        specs: ["Ty: Ø32mm", "Vỏ: Ø60mm", "Van chống tụt: Có", "Chiều dài rút: 730mm", "Chiều dài kéo: 1240mm", "Hành trình: 600mm"]
      }
    ];
  
    return (
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="fw-bold">Chi tiết các dòng xy lanh</h2>
            <div className="d-flex justify-content-center gap-2 flex-nowrap overflow-auto mt-3" style={{ whiteSpace: 'nowrap' }}>
              {products.map((prod, idx) => (
                <button
                  key={idx}
                  className={`btn text-wrap ${activeTab === idx ? "btn-primary text-white fw-bold" : "btn-outline-primary"}`}
                  onClick={() => setActiveTab(idx)}
                  style={{ maxWidth: '200px' }}
                >
                    <img src={prod.icon} alt="icon" className="me-2" style={{ width: '20px', height: '20px' }} />
                
                  {prod.title}
                </button>
              ))}
            </div>
          </div>
          <div className="text-center">
            <img src={products[activeTab].image} alt={products[activeTab].title} className="img-fluid rounded shadow" style={{ maxHeight: '360px' }} />
            <p className="mt-3 fw-bold text-danger fs-5">Giá: {products[activeTab].price}</p>
          </div>
          <ul className="list-group list-group-flush col-md-6 mx-auto mt-4">
            {products[activeTab].specs.map((spec, i) => (
              <li className="list-group-item d-flex justify-content-between" key={i}>
                <span>{spec.split(":")[0]}</span>
                <span className="fw-semibold">{spec.split(":")[1]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  

  
function ProductList() {
    const [timeLeft, setTimeLeft] = useState("");
    const [isPromoOver, setIsPromoOver] = useState(false);
    const [showUrgencyPopup, setShowUrgencyPopup] = useState(false);
  
    const deadline = new Date("2025-04-12T18:20:00");
    deadline.setDate(deadline.getDate() + 10);
  
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
  
        if (distance <= 86400000) { // 24 giờ
          setShowUrgencyPopup(true);
        }
      }, 1000);
  
      return () => clearInterval(interval);
    }, []);
  
    const products = [
      { img: "51.jpg", name: "Combo 1", desc: "Bộ van 3 tay KTM có lọc mạt + 1 xylanh giữa chống tụt, 2 đầu táo 19 phù hợp máy kéo 30-90hp", salePrice: "5.550.000đ", originalPrice: "6.380.000đ", promo: true },
      { img: "61.jpg", name: "Combo 2", desc: "Bộ van 3 tay KTM có lọc mạt + 3 xylanh 1 Nghiêng 1 Giữa 1 nâng hạ rạch vạt + đủ phụ kiện bích dây ren giá đỡ chốt sẵn lắp.", salePrice: "10.250.000đ", originalPrice: "10.580.000đ", promo: true },
      { img: "71.jpg", name: "Combo 3", desc: "Bộ van 3 tay KTM có lọc mạt + 2 xylanh 1 nghiêng 1 giữa 1 tay chờ kép ren 1/4 lõm nhật - đủ phụ kiện dây ren giá đỡ sẵn lắp", salePrice: "7.800.000đ", originalPrice: "8.580.000đ", promo: true },
    ];
  
    return (
      <section className="py-5 position-relative">
        {showUrgencyPopup && !isPromoOver && (
          <div className="alert alert-warning text-center position-absolute top-0 start-50 translate-middle-x mt-2 shadow" style={{ zIndex: 1000, maxWidth: '500px' }}>
            🎯 <strong>Chỉ còn chưa đầy 24h!</strong> Mua ngay kẻo lỡ khuyến mãi hấp dẫn!
          </div>
        )}
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="fw-bold">Combo sản phẩm nổi bật</h2>
          </div>
          <div className="combo-carousel">
            {products.map((item, i) => (
              <div key={i}>
                <div className="card h-100 shadow-sm mx-2 position-relative">
                  {item.promo && !isPromoOver && (
                    <span className="badge bg-danger position-absolute top-0 end-0 m-2"><span className='fire-icon'>🔥</span> Khuyến mãi</span>
                  )}
                  <div className="overflow-hidden">
                    <img
                      src={item.img}
                      className="card-img-top zoom-on-hover"
                      alt={item.name}
                    />
                  </div>
                  <div className="card-body text-center">
                    <h5 className="card-title fw-bold">{item.name}</h5>
                    <p className="text-muted small">{item.desc}</p>
                    {item.promo && !isPromoOver ? (
                      <>
                        <p className="mb-2">
                          <span className="text-muted text-decoration-line-through me-2">{item.originalPrice}</span>
                          <span className="fw-bold text-danger fs-5">{item.salePrice}</span>
                        </p>
                        <p className="text-warning small mb-2">{timeLeft}</p>
                      </>
                    ) : (
                      <p className="fw-bold text-primary fs-5">{item.originalPrice}</p>
                    )}
                    {/* <a
                      href="https://zalo.me/0966201140"
                      target="_blank"
                      rel="noopener"
                      className="btn btn-cta-animate btn-outline-primary btn-sm mt-2"
                    >
                      Tư vấn combo này
                    </a> */}
                    <a
                    href={`https://zalo.me/0966201140?message=${encodeURIComponent("Tôi muốn tư vấn về " + item.name + " – " + item.desc)}`}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-outline-primary btn-sm mt-2 btn-cta-animate"
                    >
                    Tư vấn combo này
                    </a>

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  
function ProductVanTay() {
//   const vans = [
//     { type: "Van 1 tay", price: "1.900.000đ" },
//     { type: "Van 2 tay", price: "2.200.000đ" },
//     { type: "Van 3 tay", price: "2.700.000đ" },
//     { type: "Van 5 tay", price: "3.600.000đ" },
//     { type: "Van 6 tay", price: "4.100.000đ" },
//   ];
  const vans = [
    { type: "Van 1 tay", price: "1.900.000đ", icon: "https://img.icons8.com/?size=100&id=95YLm9Nru9Fa&format=png&color=000000" },
    { type: "Van 2 tay", price: "2.200.000đ", icon: "https://img.icons8.com/color/48/engineering.png" },
    { type: "Van 3 tay", price: "2.700.000đ", icon: "https://img.icons8.com/?size=100&id=43434&format=png&color=000000" },
    { type: "Van 4 tay", price: "3.200.000đ", icon: "https://img.icons8.com/?size=100&id=UFaE0x2zko7J&format=png&color=000000" },
    { type: "Van 5 tay", price: "3.600.000đ", icon: "https://img.icons8.com/?size=100&id=9svq1P7VUS14&format=png&color=000000" },
    { type: "Van 6 tay", price: "4.100.000đ", icon: "https://img.icons8.com/color/48/settings.png" }
  ];
  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-4">
          <h2 className="fw-bold">Van tay thủy lực KTM</h2>
          <p className="text-muted">Điều khiển xy lanh nâng – hạ – gập – trượt phù hợp nhiều dòng máy</p>
        </div>
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <img src="8.jpg" alt="Van tay thủy lực" className="card-img-top" />
              <div className="card-body">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Loại van</th>
                      <th className="text-end">Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vans.map((v, i) => (
                      <tr key={i}>
                        {/* <td>{v.type}</td> */}
                        <td><img src={v.icon} alt="icon" className="me-2" style={{ width: '20px', height: '20px' }} /> {v.type}</td>
                        <td className="text-end fw-semibold">{v.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <a href="https://zalo.me/0966201140" target="_blank" className="btn btn-primary w-100">Nhắn Zalo tư vấn</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomerReviews() {
    const reviews = [
        {
            name: "Nguyễn Văn Hùng",
            role: "Kỹ sư cơ khí",
            avatar: "https://randomuser.me/api/portraits/men/32.jpg",
            rating: 5,
            comment: "Sản phẩm chất lượng cao, lắp vừa máy, không rò rỉ dầu. Đã mua và sử dụng trong 6 tháng, rất hài lòng."
        },
        {
            name: "Trần Thị Mai",
            role: "Chủ xưởng cơ khí",
            avatar: "https://randomuser.me/api/portraits/women/45.jpg",
            rating: 5,
            comment: "Ty xy lanh KTM có độ bền cao, chịu áp lực tốt. Đội ngũ tư vấn nhiệt tình, giao hàng nhanh."
        },
        {
            name: "Phạm Văn Lợi",
            role: "Kỹ thuật viên",
            avatar: "https://randomuser.me/api/portraits/men/32.jpg",
            rating: 4,
            comment: "Sản phẩm tốt, giá cả hợp lý. Đã thay thế cho máy xúc đào và hoạt động ổn định trong điều kiện khắc nghiệt."
        }
    ];
    
    return (
        <section className="py-5 bg-light">
            <div className="container">
                <div className="text-center mb-5 fade-up">
                    <h2 className="fw-bold">Khách hàng đánh giá</h2>
                    <p className="text-muted">Những ý kiến từ khách hàng đã sử dụng sản phẩm</p>
                </div>
                
                <div className="row g-4">
                    {reviews.map((review, index) => (
                        <div key={index} className="col-md-4 fade-up" style={{transitionDelay: `${0.1 * index}s`}}>
                            <div className="customer-review card p-4 h-100">
                                <div className="d-flex align-items-center mb-3">
                                    <img src={review.avatar} alt={review.name} className="avatar me-3" />
                                    <div>
                                        <h5 className="mb-0">{review.name}</h5>
                                        <p className="text-muted small mb-0">{review.role}</p>
                                    </div>
                                </div>
                                <div className="mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <i 
                                            key={i} 
                                            className={`fas fa-star ${i < review.rating ? 'text-warning' : 'text-muted'}`}
                                        ></i>
                                    ))}
                                </div>
                                <p className="mb-0">{review.comment}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}


ReactDOM.render(<App />, document.getElementById("root"));
