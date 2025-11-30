// app.js - Main Application Entry Point
// Các component được import từ folder components/

const { useState, useEffect, useRef } = React;

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
      <ProductList />
      <ProductShowcaseTabs />
      <HydraulicBladeProducts />
      <ProductVanTay />
      <SparePartsComponent />
      <InstructionVideos />
      <YoutubeShortsSection onOpen={() => setShowShortsModal(true)} />
      {showShortsModal && <YoutubeShortsModal onClose={() => setShowShortsModal(false)} />}

      {/* Widget chat AI */}
      {showAiChat && <AiChatWidget onClose={() => setShowAiChat(false)} />}

      {/* Truyền callback mở chat AI vào FloatingSocial */}
      <FloatingSocial onOpenAiChat={() => setShowAiChat(true)} />
      <FooterCompany />
    </>
  );
}

// ================== RENDER APP ==================
ReactDOM.render(<App />, document.getElementById("root"));
