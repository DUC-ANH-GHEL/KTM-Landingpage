// components/Layout.js
// Header, HeroSection, FloatingSocial, FooterCompany

function Header() {
  return (
    <header className="bg-white shadow-sm py-3 position-relative sticky-header" role="banner">
      <div className="container d-flex justify-content-between align-items-center">
        <h1 className="h4 m-0 text-primary fw-bold">Trang gạt - Xy lanh - KTM</h1>
        <a href="tel:+84966201140" className="btn btn-outline-primary d-none d-md-block">
          <i className="fas fa-phone-alt me-2" aria-hidden="true"></i>Hotline: 0966.201.140
        </a>
      </div>
      <img src="https://res.cloudinary.com/diwxfpt92/image/upload/v1749052964/products/ppe92dmlfy1eticfpdam.jpg" alt="Logo nhỏ" className="position-absolute top-50 end-0 translate-middle-y d-block d-md-none me-3" style={{ height: '32px' }} />
    </header>
  );
}

function HeroSection() {
  return (
    <section className="hero-section text-white position-relative bg-dark" style={{ backgroundImage: 'url(https://res.cloudinary.com/diwxfpt92/image/upload/v1747538306/1_hh8ucd.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', padding: '6rem 0' }} aria-label="Giới thiệu sản phẩm chính">
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
      {/* PHẦN CHÍNH - NỀN VÀNG NHẠT */}
      <footer style={{
        backgroundColor: "#ffff80",
        padding: "20px 10px",
        textAlign: "center",
        fontSize: "16px",
        lineHeight: "1.7",
        color: "#000"
      }}>
        <div>
          <h2 style={{ fontWeight: "normal", fontSize: "22px", marginBottom: "15px", color: "#444" }}>
            KỸ THUẬT, PHỤ TÙNG MÁY CƠ GIỚI
          </h2>

          <div style={{ fontWeight: "bold" }}>
            Hotline đặt mua hàng:{" "}
            <span style={{ color: "red" }}><a href="tel:0966201140">0966 201 140</a> Mr Bá Đức</span>
          </div>

          <div>
            Email:{" "}
            <a href="mailto:kythuatmayktm@gmail.com" style={{ color: "#0000ff", fontWeight: "bold" }}>
              kythuatmayktm@gmail.com
            </a>
          </div>

          <div style={{ fontWeight: "bold", margin: "10px 0" }}>
            Địa chỉ vp - Kho phát hàng
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Hà Nội:</span>{" "}
            27.12 ICID Complex Lê Trọng Tấn - Hà Đông - Hà Nội
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Thanh Hóa:</span>{" "}
            TT Quán Lào - Yên Định - Thanh Hóa
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Nghệ An:</span>{" "}
            Ngã 4 Đồng Hiếu Đường HCM - Thái Hòa - Nghệ An
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Bình Dương:</span>{" "}
            Khu phố Phú Nghị, Phường Hòa Lợi, thị xã Bến Cát, tỉnh Bình Dương
          </div>

          <div>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Cần Thơ:</span>{" "}
            Khu phố Thới An 3, Phường Thuận An, Quận Thốt Nốt, TP Cần Thơ
          </div>

          <div style={{ fontWeight: "bold", margin: "15px 0 5px" }}>
            Tư vấn Kỹ thuật Máy:
          </div>

          <div>
            <b>Kỹ thuật máy John Deere:</b> 0398 490 986
          </div>

          <div>
            <b>Kỹ thuật máy Kubota:</b> 0904 987 558
          </div>

          <div>
            <b>Kỹ thuật máy Yanmar:</b> 097 234 9545
          </div>

          <div style={{ marginTop: "20px" }}>
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Kythuatmay.vn</span>
            <br />
            <span style={{ color: "#0000ff", fontWeight: "bold" }}>Thuyluc.shop</span>
          </div>

          <div>
            Kho kỹ thuật máy và phụ tùng trên tay của bạn!
          </div>

          <div style={{ marginTop: "10px", fontWeight: "bold" }}>
            CÔNG TY TNHH KỸ THUẬT MÁY KTM
          </div>

          <div style={{ fontSize: "14px", marginBottom: "10px" }}>
            Giấy phép kinh doanh số 2802799630 do Sở KHĐT T. Thanh Hóa cấp ngày 02/10/2019
          </div>
        </div>
      </footer>

      {/* PHẦN DƯỚI - NỀN VÀNG ĐẬM */}
      <div style={{
        backgroundColor: "#ffc107",
        color: "#fff",
        padding: "10px 15px",
        fontSize: "14px",
        textAlign: "center",
        display: "flex",
        justifyContent: "space-evenly",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "5px" }}>
          <a href="https://kythuatmay.vn/chinh-sach-quy-dinh-chung" style={{ color: "#fff", textDecoration: "none" }}>Chính sách quy định chung</a>
          <a href="https://kythuatmay.vn/chinh-sach-bao-mat" style={{ color: "#fff", textDecoration: "none" }}>Chính sách bảo mật</a>
        </div>

        <div style={{ fontSize: "14px", color: "#fff", textAlign: "center" }}>
          CÔNG TY TNHH KỸ THUẬT MÁY KTM
          <br />
          Giấy phép kinh doanh số 2802799630 do Sở KHĐT T. Thanh Hóa cấp ngày 02/10/2019
        </div>

        <a href="http://online.gov.vn/Home/WebDetails/61330">
          <img
            src="https://res.cloudinary.com/diwxfpt92/image/upload/v1749379288/logoSaleNoti_whjtfz.png"
            alt="giấy phép"
            style={{ height: "50px" }}
          />
        </a>
      </div>
    </>
  );
}
