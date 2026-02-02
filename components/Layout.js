// components/Layout.js
// Header, HeroSection, FloatingSocial, FooterCompany

function Header() {
  return (
    <header className="sticky-header ktm-header" role="banner">
      <div className="container ktm-header-inner">
        <a href="#" className="ktm-brand" aria-label="Thủy Lực KTM">
          <img
            src="https://res.cloudinary.com/diwxfpt92/image/upload/v1749299779/icon_oqhxha.png"
            alt="KTM"
            className="ktm-brand-logo"
            loading="eager"
            decoding="async"
          />
          <div className="ktm-brand-text">
            <div className="ktm-brand-title">Thủy Lực KTM</div>
            <div className="ktm-brand-sub">Trang gạt • Xy lanh • Van tay</div>
          </div>
        </a>

        <div className="d-flex align-items-center gap-2">
          <a href="tel:+84966201140" className="btn ktm-btn ktm-btn-ghost d-none d-md-inline-flex">
            <i className="fas fa-phone-alt me-2" aria-hidden="true"></i>Hotline: 0966.201.140
          </a>
          <a href="tel:+84966201140" className="btn ktm-btn ktm-btn-icon d-inline-flex d-md-none" aria-label="Gọi hotline">
            <i className="fas fa-phone-alt" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      className="hero-section ktm-hero"
      style={{ '--hero-bg': 'url(https://res.cloudinary.com/diwxfpt92/image/upload/v1747538306/1_hh8ucd.jpg)' }}
      aria-label="Giới thiệu sản phẩm chính"
    >
      <div className="container text-center ktm-hero-inner">
        <div className="ktm-hero-badge" role="note">
          <i className="fas fa-shield-alt me-2" aria-hidden="true"></i>
          Chính hãng • Bảo hành 12 tháng
        </div>
        <h2 className="ktm-hero-title">Ty xy lanh – Trang gạt KTM chính hãng</h2>
        <p className="ktm-hero-subtitle">Bền bỉ • Lắp vừa mọi máy • Giao hàng toàn quốc</p>

        <div className="d-flex justify-content-center flex-wrap gap-3 mt-4">
          <a href="https://zalo.me/0966201140" target="_blank" rel="noopener" className="btn ktm-btn ktm-btn-primary">
            <img width="20" height="20" src="https://img.icons8.com/color/48/zalo.png" alt="" className="me-2" /> Nhắn Zalo
          </a>
          <a href="tel:+84966201140" className="btn ktm-btn ktm-btn-accent">
            <i className="fas fa-phone-alt me-2" aria-hidden="true"></i> Gọi ngay
          </a>
          <a href="https://www.facebook.com/profile.php?id=61574648098644" target="_blank" rel="noopener" className="btn ktm-btn ktm-btn-ghost-on-dark">
            <i className="fab fa-facebook-messenger me-2" aria-hidden="true"></i> Facebook
          </a>
        </div>
      </div>
    </section>
  );
}

function FloatingSocial({ onOpenAiChat }) {
  return (
    <div className="floating-social" aria-label="Nút liên hệ nhanh">
      {/* Nút chat AI nằm trên cùng */}
      <button
        type="button"
        className="social-button btn-ai-chat"
        aria-label="Chat với AI về giá KTM"
        onClick={onOpenAiChat}
      >
        <i className="fas fa-robot fa-lg"></i>
      </button>

      <a
        href="https://zalo.me/0966201140"
        target="_blank"
        rel="noopener"
        className="social-button btn-zalo"
        aria-label="Liên hệ Zalo"
      >
        <img
          width="35"
          height="35"
          src="https://img.icons8.com/color/48/zalo.png"
          alt="Zalo icon"
        />
      </a>

      <a
        href="https://www.facebook.com/profile.php?id=61574648098644"
        target="_blank"
        rel="noopener"
        className="social-button btn-messenger"
        aria-label="Liên hệ Facebook"
      >
        <i className="fab fa-facebook-messenger fa-lg" aria-hidden="true"></i>
      </a>
    </div>
  );
}

function FooterCompany() {
  return (
    <>
      <footer className="ktm-footer" aria-label="Thông tin công ty">
        <div className="ktm-footer-top">
          <div className="container">
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="ktm-footer-brand">
                  <div className="ktm-footer-brand-title">KỸ THUẬT, PHỤ TÙNG MÁY CƠ GIỚI</div>
                  <div className="ktm-footer-brand-sub">Kho kỹ thuật máy và phụ tùng trên tay của bạn</div>
                </div>

                <div className="ktm-footer-contact mt-3">
                  <div className="ktm-footer-cta">
                    Hotline đặt mua hàng:
                    <a className="ktm-footer-hotline" href="tel:0966201140">0966 201 140</a>
                    <span className="ktm-footer-hotline-note">Mr Bá Đức</span>
                  </div>

                  <div className="mt-2">
                    Email:{' '}
                    <a className="ktm-footer-link" href="mailto:kythuatmayktm@gmail.com">kythuatmayktm@gmail.com</a>
                  </div>

                  <div className="mt-3 d-flex gap-3 flex-wrap">
                    <a className="ktm-footer-pill" href="https://kythuatmay.vn" target="_blank" rel="noopener">Kythuatmay.vn</a>
                    <a className="ktm-footer-pill" href="https://thuyluc.shop" target="_blank" rel="noopener">Thuyluc.shop</a>
                  </div>
                </div>
              </div>

              <div className="col-lg-5">
                <div className="ktm-footer-col-title">Địa chỉ VP – Kho phát hàng</div>
                <ul className="ktm-footer-list">
                  <li><span className="ktm-footer-label">Hà Nội:</span> 27.12 ICID Complex Lê Trọng Tấn - Hà Đông - Hà Nội</li>
                  <li><span className="ktm-footer-label">Thanh Hóa:</span> TT Quán Lào - Yên Định - Thanh Hóa</li>
                  <li><span className="ktm-footer-label">Nghệ An:</span> Ngã 4 Đồng Hiếu Đường HCM - Thái Hòa - Nghệ An</li>
                  <li><span className="ktm-footer-label">Bình Dương:</span> Khu phố Phú Nghị, Phường Hòa Lợi, thị xã Bến Cát, tỉnh Bình Dương</li>
                  <li><span className="ktm-footer-label">Cần Thơ:</span> Khu phố Thới An 3, Phường Thuận An, Quận Thốt Nốt, TP Cần Thơ</li>
                </ul>
              </div>

              <div className="col-lg-3">
                <div className="ktm-footer-col-title">Tư vấn kỹ thuật máy</div>
                <ul className="ktm-footer-list">
                  <li><span className="ktm-footer-label">John Deere:</span> 0398 490 986</li>
                  <li><span className="ktm-footer-label">Kubota:</span> 0904 987 558</li>
                  <li><span className="ktm-footer-label">Yanmar:</span> 097 234 9545</li>
                </ul>

                <div className="ktm-footer-legal mt-3">
                  <div className="fw-bold">CÔNG TY TNHH KỸ THUẬT MÁY KTM</div>
                  <div className="small">
                    Giấy phép kinh doanh số 2802799630 do Sở KHĐT T. Thanh Hóa cấp ngày 02/10/2019
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ktm-footer-bottom">
          <div className="container d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex flex-column gap-1">
              <a className="ktm-footer-bottom-link" href="https://kythuatmay.vn/chinh-sach-quy-dinh-chung" target="_blank" rel="noopener">Chính sách quy định chung</a>
              <a className="ktm-footer-bottom-link" href="https://kythuatmay.vn/chinh-sach-bao-mat" target="_blank" rel="noopener">Chính sách bảo mật</a>
            </div>

            <div className="ktm-footer-bottom-center">
              <div className="fw-semibold">CÔNG TY TNHH KỸ THUẬT MÁY KTM</div>
              <div className="small">Giấy phép kinh doanh số 2802799630 do Sở KHĐT T. Thanh Hóa cấp ngày 02/10/2019</div>
            </div>

            <a className="ktm-footer-badge" href="http://online.gov.vn/Home/WebDetails/61330" target="_blank" rel="noopener">
              <img
                src="https://res.cloudinary.com/diwxfpt92/image/upload/v1749379288/logoSaleNoti_whjtfz.png"
                alt="Thông báo Bộ Công Thương"
                loading="lazy"
                decoding="async"
              />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
