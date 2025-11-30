// components/ProductShowcase.js
// Component hiển thị chi tiết các dòng xy lanh

function ProductShowcaseTabs() {
  const { useState } = React;
  const [modalImage, setModalImage] = useState(null);

  const products = [
    {
      title: "Xy lanh giữa",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538306/2_sxq2wa.jpg",
      price: "1.950.000đ",
      aos: "fade-left"
    },
    {
      title: "Xy lanh nghiêng",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/3_nxbqyo.jpg",
      price: "1.950.000đ",
      aos: "fade-down"
    },
    {
      title: "Xy lanh ủi",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/4_rj8cv2.jpg",
      price: "2.200.000đ",
      aos: "fade-right"
    }
  ];

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-4">
          <h2 className="fw-bold">Chi tiết các dòng xy lanh</h2>
        </div>
        <div className="row">
          {products.map((prod, idx) => (
            <div className="col-4 mb-4 d-flex justify-content-center" key={idx}
              onClick={() => setModalImage(prod.image)}
              data-aos={prod.aos}
              data-aos-delay={idx * 1000}
            >
              <div className="card border-0 text-center">
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="img-fluid rounded shadow clickable"
                  style={{ maxHeight: '200px', cursor: 'pointer' }}
                />
                <div className="card-body p-2">
                  <h5 className="card-title mb-1">{prod.title}</h5>
                  <p className="card-text text-danger fw-bold">{prod.price}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {modalImage && (
          <ImageModal src={modalImage} onClose={() => setModalImage(null)} />
        )}
      </div>
    </section>
  );
}
