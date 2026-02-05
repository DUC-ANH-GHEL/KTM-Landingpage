            </div>
          </div>
          <div className="col-md-6">
            <select className="form-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        <div className="row">
          {filteredParts.map(part => (
            <div key={part.id} className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 shadow-sm border-0">
                {part.image && (
                  <div className="card-img-top-container" style={{ height: '200px', overflow: 'hidden' }}>
                    <img src={part.image} className="card-img-top h-100 w-100" style={{ objectFit: 'cover', cursor: 'pointer' }} alt={part.name} onClick={() => setModalImage(part.image)} />
                  </div>
                )}
                <div className="card-body d-flex flex-column">
                  <div className="mb-2"><span className="badge bg-primary">{part.category}</span></div>
                  <h5 className="card-title text-primary fw-bold">{part.name}</h5>
                  <p className="card-text text-muted small flex-grow-1">{part.description}</p>
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="h5 text-success fw-bold mb-0">{part.price}₫</span>
                    </div>
                    <div className="d-grid gap-2">
                      <a href={`https://zalo.me/0966201140?text=Tôi quan tâm đến ${part.name} - ${part.price}₫`} target="_blank" rel="noopener noreferrer" className="btn btn-success">
                        <i className="fas fa-shopping-cart me-2"></i> Đặt hàng ngay
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredParts.length === 0 && (
          <div className="text-center py-5">
            <i className="fas fa-search fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Không tìm thấy phụ tùng phù hợp</h5>
            <a href="https://zalo.me/0966201140" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <i className="fas fa-phone me-2"></i> Liên hệ tư vấn
            </a>
          </div>
        )}

        <div className="text-center mt-5">
          <div className="alert alert-info">
            <h6 className="fw-bold mb-2">💡 Cần tư vấn chọn phụ tùng phù hợp?</h6>
            <p className="mb-3">Chúng tôi có đội ngũ kỹ thuật chuyên nghiệp, sẵn sàng tư vấn miễn phí!</p>
            <a href="https://zalo.me/0966201140" target="_blank" rel="noopener noreferrer" className="btn btn-success btn-lg">
              <i className="fas fa-comments me-2"></i> Tư vấn miễn phí
            </a>
          </div>
        </div>
      </div>

      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}
    </section>
  );
}

// ================== MAIN APP COMPONENT ==================
function App() {
  const [showShortsModal, setShowShortsModal] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

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

  return (
    <>
      <Header />
      <GlobalSearchBar />
      <HeroSection />
      <HydraulicBladeProducts />
      <ProductList />
      {/* <ProductShowcaseTabs /> */}
      {/* <ProductVanTay /> */}
      {/* <SparePartsComponent /> */}
      <AlbumGallery />
      <InstructionVideos />
      {/* <YoutubeShortsSection onOpen={() => setShowShortsModal(true)} /> */}
      {showShortsModal && <YoutubeShortsModal onClose={() => setShowShortsModal(false)} />}
      {showAiChat && <AiChatWidget onClose={() => setShowAiChat(false)} />}
      <FloatingSocial onOpenAiChat={() => setShowAiChat(true)} />
      <FooterCompany />
    </>
  );
}

// ================== RENDER APP ==================
ReactDOM.render(<App />, document.getElementById("root"));
