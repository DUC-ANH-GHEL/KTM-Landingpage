    // ==================== SEARCH CENTER - TRA CỨU NHANH ====================
    
    function SearchCenter({ showToast, onNavigate }) {
      const [searchQuery, setSearchQuery] = useState('');
      const [searchResults, setSearchResults] = useState([]);
      const [allData, setAllData] = useState([]);
      const [categories, setCategories] = useState([]);
      const [selectedCategory, setSelectedCategory] = useState('all');
      const [copiedId, setCopiedId] = useState(null);
      const [viewMode, setViewMode] = useState('list'); // list | grid
      const [loading, setLoading] = useState(true);
      const [albums, setAlbums] = useState([]);
      const [videoFolders, setVideoFolders] = useState([]);
      const searchInputRef = useRef(null);
      
      // AI Search states
      const [aiSearchEnabled, setAiSearchEnabled] = useState(true);
      const [aiSearching, setAiSearching] = useState(false);
      const aiSearchTimeoutRef = useRef(null);
      
      // A: Debounce + AbortController for fetch
      const debounceTimeoutRef = useRef(null);
      const abortControllerRef = useRef(null);
      
      // B: Command Palette + History + Saved Searches
      const [showPalette, setShowPalette] = useState(false);
      const [searchHistory, setSearchHistory] = useState([]);
      const [savedSearches, setSavedSearches] = useState([]);
      const [paletteQuery, setPaletteQuery] = useState('');
      const paletteInputRef = useRef(null);
      
      // C: LRU Cache + Prefetch
      const searchCacheRef = useRef(new Map()); // { query -> results }
      const [virtualizationMode, setVirtualizationMode] = useState('auto'); // auto | off
      const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
      
      // AI Chat states
      const [showAIChat, setShowAIChat] = useState(false);
      const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', content: 'Xin chào! Hãy hỏi tôi về sản phẩm, giá cả... Ví dụ:\n• "Giá van 2 tay?"\n• "Combo rẻ nhất?"\n• "Freeship?"', attachments: [] }
      ]);
      const [aiInput, setAiInput] = useState('');
      const [aiLoading, setAiLoading] = useState(false);
      const chatEndRef = useRef(null);
      const aiInputRef = useRef(null);
      
      // ===== A: HELPERS FOR NORMALIZATION + PHONE PARSING + HIGHLIGHTING =====
      
      // Remove Vietnamese tones + diacritics; normalize phone
      const normalizeForSearch = (text) => {
        if (!text) return '';
        return String(text)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
          .trim();
      };
      
      // Parse phone number: remove spaces, dashes, +84 -> 0
      const normalizePhone = (phone) => {
        if (!phone) return '';
        return String(phone)
          .replace(/\s+/g, '')
          .replace(/[-()]/g, '')
          .replace(/^\+84/, '0')
          .trim();
      };
      
      // Highlight matched text in display (wrap in <mark> tag)
      const highlightMatch = (text, query) => {
        if (!text || !query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark style="background:#ffeb3b">$1</mark>');
      };
      
      // Load search history + saved searches from localStorage
      useEffect(() => {
        try {
          const hist = JSON.parse(localStorage.getItem('ktm_search_history') || '[]');
          const saved = JSON.parse(localStorage.getItem('ktm_saved_searches') || '[]');
          setSearchHistory(Array.isArray(hist) ? hist.slice(0, 10) : []);
          setSavedSearches(Array.isArray(saved) ? saved : []);
        } catch {
          // ignore parse errors
        }
      }, []);
      
      // Save search to history
      const addToHistory = (query) => {
        if (!query.trim()) return;
        const updated = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
        setSearchHistory(updated);
        try {
          localStorage.setItem('ktm_search_history', JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
      };
      
      // Save/unsave a search
      const toggleSavedSearch = (query) => {
        if (!query.trim()) return;
        const updated = savedSearches.includes(query)
          ? savedSearches.filter(q => q !== query)
          : [query, ...savedSearches].slice(0, 5);
        setSavedSearches(updated);
        try {
          localStorage.setItem('ktm_saved_searches', JSON.stringify(updated));
        } catch {
          // ignore
        }
      };

      // ===== SMART SUGGESTIONS: POPULAR QUERIES + POPULAR PRODUCTS =====
      const QUERY_STATS_KEY = 'ktm_search_query_stats_v1';
      const PRODUCT_STATS_KEY = 'ktm_search_product_stats_v1';

      const safeReadJSON = (key, fallback) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return fallback;
          const parsed = JSON.parse(raw);
          return parsed ?? fallback;
        } catch {
          return fallback;
        }
      };

      const safeWriteJSON = (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // ignore storage errors
        }
      };

      const [queryStats, setQueryStats] = useState(() => safeReadJSON(QUERY_STATS_KEY, {}));
      const [productStats, setProductStats] = useState(() => safeReadJSON(PRODUCT_STATS_KEY, {}));

      const suppressFilterOnNextFocusRef = useRef(false);
      const topProductTrackedAtByQueryRef = useRef(new Map());

      useEffect(() => {
        const onStorage = (e) => {
          if (!e) return;
          if (e.key === QUERY_STATS_KEY) setQueryStats(safeReadJSON(QUERY_STATS_KEY, {}));
          if (e.key === PRODUCT_STATS_KEY) setProductStats(safeReadJSON(PRODUCT_STATS_KEY, {}));
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
      }, []);

      const trackQueryUsage = (rawQuery) => {
        const q = String(rawQuery || '').trim();
        if (!q) return;

        const qn = normalizeText(q).trim();
        if (qn.length < 3) return;
        if (qn === 'sdt:' || qn === '#' || qn.endsWith(':')) return;

        const now = Date.now();
        const base = safeReadJSON(QUERY_STATS_KEY, queryStats && typeof queryStats === 'object' ? queryStats : {});
        const next = { ...(base && typeof base === 'object' ? base : {}) };
        const cur = next[qn] && typeof next[qn] === 'object' ? next[qn] : {};
        next[qn] = { q, count: (Number(cur.count) || 0) + 1, lastAt: now };
        setQueryStats(next);
        safeWriteJSON(QUERY_STATS_KEY, next);
      };

      const trackProductUsage = (item, action) => {
        if (!item || item._type !== 'product') return;
        const id = String(item.id || '').trim();
        if (!id) return;

        const now = Date.now();
        const base = safeReadJSON(PRODUCT_STATS_KEY, productStats && typeof productStats === 'object' ? productStats : {});
        const next = { ...(base && typeof base === 'object' ? base : {}) };
        const cur = next[id] && typeof next[id] === 'object' ? next[id] : {};
        next[id] = {
          id,
          name: String(item.name || cur.name || '').trim(),
          code: String(item.code || cur.code || '').trim(),
          count: (Number(cur.count) || 0) + 1,
          lastAt: now,
          action: String(action || cur.action || '').trim(),
        };
        setProductStats(next);
        safeWriteJSON(PRODUCT_STATS_KEY, next);
      };

      const maybeTrackTopProductForQuery = (rawQuery, sortedItems) => {
        const q = String(rawQuery || '').trim();
        if (!q) return;

        const qn = normalizeText(q).trim();
        if (qn.length < 3) return;
        if (qn === 'sdt:' || qn === '#' || qn.endsWith(':')) return;

        const now = Date.now();
        const lastAt = Number(topProductTrackedAtByQueryRef.current.get(qn) || 0);
        if (now - lastAt < 30_000) return; // throttle per query (30s)

        const arr = Array.isArray(sortedItems) ? sortedItems : [];
        const top = arr.find((it) => it && it._type === 'product');
        if (!top) return;

        topProductTrackedAtByQueryRef.current.set(qn, now);
        trackProductUsage(top, 'search');
      };

      const popularQueryChips = useMemo(() => {
        const stats = queryStats && typeof queryStats === 'object' ? queryStats : {};
        const rows = Object.values(stats)
          .map((r) => ({ q: String(r?.q || '').trim(), count: Number(r?.count) || 0, lastAt: Number(r?.lastAt) || 0 }))
          .filter((r) => r.q && r.count > 0)
          .sort((a, b) => (b.count - a.count) || (b.lastAt - a.lastAt))
          .slice(0, 6);
        return rows;
      }, [queryStats]);

      const popularProductChips = useMemo(() => {
        const stats = productStats && typeof productStats === 'object' ? productStats : {};
        const rows = Object.values(stats)
          .map((r) => ({ id: String(r?.id || '').trim(), name: String(r?.name || '').trim(), code: String(r?.code || '').trim(), count: Number(r?.count) || 0, lastAt: Number(r?.lastAt) || 0 }))
          .filter((r) => r.id && r.count > 0)
          .sort((a, b) => (b.count - a.count) || (b.lastAt - a.lastAt))
          .slice(0, 8)
          .map((r) => {
            const live = allData.find((it) => it && it._type === 'product' && String(it.id) === r.id);
            return live ? { ...r, item: live } : { ...r, item: null };
          });
        return rows;
      }, [productStats, allData]);

      const applySuggestion = (nextQuery, opts = {}) => {
        const q = String(nextQuery || '');
        handleSearch(q);
        if (opts.addToHistory !== false) {
          addToHistory(q);
        }
        setShowPalette(false);
        setShowFilter(false);
        setFabOpen(false);

        const focus = opts.focus !== false;
        if (focus) {
          suppressFilterOnNextFocusRef.current = true;
          setTimeout(() => {
            const el = searchInputRef.current;
            el?.focus?.();
            try {
              if (opts.caret === 'end' && el && typeof el.setSelectionRange === 'function') {
                const len = String(el.value || '').length;
                el.setSelectionRange(len, len);
              }
            } catch {
              // ignore
            }
          }, 0);
        } else {
          suppressFilterOnNextFocusRef.current = false;
          setTimeout(() => {
            try {
              searchInputRef.current?.blur?.();
              document.activeElement?.blur?.();
            } catch {
              // ignore
            }
          }, 0);
        }
      };
      
      // Modal state for image preview
      const [previewImage, setPreviewImage] = useState(null);
      
      // Quick Edit/Delete states
      const [showQuickEdit, setShowQuickEdit] = useState(false);
      const [editingItem, setEditingItem] = useState(null);
      const [fabOpen, setFabOpen] = useState(false);
      
      // Product Modal states
      const [showProductModal, setShowProductModal] = useState(false);
      const [editingProduct, setEditingProduct] = useState(null);
      
      // Product edit form
      const [productForm, setProductForm] = useState({
        name: '', code: '', price: '', image: '', category: '', note: '', commission_percent: ''
      });
      const productCategories = ['Ty xy lanh', 'Combo Van 1 tay', 'Combo Van 2 tay', 'Combo Van 3 tay', 'Combo Van 4 tay', 'Combo Van 5 tay', 'Trang gạt', 'Phụ kiện', 'Van điều khiển'];
      
      // Quick Edit Product
      const handleQuickEdit = (item) => {
        if (item._type === 'product') {
          setEditingItem(item);
          setProductForm({
            name: item.name || '',
            code: item.code || '',
            price: item.price || '',
            image: item.image || '',
            category: item.category || '',
            note: item.note || '',
            commission_percent: (item.commission_percent ?? item.commissionPercent ?? '')
          });
          setShowQuickEdit(true);
        }
      };
      
      // Save Quick Edit
      const handleSaveQuickEdit = async () => {
        if (!editingItem) return;
        
        try {
          await window.KTM.api.putJSON(
            `${API_BASE}/api/products?id=${editingItem.id}`,
            productForm,
            'Lỗi cập nhật'
          );
          
          showToast('Cập nhật thành công!', 'success');
          setShowQuickEdit(false);
          setEditingItem(null);
          
          // Reload data
          loadAllData();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };
      
      // Quick Delete
      const handleQuickDelete = async (item) => {
        const typeName = item._type === 'product' ? 'sản phẩm' : item._type === 'album' ? 'ảnh' : 'video';
        if (!confirm(`Xóa ${typeName} "${item.name}"?`)) return;
        
        try {
          let url = '';
          if (item._type === 'product') {
            url = `${API_BASE}/api/products?id=${item.id}`;
          } else if (item._type === 'album') {
            url = `${API_BASE}/api/images/${item.id}`;
          } else if (item._type === 'video') {
            url = `${API_BASE}/api/videos/${item.id}`;
          }

          await window.KTM.api.deleteJSON(url, 'Lỗi xóa');
          
          showToast(`Đã xóa ${typeName}`, 'success');
          loadAllData();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };
      
      // Handle save product from FAB modal
      const handleSaveProduct = async (formData) => {
        try {
          const url = editingProduct 
            ? `${API_BASE}/api/products?id=${editingProduct.id}`
            : `${API_BASE}/api/products`;

          if (editingProduct) {
            await window.KTM.api.putJSON(url, formData, 'Lỗi lưu sản phẩm');
          } else {
            await window.KTM.api.postJSON(url, formData, 'Lỗi lưu sản phẩm');
          }

          showToast(editingProduct ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!', 'success');
          setShowProductModal(false);
          setEditingProduct(null);
          loadAllData(); // Refresh search results
        } catch (err) {
          showToast(err.message, 'danger');
        }
      };
      
      // Load data function (song song hóa fetch)

      // Hàm cache helper
      const CACHE_KEY = 'ktm_admin_data_cache_v1';
      const CACHE_TTL = 1000 * 60 * 10; // 10 phút

      const loadAllData = async () => {
        // 1. Thử lấy cache

        let cache = null;
        let usedCache = false;
        const cacheResult = window.KTM.cache.read(CACHE_KEY, { ttlMs: CACHE_TTL, validate: Array.isArray });
        if (cacheResult.hit) {
          cache = cacheResult.value;
          console.log('[CACHE] Using cache, items:', cache.length);
          setAllData(cache);
          setSearchResults(cache);
          setLoading(false); // Dừng loading ngay khi có cache
          usedCache = true;
        } else {
          if (cacheResult.status === 'miss') console.log('[CACHE] No cache found');
          else if (cacheResult.status === 'expired' || cacheResult.status === 'invalid') console.log('[CACHE] Cache expired or invalid');
          else if (cacheResult.status === 'error') console.error('[CACHE] Error parsing cache');
        }

        // Nếu có cache thì không loading, chỉ loading khi fetch mới
        if (!usedCache) setLoading(true);

        // Luôn fetch API để cập nhật cache, nhưng không block UI
        try {
          const safeGetJSON = async (url, fallback) => {
            try {
              const data = await window.KTM.api.getJSON(url, 'Lỗi tải dữ liệu');
              return data ?? fallback;
            } catch (_err) {
              return fallback;
            }
          };

          // Song song hóa 3 API
          const [productsData, albumsList, videosList] = await Promise.all([
            safeGetJSON(`${API_BASE}/api/products?fields=search`, []),
            safeGetJSON(`${API_BASE}/api/albums`, []),
            safeGetJSON(`${API_BASE}/api/video-folders?withVideos=true`, [])
          ]);

          // Products
          const products = Array.isArray(productsData)
            ? productsData.map(p => ({ ...p, _type: 'product', _source: 'database' }))
            : [];

          // Albums & images (song song fetch images từng album)
          setAlbums(albumsList);
          let albumImagesData = [];
          if (Array.isArray(albumsList) && albumsList.length > 0) {
            const albumImageJsonArr = await Promise.all(
              albumsList.map(album => safeGetJSON(`${API_BASE}/api/albums/${album.id}`, {}))
            );
            albumImageJsonArr.forEach((albumDetail, idx) => {
              const album = albumsList[idx];
              if (albumDetail.images && albumDetail.images.length > 0) {
                albumDetail.images.forEach(img => {
                  albumImagesData.push({
                    id: img.id,
                    name: img.caption || 'Ảnh từ ' + album.title,
                    image: img.src,
                    folder: album.title,
                    _type: 'album',
                    _source: 'database'
                  });
                });
              }
            });
          }

          // Videos
          setVideoFolders(videosList);
          let videosData = [];
          if (Array.isArray(videosList)) {
            videosList.forEach(folder => {
              if (folder.videos) {
                folder.videos.forEach(v => {
                  videosData.push({
                    id: v.id,
                    name: v.title,
                    folder: folder.name,
                    image: v.thumb,
                    youtubeId: v.youtubeId,
                    url: v.url,
                    _type: 'video',
                    _source: 'database'
                  });
                });
              }
            });
          }

          const combined = [...products, ...albumImagesData, ...videosData];
          // So sánh với cache, nếu khác thì update UI và cache
          const isDifferent = !cache || JSON.stringify(combined) !== JSON.stringify(cache);
          if (isDifferent) {
            setAllData(combined);
            setSearchResults(combined);
            window.KTM.cache.write(CACHE_KEY, combined);