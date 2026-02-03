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
          }
        } catch (err) {
          console.error('Song song fetch error:', err);
        }
        setLoading(false);
      };

      // Load data từ nhiều nguồn
      useEffect(() => {
        loadAllData();
        
        // Focus search input
        setTimeout(() => searchInputRef.current?.focus(), 100);
        
        // B: Global keyboard shortcuts (/, Ctrl+K, Esc)
        const handleGlobalKeyDown = (e) => {
          // Ctrl/Cmd + K to open palette
          if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            setShowPalette(true);
            setTimeout(() => paletteInputRef.current?.focus(), 0);
          }
          // / to focus search
          if (e.key === '/' && !showPalette && document.activeElement?.tagName !== 'INPUT') {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          // Esc to close palette
          if (e.key === 'Escape' && showPalette) {
            setShowPalette(false);
          }
        };
        
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
      }, [showPalette]);

      const normalizeText = (value) => {
        try {
          return String(value ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd');
        } catch {
          return String(value ?? '').toLowerCase();
        }
      };

      const parseSearchIntent = (query) => {
        const qn = normalizeText(query).trim();
        const tokens = qn
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => {
            const s = String(t || '').trim();
            if (!s) return '';
            if (s.startsWith('#')) return s.slice(1);
            if (s.startsWith('sdt:')) return s.slice(4);
            if (s.startsWith('phone:')) return s.slice(6);
            return s;
          })
          .filter(Boolean);

        const includeAlbum = tokens.includes('anh');
        const includeVideo = tokens.includes('video');

        const contentTokens = tokens.filter(t => t !== 'anh' && t !== 'video');
        const cleanedQuery = contentTokens.join(' ');

        const allowedTypes = new Set(['product']);
        if (includeAlbum) allowedTypes.add('album');
        if (includeVideo) allowedTypes.add('video');

        return { allowedTypes, includeAlbum, includeVideo, contentTokens, cleanedQuery };
      };

      const scoreItemMatch = (item, contentTokens, cleanedQuery) => {
        const tokens = Array.isArray(contentTokens) ? contentTokens : [];
        const phrase = normalizeText(cleanedQuery).trim();
        if (!tokens.length && !phrase) return 0;

        const name = normalizeText(item?.name ?? '');
        const code = normalizeText(item?.code ?? '');
        const category = normalizeText(item?.category ?? '');
        const note = normalizeText(item?.note ?? '');
        const folder = normalizeText(item?.folder ?? '');

        const haystackAll = `${name} ${code} ${category} ${note} ${folder}`.trim();
        if (!haystackAll) return 0;

        const nameCompact = name.replace(/\s+/g, '');
        const phraseCompact = phrase.replace(/\s+/g, '');

        let score = 0;

        // Phrase-level boosts (best match first)
        if (phrase) {
          if (name === phrase) score += 220;
          if (name.includes(phrase)) score += 140;
          if (name.startsWith(phrase)) score += 160;
          if (phraseCompact) {
            if (nameCompact === phraseCompact) score += 280;
            else if (nameCompact.startsWith(phraseCompact)) score += 180;
            else if (nameCompact.includes(phraseCompact)) score += 110;
          }
          if (code && code === phrase) score += 180;
          if (code && code.includes(phrase)) score += 90;
        }

        // Token-level boosts
        for (const t of tokens) {
          if (!t) continue;
          const reWordStart = new RegExp(`(?:^|\\s)${t.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`);
          const tCompact = String(t).replace(/\s+/g, '');

          if (name.includes(t)) score += 35;
          if (reWordStart.test(name)) score += 25;

          if (tCompact) {
            if (nameCompact === tCompact) score += 90;
            else if (nameCompact.startsWith(tCompact)) score += 50;
            else if (nameCompact.includes(tCompact)) score += 28;
          }

          if (code && code.includes(t)) score += 20;
          if (code && reWordStart.test(code)) score += 10;

          if (category && category.includes(t)) score += 12;
          if (folder && folder.includes(t)) score += 12;

          if (note && note.includes(t)) score += 6;
        }

        // Slight preference for shorter names when tied
        if (score > 0 && name) score += Math.max(0, 10 - Math.min(10, Math.floor(name.length / 10)));

        return score;
      };

      const sortByRelevance = (items, contentTokens, cleanedQuery) => {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return [];

        const scored = arr
          .map((it, idx) => ({
            it,
            idx,
            score: scoreItemMatch(it, contentTokens, cleanedQuery),
          }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // stable fallback
            return a.idx - b.idx;
          })
          .map(x => x.it);

        return scored;
      };

      // AI-powered search function
      const performAISearch = async (query, basicResults) => {
        if (!aiSearchEnabled || basicResults.length === 0) return;
        
        setAiSearching(true);
        try {
          // Prepare product list for AI
          const productList = basicResults.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            note: item.note,
            folder: item.folder,
            _type: item._type
          }));

          const data = await window.KTM.api.postJSON(
            `${API_BASE}/api/ai-search`,
            { query: query, products: productList },
            'AI Search error'
          );

          if (data && data.matchedIds && data.matchedIds.length > 0) {
            // Filter results to only include AI-matched items
            const { contentTokens, cleanedQuery } = parseSearchIntent(query);
            const matchedSet = new Set(data.matchedIds);
            const aiFiltered = basicResults
              .filter(item => matchedSet.has(item.id))
              .sort((a, b) => scoreItemMatch(b, contentTokens, cleanedQuery) - scoreItemMatch(a, contentTokens, cleanedQuery));
            if (aiFiltered.length > 0) {
              setSearchResults(aiFiltered);
            }
          } else if (data && data.matchedIds && data.matchedIds.length === 0) {
            // AI found no matches - show empty
            setSearchResults([]);
          }
        } catch (err) {
          console.error('AI Search error:', err);
          // Keep basic results on error
        }
        setAiSearching(false);
      };

      // Search function - flexible matching with AI enhancement + DEBOUNCE + ABORT + CACHE
      const handleSearch = (query) => {
        setSearchQuery(query);
        setPaletteQuery(query); // Sync palette input
        
        // Clear previous debounce
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        if (aiSearchTimeoutRef.current) {
          clearTimeout(aiSearchTimeoutRef.current);
        }
        // Abort previous fetch if any
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        if (!query.trim()) {
          filterByCategory(selectedCategory);
          return;
        }

        // Check cache first (C: LRU Cache)
        // Canonicalize query to avoid inconsistent cache hits for e.g. "xylanh" vs "xy lanh"
        const cacheQueryKey = normalizeText(query).trim().replace(/\s+/g, '');
        const cacheKey = `v2|${cacheQueryKey}|${selectedCategory}`;
        if (searchCacheRef.current.has(cacheKey)) {
          setSearchResults(searchCacheRef.current.get(cacheKey));
          return;
        }

        const { allowedTypes, contentTokens, cleanedQuery } = parseSearchIntent(query);

        // Debounce (A: Debounce for snappier UX)
        debounceTimeoutRef.current = setTimeout(() => {
          const results = allData.filter(item => {
            if (!allowedTypes.has(item?._type)) return false;

            if (contentTokens.length === 0) return true;

            // Enhanced search: normalize + phone parsing
            const searchableTextRaw = normalizeForSearch(
              Object.entries(item)
                .filter(([key]) => !key.startsWith('_'))
                .map(([, value]) => String(value || ''))
                .join(' ')
            );

            const normalizedPhone = item.phone ? normalizePhone(item.phone) : '';
            const searchableText = `${searchableTextRaw} ${normalizedPhone}`.trim();
            const searchableCompact = searchableText.replace(/\s+/g, '');

            return contentTokens.every((word) => {
              const w = String(word || '').trim();
              if (!w) return true;
              return searchableText.includes(w) || searchableCompact.includes(w.replace(/\s+/g, ''));
            });
          });

          let finalResults = results;
          if (selectedCategory !== 'all') {
            finalResults = results.filter(item => 
              item?._type === selectedCategory
            );
          }
          
          const sorted = sortByRelevance(finalResults, contentTokens, cleanedQuery);

          trackQueryUsage(query);
          maybeTrackTopProductForQuery(query, sorted);
          
          // Cache result (C: LRU)
          if (searchCacheRef.current.size > 20) {
            const firstKey = searchCacheRef.current.keys().next().value;
            searchCacheRef.current.delete(firstKey);
          }
          searchCacheRef.current.set(cacheKey, sorted);
          
          setSearchResults(sorted);

          // Trigger AI search after debounce (B: Palette + enhanced search)
          if (aiSearchEnabled && cleanedQuery.length >= 3) {
            aiSearchTimeoutRef.current = setTimeout(() => {
              performAISearch(cleanedQuery, finalResults);
            }, 500);
          }
        }, 200); // 200ms debounce
      };

      // Filter by category
      const filterByCategory = (cat) => {
        setSelectedCategory(cat);
        
        const { allowedTypes, contentTokens } = parseSearchIntent(searchQuery);
        const { cleanedQuery } = parseSearchIntent(searchQuery);

        let filtered = allData.filter(item => allowedTypes.has(item?._type));
        if (cat !== 'all') {
          filtered = filtered.filter(item => 
            item?._type === cat
          );
        }

        if (searchQuery.trim()) {
          if (contentTokens.length > 0) {
            filtered = filtered.filter(item => {
              const searchableRaw = normalizeText(
                Object.entries(item)
                  .filter(([key]) => !key.startsWith('_'))
                  .map(([, value]) => String(value || ''))
                  .join(' ')
              );
              const normalizedPhone = item.phone ? normalizePhone(item.phone) : '';
              const searchableText = `${searchableRaw} ${normalizedPhone}`.trim();
              const searchableCompact = searchableText.replace(/\s+/g, '');

              return contentTokens.every((word) => {
                const w = String(word || '').trim();
                if (!w) return true;
                return searchableText.includes(w) || searchableCompact.includes(w.replace(/\s+/g, ''));
              });
            });
          }
        }

        setSearchResults(sortByRelevance(filtered, contentTokens, cleanedQuery));
      };

      // Copy helpers
      const copyText = (text, id, meta) => {
        if (meta && meta.item) {
          trackProductUsage(meta.item, meta.action || 'copy');
        }
        window.KTM.clipboard.writeText(text).then(() => {
          setCopiedId(id);
          showToast('Đã copy!', 'success');
          setTimeout(() => setCopiedId(null), 1500);
        });
      };

      const copyImage = async (url, id, meta) => {
        try {
          if (meta && meta.item) {
            trackProductUsage(meta.item, meta.action || 'copy_image');
          }
          await window.KTM.clipboard.writeImageFromUrl(url);
          setCopiedId(id + '-img');
          showToast('Đã copy ảnh!', 'success');
          setTimeout(() => setCopiedId(null), 1500);
        } catch (err) {
          // Fallback: copy URL
          copyText(url, id + '-img', meta);
        }
      };

      // Find matching items from message - hiện ảnh đúng TẤT CẢ sản phẩm được hỏi
      const findMatchingItems = (message) => {
        let lowerMsg = message.toLowerCase();
        const results = [];
        
        // Chỉ filter products (không lấy albums, videos)
        const products = allData.filter(item => item._type === 'product');
        
        // 1. Tìm xy lanh được đề cập
        if (lowerMsg.includes('ty') || lowerMsg.includes('xy lanh')) {
          if (lowerMsg.includes('giữa') || lowerMsg.includes('giua')) {
            const match = products.find(p => p.name?.toLowerCase().includes('xy lanh giữa'));
            if (match && !results.find(r => r.id === match.id)) results.push(match);
          }
          if (lowerMsg.includes('nghiêng') || lowerMsg.includes('nghieng')) {
            const match = products.find(p => p.name?.toLowerCase().includes('xy lanh nghiêng'));
            if (match && !results.find(r => r.id === match.id)) results.push(match);
          }
          if (lowerMsg.includes('ủi') || lowerMsg.includes('ui')) {
            const match = products.find(p => p.name?.toLowerCase().includes('xy lanh ủi'));
            if (match && !results.find(r => r.id === match.id)) results.push(match);
          }
        }
        
        // 2. Tìm combo "van X tay Y ty"
        const vanTyMatch = lowerMsg.match(/van\s*(\d+)\s*tay.*?(\d+)\s*ty/);
        if (vanTyMatch) {
          const tayNum = vanTyMatch[1];
          const tyNum = vanTyMatch[2];
          // Tìm combo van X tay + Y xylanh
          const comboMatch = products.find(p => {
            const name = p.name?.toLowerCase() || '';
            return name.includes('combo') && 
                   name.includes(`${tayNum} tay`) && 
                   (name.includes(`${tyNum} xy`) || name.includes(`${tyNum} xylanh`));
          });
          if (comboMatch && !results.find(r => r.id === comboMatch.id)) {
            results.push(comboMatch);
          } else {
            // Fallback: combo van X tay bất kỳ
            const fallback = products.find(p => {
              const name = p.name?.toLowerCase() || '';
              return name.includes('combo') && name.includes(`${tayNum} tay`);
            });
            if (fallback && !results.find(r => r.id === fallback.id)) results.push(fallback);
          }
        }
        
        // 3. Tìm combo nếu có từ "combo"
        if (lowerMsg.includes('combo') && !vanTyMatch) {
          const comboTayMatch = lowerMsg.match(/combo.*?(\d+)\s*tay/);
          if (comboTayMatch) {
            const tayNum = comboTayMatch[1];
            const matches = products.filter(p => {
              const name = p.name?.toLowerCase() || '';
              return name.includes('combo') && name.includes(`${tayNum} tay`);
            });
            matches.forEach(m => {
              if (!results.find(r => r.id === m.id)) results.push(m);
            });
          }
        }
        
        // 4. Tìm van đơn lẻ (nếu không có ty đi kèm)
        const vanOnlyMatch = lowerMsg.match(/van\s*(\d+)\s*tay/);
        if (vanOnlyMatch && !lowerMsg.includes('ty') && !lowerMsg.includes('combo')) {
          const vanNum = vanOnlyMatch[1];
          const match = products.find(p => {
            const name = p.name?.toLowerCase() || '';
            return name.includes(`van ${vanNum} tay`) && !name.includes('combo');
          });
          if (match && !results.find(r => r.id === match.id)) results.push(match);
        }
        
        return results.slice(0, 4);
      };

      // AI Chat function - Local AI using data context
      const handleAIChat = async (message) => {
        if (!message.trim()) return;
        
        // Add user message
        const userMsg = { role: 'user', content: message, attachments: [] };
        setAiMessages(prev => [...prev, userMsg]);
        setAiInput('');
        setAiLoading(true);

        // Find matching items to attach
        const matchedItems = findMatchingItems(message);

        // Scroll to bottom
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        try {
          // Chỉ lấy products (không lấy albums, videos)
          const productsOnly = allData.filter(item => item._type === 'product');
          
          // Build context chỉ từ products
          const dataContext = productsOnly.map(item => {
            let info = `- ${item.name}`;
            if (item.code) info += ` (Mã: ${item.code})`;
            if (item.price) info += ` - Giá: ${item.price.replace(/[đ\s]/g, '')}đ`;
            if (item.category) info += ` [${item.category}]`;
            if (item.note) info += ` (${item.note})`;
            return info;
          }).join('\n');

          // Build chat history để AI hiểu ngữ cảnh (lấy 6 tin nhắn gần nhất)
          const recentMessages = aiMessages.slice(-6);
          const historyText = recentMessages.map(m => 
            `${m.role === 'user' ? 'Khách' : 'AI'}: ${m.content}`
          ).join('\n');
          
          // Gộp context = products + history
          const fullContext = historyText 
            ? `LỊCH SỬ HỘI THOẠI:\n${historyText}\n\nDANH SÁCH SẢN PHẨM:\n${dataContext}`
            : dataContext;

          // Call backend API (unified)
          const data = await window.KTM.api.postJSON(
            `${API_BASE}/api/ai-chat`,
            {
              message: message,
              context: fullContext,
              audience: 'admin'
            },
            'API error'
          );
          
          const aiResponse = data.response || 'Xin lỗi, tôi không thể trả lời lúc này.';
          
          // Attach matching items with images/videos
          setAiMessages(prev => [...prev, { 
            role: 'assistant', 
            content: aiResponse,
            attachments: matchedItems
          }]);
        } catch (err) {
          console.error('AI Error:', err);
          
          // Fallback: Simple local search
          const lowerMsg = message.toLowerCase();
          const matches = allData.filter(item => {
            const text = Object.values(item).join(' ').toLowerCase();
            return lowerMsg.split(' ').some(word => text.includes(word));
          });

          let fallbackResponse = '';
          if (matches.length > 0) {
            fallbackResponse = `Tìm thấy ${matches.length} sản phẩm liên quan:\n\n`;
            matches.slice(0, 5).forEach(item => {
              fallbackResponse += `• ${item.name}`;
              if (item.price) fallbackResponse += ` - ${item.price.replace(/[đ\s]/g, '')}đ`;
              if (item.note) fallbackResponse += ` (${item.note})`;
              fallbackResponse += '\n';
            });
            if (matches.length > 5) fallbackResponse += `\n...và ${matches.length - 5} sản phẩm khác`;
          } else {
            fallbackResponse = 'Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa khác như "van", "combo", "xy lanh"...';
          }
          
          setAiMessages(prev => [...prev, { 
            role: 'assistant', 
            content: fallbackResponse,
            attachments: matches.slice(0, 4)
          }]);
        }

        setAiLoading(false);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          aiInputRef.current?.focus();
        }, 100);
      };

      // Product Modal for FAB
      function ProductModal({ show, product, categories, onClose, onSave }) {
        const [formData, setFormData] = useState({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
        const [saving, setSaving] = useState(false);
        const [uploading, setUploading] = useState(false);
        const imageInputRef = useRef(null);

        // Hàm format tiền VNĐ
        const formatVND = (digits) => window.KTM.money.formatVNDInputDigits(digits);

        const getBasePriceInt = (priceText) => {
          const digits = window.KTM.money.getDigits(String(priceText ?? ''));
          const n = Number(digits);
          return digits && Number.isFinite(n) ? Math.trunc(n) : 0;
        };

        const normalizeVariants = (v, basePriceText) => {
          if (v == null || v === '') return [];
          let next = v;
          if (typeof next === 'string') {
            const s = next.trim();
            if (!s) return [];
            try {
              next = JSON.parse(s);
            } catch {
              return [];
            }
          }
          if (!Array.isArray(next)) return [];
          const base = getBasePriceInt(basePriceText);
          return next
            .map((g) => {
              if (!g || typeof g !== 'object') return null;
              const name = String(g.name ?? '').trim();
              const options = (Array.isArray(g.options) ? g.options : [])
                .map((o) => {
                  if (!o || typeof o !== 'object') return null;
                  const label = String(o.label ?? '').trim();
                  if (!label) return null;
                  const pRaw = o.price ?? o.priceValue ?? o.unit_price ?? o.unitPrice ?? null;
                  const pNum = Number(pRaw);
                  let price = Number.isFinite(pNum) ? Math.trunc(pNum) : null;

                  // Backward compatibility: convert delta -> absolute when possible
                  if (price == null) {
                    const dRaw = o.price_delta ?? o.priceDelta ?? null;
                    const dNum = Number(dRaw);
                    if (Number.isFinite(dNum)) price = base + Math.trunc(dNum);
                  }

                  if (price == null) price = base;
                  const digits = String(Math.max(0, Math.trunc(Number(price) || 0)));
                  return { label, price: Math.max(0, Math.trunc(Number(price) || 0)), priceDigits: digits };
                })
                .filter(Boolean);
              return { name: name || 'Biến thể', options };
            })
            .filter(Boolean);
        };

        const normalizeAttributes = (v) => {
          if (v == null || v === '') return [];
          let next = v;
          if (typeof next === 'string') {
            const s = next.trim();
            if (!s) return [];
            try {
              next = JSON.parse(s);
            } catch {
              return [];
            }
          }

          if (next && typeof next === 'object' && !Array.isArray(next)) {
            next = Object.entries(next).map(([k, val]) => ({ key: k, value: val }));
          }
          if (!Array.isArray(next)) return [];

          return next
            .map((a) => {
              if (!a || typeof a !== 'object') return null;
              const key = String(a.key ?? a.name ?? a.label ?? '').trim();
              const valueStr = String(a.value ?? '').trim();
              const unit = String(a.unit ?? '').trim();
              if (!key) return null;
              return { key, value: valueStr, unit };
            })
            .filter(Boolean);
        };

        useEffect(() => {
          if (product) {
            setFormData({
              name: product.name || '',
              code: product.code || '',
              price: product.price || '',
              image: product.image || '',
              category: product.category || '',
              note: product.note || '',
              sort_order: product.sort_order || 0,
              commission_percent: (product.commission_percent ?? product.commissionPercent ?? 5),
              variants: normalizeVariants(product.variants, product.price),
              attributes: normalizeAttributes(product.attributes)
            });
            // Set price numbers từ product.price
            if (product.price) {
              const numbers = window.KTM.money.getDigits(product.price);
              setPriceNumbers(numbers);
              setFormData(prev => ({...prev, price: formatVND(numbers)}));
            } else {
              setPriceNumbers('');
            }
          } else {
            setFormData({ name: '', code: '', price: '', image: '', category: '', note: '', sort_order: 0, commission_percent: 5, variants: [], attributes: [] });
            setPriceNumbers('');
          }
        }, [product, show]);

        const applyVariantBulkBasePriceToGroup = (groupIndex) => {
          setFormData((prev) => {
            const bulk = getBasePriceInt(prev.price);
            const bulkDigits = String(bulk);
            const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
            const g = { ...(variants[groupIndex] || {}), options: Array.isArray(variants[groupIndex]?.options) ? [...variants[groupIndex].options] : [] };
            g.options = g.options.map((o) => ({ label: String(o?.label || ''), price: bulk, priceDigits: bulkDigits }));
            variants[groupIndex] = g;
            return { ...prev, variants };
          });
        };

        const applyVariantBulkBasePriceAll = () => {
          setFormData((prev) => {
            const bulk = getBasePriceInt(prev.price);
            const bulkDigits = String(bulk);
            const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
            const next = variants.map((g) => {
              const options = (Array.isArray(g?.options) ? g.options : []).map((o) => ({
                label: String(o?.label || ''),
                price: bulk,
                priceDigits: bulkDigits,
              }));
              return { name: String(g?.name || 'Biến thể'), options };
            });
            return { ...prev, variants: next };
          });
        };

        // State để hiển thị tiến trình
        const [uploadStatus, setUploadStatus] = React.useState('');
        
        // Lưu giá trị số thuần để so sánh
        const [priceNumbers, setPriceNumbers] = React.useState('');
        
        // Xử lý khi nhập giá
        const handlePriceChange = (e) => {
          const next = window.KTM.money.nextPriceInputState(e.target.value, priceNumbers);
          setPriceNumbers(next.digits);
          setFormData({ ...formData, price: next.price });
        };

        const compressImage = async (file, maxSizeMB = 2) => {
          const maxSize = maxSizeMB * 1024 * 1024;
          if (file.size <= maxSize) return file;

          try {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            
            let width = bitmap.width;
            let height = bitmap.height;
            const maxDimension = 1200;
            
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height / width) * maxDimension);
                width = maxDimension;
              } else {
                width = Math.round((width / height) * maxDimension);
                height = maxDimension;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();
            
            return new Promise((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
                } else {
                  reject(new Error('Không nén được ảnh'));
                }
              }, 'image/jpeg', 0.8);
            });
          } catch (err) {
            console.error('Compress error:', err);
            throw new Error('Không thể xử lý ảnh. Thử chọn ảnh khác.');
          }
        };

        const handleImageUpload = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
          if (!isImage) {
            alert('Vui lòng chọn file ảnh!');
            return;
          }
          
          setUploading(true);
          try {
            const compressedFile = await compressImage(file);

            const data = await window.KTM.cloudinary.uploadImage({
              file: compressedFile,
              cloudName: CLOUDINARY_CLOUD_NAME,
              uploadPreset: CLOUDINARY_UPLOAD_PRESET,
              folder: 'ktm-products',
            });

            if (!data.secure_url) {
              console.error('Cloudinary error:', data);
              throw new Error(data.error?.message || 'Upload failed');
            }

            setFormData(prev => ({ ...prev, image: data.secure_url }));
          } catch (err) {
            console.error('Upload error:', err);
            alert('Lỗi upload ảnh: ' + err.message);
          }
          setUploading(false);
          e.target.value = '';
        };

        const handleSubmit = async (e) => {
          e.preventDefault();
          setSaving(true);
          const payload = {
            ...formData,
            variants: normalizeVariants(formData.variants, formData.price),
            attributes: normalizeAttributes(formData.attributes),
          };
          await onSave(payload);
          setSaving(false);
        };

        if (!show) return null;

        return (
          <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content" style={{ borderRadius: 16, border: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ffc107, #ff9800)', border: 'none', borderRadius: '16px 16px 0 0' }}>
                  <h5 className="modal-title fw-bold text-dark">
                    <i className="fas fa-box me-2"></i>{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                  </h5>
                  <button type="button" className="btn-close" onClick={onClose}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="row">
                      <div className="col-md-8">
                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-tag me-1"></i>Tên sản phẩm *
                          </label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            placeholder="Ví dụ: Xy lanh nghiêng KTM"
                            required
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          />
                        </div>
                        <div className="row">
                          <div className="col-6">
                            <label className="form-label fw-semibold small text-muted mb-1">
                              <i className="fas fa-hashtag me-1"></i>Mã sản phẩm
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={formData.code} 
                              onChange={(e) => setFormData({...formData, code: e.target.value})} 
                              placeholder="KTM-01"
                              style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label fw-semibold small text-muted mb-1">
                              <i className="fas fa-dollar-sign me-1"></i>Giá bán
                            </label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={formData.price} 
                              onChange={handlePriceChange} 
                              placeholder="1.950.000đ"
                              style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                            />
                          </div>
                        </div>
                        <div className="mb-3 mt-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-percent me-1"></i>Hoa hồng (%)
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={formData.commission_percent}
                            min={0}
                            max={100}
                            step={0.01}
                            placeholder="5"
                            onChange={(e) => setFormData({...formData, commission_percent: e.target.value})}
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-list me-1"></i>Danh mục
                          </label>
                          <select 
                            className="form-select" 
                            value={formData.category} 
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          >
                            <option value="">Chọn danh mục</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-sticky-note me-1"></i>Ghi chú
                          </label>
                          <textarea 
                            className="form-control" 
                            rows="2" 
                            value={formData.note} 
                            onChange={(e) => setFormData({...formData, note: e.target.value})} 
                            placeholder="Ví dụ: Thêm dây là 2.150.000đ"
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '12px'}}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-sliders-h me-1"></i>Thuộc tính (cân nặng, chiều dài, ...)
                          </label>
                          <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                            {(Array.isArray(formData.attributes) ? formData.attributes : []).length === 0 ? (
                              <div className="text-muted small">Chưa có thuộc tính. Ví dụ: Cân nặng, Chiều dài, Vật liệu...</div>
                            ) : null}

                            {(Array.isArray(formData.attributes) ? formData.attributes : []).map((attr, ai) => (
                              <div key={ai} className="row g-2 align-items-center mb-2">
                                <div className="col-5">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={attr?.key || ''}
                                    onChange={(e) => {
                                      const nextKey = e.target.value;
                                      setFormData((prev) => {
                                        const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                        attributes[ai] = { ...(attributes[ai] || {}), key: nextKey };
                                        return { ...prev, attributes };
                                      });
                                    }}
                                    placeholder="Tên (vd: Cân nặng)"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-4">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={attr?.value || ''}
                                    onChange={(e) => {
                                      const nextVal = e.target.value;
                                      setFormData((prev) => {
                                        const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                        attributes[ai] = { ...(attributes[ai] || {}), value: nextVal };
                                        return { ...prev, attributes };
                                      });
                                    }}
                                    placeholder="Giá trị (vd: 10)"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-2">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={attr?.unit || ''}
                                    onChange={(e) => {
                                      const nextUnit = e.target.value;
                                      setFormData((prev) => {
                                        const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                        attributes[ai] = { ...(attributes[ai] || {}), unit: nextUnit };
                                        return { ...prev, attributes };
                                      });
                                    }}
                                    placeholder="Đơn vị"
                                    style={{ borderRadius: 10 }}
                                  />
                                </div>
                                <div className="col-1 d-flex justify-content-end">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => {
                                      setFormData((prev) => {
                                        const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                        attributes.splice(ai, 1);
                                        return { ...prev, attributes };
                                      });
                                    }}
                                    title="Xóa thuộc tính"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm mt-1"
                              onClick={() => {
                                setFormData((prev) => {
                                  const attributes = Array.isArray(prev.attributes) ? [...prev.attributes] : [];
                                  attributes.push({ key: '', value: '', unit: '' });
                                  return { ...prev, attributes };
                                });
                              }}
                              style={{ borderRadius: 10 }}
                            >
                              <i className="fas fa-plus me-1"></i>Thêm thuộc tính
                            </button>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-layer-group me-1"></i>Biến thể (size, ...)
                          </label>
                          <div className="border rounded-3 p-2" style={{ background: '#fff' }}>
                            {(Array.isArray(formData.variants) ? formData.variants : []).length === 0 ? (
                              <div className="text-muted small">Chưa có biến thể. Có thể thêm (ví dụ Size: S/M/L).</div>
                            ) : null}

                            {(Array.isArray(formData.variants) ? formData.variants : []).map((group, gi) => (
                              <div key={gi} className="mb-3">
                                <div className="d-flex gap-2 align-items-center mb-2">
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={group?.name || ''}
                                    onChange={(e) => {
                                      const nextName = e.target.value;
                                      setFormData((prev) => {
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        variants[gi] = { ...(variants[gi] || {}), name: nextName, options: Array.isArray(variants[gi]?.options) ? variants[gi].options : [] };
                                        return { ...prev, variants };
                                      });
                                    }}
                                    placeholder="Tên nhóm (ví dụ: Size)"
                                    style={{ borderRadius: 10 }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                      onClick={() => applyVariantBulkBasePriceToGroup(gi)}
                                      title="Đặt giá giống giá gốc sản phẩm cho tất cả lựa chọn trong nhóm"
                                      disabled={!Array.isArray(group?.options) || group.options.length === 0}
                                  >
                                    Đồng giá
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => {
                                      setFormData((prev) => {
                                        const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                        variants.splice(gi, 1);
                                        return { ...prev, variants };
                                      });
                                    }}
                                    title="Xóa nhóm"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>

                                <div className="d-grid gap-2">
                                  {(Array.isArray(group?.options) ? group.options : []).map((opt, oi) => (
                                    <div key={oi} className="row g-2 align-items-center">
                                      <div className="col-7">
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={opt?.label || ''}
                                          onChange={(e) => {
                                            const nextLabel = e.target.value;
                                            setFormData((prev) => {
                                              const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                              const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                              const currentPrice = Number(g.options[oi]?.price ?? 0) || 0;
                                              const currentDigits = String(g.options[oi]?.priceDigits ?? Math.max(0, Math.trunc(currentPrice)));
                                              g.options[oi] = { ...(g.options[oi] || {}), label: nextLabel, price: Math.max(0, Math.trunc(currentPrice)), priceDigits: currentDigits };
                                              variants[gi] = g;
                                              return { ...prev, variants };
                                            });
                                          }}
                                          placeholder="Giá trị (ví dụ: M)"
                                          style={{ borderRadius: 10 }}
                                        />
                                      </div>
                                      <div className="col-4">
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={formatVND(String(opt?.priceDigits ?? window.KTM.money.getDigits(String(opt?.price ?? ''))))}
                                          onChange={(e) => {
                                            setFormData((prev) => {
                                              const prevDigits = String(opt?.priceDigits ?? window.KTM.money.getDigits(String(opt?.price ?? '')));
                                              const next = window.KTM.money.nextPriceInputState(e.target.value, prevDigits);
                                              const digits = String(next.digits ?? '');
                                              const n = Number(digits);
                                              const nextPrice = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
                                              const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                              const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                              g.options[oi] = { ...(g.options[oi] || {}), label: String(g.options[oi]?.label || ''), price: nextPrice, priceDigits: digits };
                                              variants[gi] = g;
                                              return { ...prev, variants };
                                            });
                                          }}
                                          placeholder="Giá (đ)"
                                          style={{ borderRadius: 10 }}
                                        />
                                      </div>
                                      <div className="col-1 d-flex justify-content-end">
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={() => {
                                            setFormData((prev) => {
                                              const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                              const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                              g.options.splice(oi, 1);
                                              variants[gi] = g;
                                              return { ...prev, variants };
                                            });
                                          }}
                                          title="Xóa lựa chọn"
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm mt-2"
                                  onClick={() => {
                                    setFormData((prev) => {
                                      const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                      const g = { ...(variants[gi] || {}), options: Array.isArray(variants[gi]?.options) ? [...variants[gi].options] : [] };
                                            const base = getBasePriceInt(prev.price);
                                            g.options.push({ label: '', price: base, priceDigits: String(base) });
                                      variants[gi] = g;
                                      return { ...prev, variants };
                                    });
                                  }}
                                  style={{ borderRadius: 10 }}
                                >
                                  <i className="fas fa-plus me-1"></i>Thêm lựa chọn
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm"
                              onClick={() => {
                                setFormData((prev) => {
                                  const base = getBasePriceInt(prev.price);
                                  const variants = Array.isArray(prev.variants) ? [...prev.variants] : [];
                                  const d = String(base);
                                  variants.push({ name: 'Size', options: [{ label: 'S', price: base, priceDigits: d }, { label: 'M', price: base, priceDigits: d }, { label: 'L', price: base, priceDigits: d }] });
                                  return { ...prev, variants };
                                });
                              }}
                              style={{ borderRadius: 10 }}
                            >
                              <i className="fas fa-plus me-1"></i>Thêm nhóm biến thể
                            </button>

                            <div className="d-flex gap-2 align-items-center mt-2">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={applyVariantBulkBasePriceAll}
                                disabled={!Array.isArray(formData.variants) || formData.variants.length === 0}
                                style={{ borderRadius: 10 }}
                                title="Đặt giá giống giá gốc sản phẩm cho tất cả lựa chọn ở mọi nhóm"
                              >
                                Đồng giá (tất cả)
                              </button>
                            </div>

                            <div className="text-muted small mt-2">Giá biến thể là giá cụ thể (đ). Ví dụ Size S: 15.000đ, Size M: 25.000đ.</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small text-muted mb-1">
                          <i className="fas fa-image me-1"></i>Ảnh sản phẩm
                        </label>
                        <div className="mb-2">
                          {formData.image ? (
                            <>
                              <img 
                                src={formData.image} 
                                alt="Product" 
                                style={{width: '100%', height: 150, objectFit: 'cover', borderRadius: '12px', border: '2px solid #e9ecef'}}
                              />
                              <button 
                                type="button"
                                className="btn btn-sm btn-danger mt-2"
                                onClick={() => setFormData({...formData, image: ''})}
                                style={{borderRadius: '20px', fontSize: '0.75rem'}}
                              >
                                <i className="fas fa-times me-1"></i>Xóa ảnh
                              </button>
                            </>
                          ) : (
                            <div 
                              className="d-flex align-items-center justify-content-center" 
                              style={{width: '100%', height: 150, borderRadius: '12px', background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)', border: '2px dashed #adb5bd', cursor: 'pointer'}}
                              onClick={() => imageInputRef.current?.click()}
                            >
                              <div className="text-center">
                                <i className="fas fa-cloud-upload-alt fa-2x text-muted mb-2"></i>
                                <div className="small text-muted">Click để upload</div>
                              </div>
                            </div>
                          )}
                        </div>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleImageUpload}
                        />
                        <button 
                          type="button"
                          className="btn btn-outline-secondary w-100"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploading}
                          style={{borderRadius: '10px'}}
                        >
                          {uploading ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Đang upload...</>
                          ) : (
                            <><i className="fas fa-upload me-2"></i>Upload ảnh</>
                          )}
                        </button>
                        <div className="mt-2">
                          <label className="form-label fw-semibold small text-muted mb-1">
                            <i className="fas fa-link me-1"></i>Hoặc URL ảnh
                          </label>
                          <input 
                            type="url" 
                            className="form-control" 
                            value={formData.image} 
                            onChange={(e) => setFormData({...formData, image: e.target.value})} 
                            placeholder="https://..."
                            style={{borderRadius: '10px', border: '1px solid #dee2e6', padding: '8px', fontSize: '0.875rem'}}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{border: 'none', padding: '20px'}}>
                    <button type="button" className="btn btn-light px-4" onClick={onClose} style={{borderRadius: '10px'}}>
                      Hủy
                    </button>
                    <button type="submit" className="btn btn-warning px-4 fw-semibold" disabled={saving} style={{borderRadius: '10px', boxShadow: '0 4px 12px rgba(255,193,7,0.3)'}}>
                      {saving ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</>
                      ) : (
                        <><i className="fas fa-check me-2"></i>Lưu sản phẩm</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      }

      // ========== MOBILE CARD COMPONENT ==========
      const formatVNDNumber = (n) => window.KTM.money.formatVND(n);

      const parseVariantGroupsForDisplay = (value) => {
        if (value == null || value === '') return [];
        let v = value;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          try {
            v = JSON.parse(s);
          } catch {
            return [];
          }
        }
        return Array.isArray(v) ? v : [];
      };

      const parseAttributesForDisplay = (value) => {
        if (value == null || value === '') return [];
        let v = value;
        if (typeof v === 'string') {
          const s = v.trim();
          if (!s) return [];
          try {
            v = JSON.parse(s);
          } catch {
            return [];
          }
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          v = Object.entries(v).map(([k, val]) => ({ key: k, value: val }));
        }
        return Array.isArray(v) ? v : [];
      };

      const renderAttributesPreview = (attributes, opts = {}) => {
        const rows = parseAttributesForDisplay(attributes)
          .map((a) => ({
            key: String(a?.key ?? a?.name ?? a?.label ?? '').trim(),
            value: String(a?.value ?? '').trim(),
            unit: String(a?.unit ?? '').trim(),
          }))
          .filter((a) => !!a.key);

        if (!rows.length) return null;

        const compact = !!opts.compact;
        const extraClassName = String(opts.className ?? '').trim();

        return (
          <div className={`ktm-variants-preview${compact ? ' compact' : ''}${extraClassName ? ' ' + extraClassName : ''}`}>
            <i className="fas fa-sliders-h"></i>
            <div className="ktm-variants-chips">
              {rows.map((a, idx) => {
                const keyText = a.key;
                const valueText = `${a.value || ''}${a.unit ? (a.value ? ' ' : '') + a.unit : ''}`.trim();
                return (
                  <div key={`${keyText}-${idx}`} className="ktm-variants-group">
                    <span className="ktm-chip ktm-chip-group">{keyText}</span>
                    {valueText ? <span className="ktm-chip ktm-chip-option">{valueText}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const renderVariantsPreview = (variants, opts = {}) => {
        const groups = parseVariantGroupsForDisplay(variants)
          .map(g => ({
            name: String(g?.name ?? '').trim(),
            options: Array.isArray(g?.options) ? g.options : [],
          }))
          .map(g => ({
            ...g,
            options: g.options
              .map(o => ({
                label: String(o?.label ?? '').trim(),
                price: Number(o?.price),
              }))
              .filter(o => !!o.label),
          }))
          .filter(g => g.options.length > 0);

        if (!groups.length) return null;

        const maxGroups = Number.isFinite(opts.maxGroups)
          ? Math.max(1, Math.trunc(opts.maxGroups))
          : groups.length;
        const maxOptionsPerGroup = Number.isFinite(opts.maxOptionsPerGroup)
          ? Math.max(1, Math.trunc(opts.maxOptionsPerGroup))
          : 3;
        const compact = !!opts.compact;
        const extraClassName = String(opts.className ?? '').trim();

        const shownGroups = groups.slice(0, maxGroups);

        return (
          <div className={`ktm-variants-preview${compact ? ' compact' : ''}${extraClassName ? ' ' + extraClassName : ''}`}>
            <i className="fas fa-layer-group"></i>
            <div className="ktm-variants-chips">
              {shownGroups.map((g, gi) => {
                const groupName = g.name || 'Biến thể';
                const shownOptions = g.options.slice(0, maxOptionsPerGroup);
                const hiddenOptionsCount = g.options.length - shownOptions.length;

                return (
                  <div key={`${groupName}-${gi}`} className="ktm-variants-group">
                    <span className="ktm-chip ktm-chip-group">{groupName}</span>
                    {shownOptions.map((o, oi) => {
                      const p = o.price;
                      const priceText = Number.isFinite(p) && p >= 0 ? formatVNDNumber(Math.trunc(p)) : '';
                      const text = priceText ? `${o.label} · ${priceText}` : o.label;
                      return (
                        <span key={`${groupName}-${gi}-${oi}`} className="ktm-chip ktm-chip-option">{text}</span>
                      );
                    })}
                    {hiddenOptionsCount > 0 && (
                      <span className="ktm-chip ktm-chip-more">+{hiddenOptionsCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      const renderMobileCard = (item, index) => {
        const isProduct = item._type === 'product';
        const isAlbum = item._type === 'album';
        const isVideo = item._type === 'video';
        const hasPromo = item.note && (item.note.toLowerCase().includes('free') || item.note.toLowerCase().includes('giảm') || item.note.toLowerCase().includes('sale'));
        const attributesPreview = isProduct
          ? renderAttributesPreview(item.attributes, {
              compact: viewMode === 'grid',
              className: viewMode === 'grid' ? 'meta text-muted' : 'text-muted',
            })
          : null;
        const variantsPreview = isProduct
          ? renderVariantsPreview(item.variants, {
              compact: viewMode === 'grid',
              // Tra cứu: hiển thị hết option, không hiện dạng +N
              maxOptionsPerGroup: 999,
              className: viewMode === 'grid' ? 'meta text-muted' : 'text-muted',
            })
          : null;

        if (viewMode === 'grid') {
          // Grid view - compact cards
          return (
            <div key={item.id || index} className="grid-card">
              <div className="thumb-wrap" onClick={() => { trackProductUsage(item, 'preview'); setPreviewImage({ url: item.image, name: item.name, price: item.price, note: item.note, item }); }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} className="thumb" loading="lazy" />
                ) : (
                  <div className="thumb d-flex align-items-center justify-content-center bg-light">
                    <i className={`fas ${isVideo ? 'fa-video' : 'fa-image'} fa-2x text-muted`}></i>
                  </div>
                )}
                {/* Price overlay */}
                {item.price && (
                  <div className="price-overlay">{item.price.replace(/[đ\s]/g, '')}đ</div>
                )}
                {/* Type badge */}
                <span className={`type-badge ${isProduct ? 'product' : isAlbum ? 'album' : 'video'}`}>
                  {isProduct ? 'SP' : isAlbum ? 'Ảnh' : 'Video'}
                </span>
                {/* Promo badge */}
                {hasPromo && <span className="promo-badge">🔥 ƯU ĐÃI</span>}
              </div>
              <div className="card-body">
                <div className="name">{item.name}</div>
                {item.note && <div className="meta text-info" style={{fontSize: 10}}>{item.note}</div>}
                {attributesPreview && <div style={{ marginTop: 2 }}>{attributesPreview}</div>}
                {variantsPreview && <div style={{ marginTop: 2 }}>{variantsPreview}</div>}
                <div className="quick-copy">
                  <button 
                    className={copiedId === item.id + '-img' ? 'copied' : ''}
                    onClick={() => copyImage(item.image, item.id, { item, action: 'copy_image' })}
                  >
                    <i className="fas fa-image"></i>
                  </button>
                  {item.price && (
                    <button 
                      className={copiedId === item.id + '-price' ? 'copied' : ''}
                      onClick={() => copyText(item.price.replace(/[đ\s]/g, ''), item.id + '-price', { item, action: 'copy_price' })}
                    >
                      <i className="fas fa-tag"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // List view - detailed cards
        return (
          <div key={item.id || index} className="product-card-mobile">
            {/* Type badge */}
            <span className={`type-badge ${isProduct ? 'product' : isAlbum ? 'album' : 'video'}`}>
              {isProduct ? 'Sản phẩm' : isAlbum ? 'Ảnh' : 'Video'}
            </span>
            
            <div className="card-inner">
              {/* Thumbnail */}
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="thumb"
                  loading="lazy"
                  onClick={() => { trackProductUsage(item, 'preview'); setPreviewImage({ url: item.image, name: item.name, price: item.price, note: item.note, item }); }}
                />
              ) : (
                <div className="thumb d-flex align-items-center justify-content-center bg-light">
                  <i className={`fas ${isVideo ? 'fa-video' : 'fa-image'} fa-2x text-muted`}></i>
                </div>
              )}
              
              {/* Info */}
              <div className="info">
                <div>
                  <div className="name">{item.name}</div>
                  <div className="price-row">
                    {item.price && <span className="price">{item.price.replace(/[đ\s]/g, '')}đ</span>}
                    {hasPromo && <span className="badge-promo">🔥 ƯU ĐÃI</span>}
                  </div>
                  {attributesPreview && (
                    <div style={{ marginTop: 4 }}>
                      {attributesPreview}
                    </div>
                  )}
                  {variantsPreview && (
                    <div style={{ marginTop: 4 }}>
                      {variantsPreview}
                    </div>
                  )}
                </div>
                <div className="meta">
                  {item.code && <span className="meta-tag">#{item.code}</span>}
                  {item.category && <span className="meta-tag">{item.category}</span>}
                  {item.note && <span className="meta-tag highlight">{item.note}</span>}
                  {item.folder && <span className="meta-tag">{item.folder}</span>}
                  {isVideo && <span className="meta-tag"><i className="fab fa-youtube text-danger"></i> Video</span>}
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="quick-actions">
              {isProduct && (
                <button
                  onClick={() => { trackProductUsage(item, 'create_order'); onNavigate && onNavigate('orders', 'create', { productId: item.id }); }}
                >
                  <i className="fas fa-receipt"></i> Tạo đơn
                </button>
              )}
              {/* <button 
                className={copiedId === item.id + '-img' ? 'copied' : ''}
                onClick={() => copyImage(item.image, item.id)}
              >
                <i className="fas fa-image"></i> Ảnh
              </button> */}
              {item.price && (
                <button 
                  className={copiedId === item.id + '-price' ? 'copied' : ''}
                  onClick={() => copyText(item.price.replace(/[đ\s]/g, ''), item.id + '-price', { item, action: 'copy_price' })}
                >
                  <i className="fas fa-tag"></i> Giá
                </button>
              )}
              <button 
                className={copiedId === item.id + '-name' ? 'copied' : ''}
                onClick={() => copyText(item.name, item.id + '-name', { item, action: 'copy_name' })}
              >
                <i className="fas fa-font"></i> Tên
              </button>
              {isVideo && item.youtubeId && (
                <button 
                  className={copiedId === item.id + '-yt' ? 'copied' : ''}
                  onClick={() => copyText(`https://www.youtube.com/watch?v=${item.youtubeId}`, item.id + '-yt')}
                >
                  <i className="fab fa-youtube"></i>
                </button>
              )}
              {/* Edit button - chỉ cho sản phẩm */}
              {isProduct && (
                <button 
                  className="action-edit"
                  onClick={() => handleQuickEdit(item)}
                >
                  <i className="fas fa-pen"></i>
                </button>
              )}
              {/* Delete button */}
              <button 
                className="action-delete"
                onClick={() => handleQuickDelete(item)}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        );
      };

      // State for filter dropdown
      const [showFilter, setShowFilter] = useState(false);

      const quickSuggestionChips = [
        { label: 'van 2 tay', query: 'van 2 tay' },
        { label: 'combo rẻ', query: 'combo rẻ' },
        { label: 'xylanh', query: 'xylanh' },
        { label: 'sdt:…', query: 'sdt:', caret: 'end', addToHistory: false },
        { label: '#mã…', query: '#', caret: 'end', addToHistory: false },
      ];

      return (
        <>
          {/* ========== SMART SUGGESTIONS (MOBILE) ========== */}
          <div className="search-suggestions mobile-only">
            <div className="search-suggestions-section">
              <div className="search-suggestions-label">Gợi ý nhanh</div>
              <div className="search-suggestions-row">
                {quickSuggestionChips.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => applySuggestion(c.query, { caret: c.caret, addToHistory: c.addToHistory, focus: false })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {popularProductChips.length > 0 && (
              <div className="search-suggestions-section">
                <div className="search-suggestions-label">Sản phẩm hay tìm</div>
                <div className="search-suggestions-row">
                  {popularProductChips.map((r) => {
                    const label = (r.item?.name || r.name || '').trim();
                    if (!label) return null;
                    const code = String(r.item?.code || r.code || '').trim();
                    const q = code ? `#${code}` : label;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className="suggestion-chip suggestion-chip-popular"
                        onClick={() => {
                          if (r.item) trackProductUsage(r.item, 'suggestion');
                          applySuggestion(q, { caret: 'end', focus: false });
                        }}
                        title={code ? `#${code}` : label}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {popularQueryChips.length > 0 && (
              <div className="search-suggestions-section">
                <div className="search-suggestions-label">Tìm gần đây / hay dùng</div>
                <div className="search-suggestions-row">
                  {popularQueryChips.map((r) => (
                    <button
                      key={r.q}
                      type="button"
                      className="suggestion-chip suggestion-chip-query"
                      onClick={() => applySuggestion(r.q, { caret: 'end', focus: false })}
                      title={`${r.q} (${r.count})`}
                    >
                      {r.q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========== RESULT HEADER ========== */}
          <div className="result-header">
            <span>
              <strong>{searchResults.length}</strong> kết quả
              {aiSearchEnabled && searchQuery.length >= 3 && (
                <span className="ai-badge ms-2">
                  <i className="fas fa-robot"></i> AI
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="ms-2 badge bg-warning text-dark">
                  {selectedCategory === 'product' ? 'Sản phẩm' : selectedCategory === 'album' ? 'Ảnh' : 'Video'}
                </span>
              )}
            </span>
            <div className="d-flex gap-1 align-items-center">
              {/* View mode */}
              <button 
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('list')}
                style={{padding: '4px 8px'}}
              >
                <i className="fas fa-list"></i>
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('grid')}
                style={{padding: '4px 8px'}}
              >
                <i className="fas fa-th"></i>
              </button>
            </div>
          </div>

          {/* ========== RESULTS ========== */}
          <div className="search-results-area">
            {loading ? (
              <div>
                {/* Skeleton list */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="product-card-mobile mb-2" style={{opacity:0.7}}>
                    <div className="card-inner">
                      <div className="thumb bg-light" style={{width:80,height:80,borderRadius:8}}></div>
                      <div className="info" style={{flex:1,minWidth:0}}>
                        <div className="skeleton-box mb-2" style={{height:16,width:'60%',background:'#eee',borderRadius:4}}></div>
                        <div className="skeleton-box mb-1" style={{height:12,width:'40%',background:'#f3f3f3',borderRadius:4}}></div>
                        <div className="skeleton-box" style={{height:10,width:'30%',background:'#f3f3f3',borderRadius:4}}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-search"></i>
                <p>Không tìm thấy "{searchQuery}"</p>
                <button className="btn btn-warning" onClick={() => { setSearchQuery(''); handleSearch(''); }}>
                  Xem tất cả
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="product-grid-mobile">
                {searchResults.map((item, index) => renderMobileCard(item, index))}
              </div>
            ) : (
              <div>
                {searchResults.map((item, index) => renderMobileCard(item, index))}
              </div>
            )}
          </div>

          {/* ========== FILTER DROPDOWN ========== */}
          {showFilter && (
            <div className="filter-dropdown">
              <div className="filter-header">
                <strong>Lọc theo loại</strong>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowFilter(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="filter-chips">
                <span 
                  className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => { filterByCategory('all'); setShowFilter(false); }}
                >
                  Tất cả
                </span>
                <span 
                  className={`filter-chip ${selectedCategory === 'product' ? 'active' : ''}`}
                  onClick={() => { filterByCategory('product'); setShowFilter(false); }}
                >
                  <i className="fas fa-box me-1"></i>Sản phẩm
                </span>
                <span 
                  className={`filter-chip ${selectedCategory === 'album' ? 'active' : ''}`}
                  onClick={() => { filterByCategory('album'); setShowFilter(false); }}
                >
                  <i className="fas fa-images me-1"></i>Ảnh
                </span>
                <span 
                  className={`filter-chip ${selectedCategory === 'video' ? 'active' : ''}`}
                  onClick={() => { filterByCategory('video'); setShowFilter(false); }}
                >
                  <i className="fas fa-video me-1"></i>Video
                </span>
              </div>
              {/* AI Toggle */}
              <div className="mt-3 pt-3 border-top d-flex align-items-center justify-content-between">
                <span>AI Search thông minh</span>
                <div className="form-check form-switch m-0">
                  <input 
                    type="checkbox" 
                    className="form-check-input"
                    checked={aiSearchEnabled} 
                    onChange={(e) => setAiSearchEnabled(e.target.checked)}
                    style={{width: 40, height: 20}}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========== SEARCH BAR BOTTOM ========== */}
          <div className="search-bar-bottom">
            <div className="search-input-wrap">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="🔍 Tìm: van 3 tay, xylanh... (/ để focus, Ctrl+K palette)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <button 
                className={`filter-btn ${showFilter || selectedCategory !== 'all' ? 'active' : ''}`}
                onClick={() => setShowFilter(!showFilter)}
              >
                <i className="fas fa-filter"></i>
              </button>
            </div>
          </div>

          {/* ========== B: COMMAND PALETTE OVERLAY ========== */}
          {showPalette && (
            <div className="search-palette-overlay" onClick={() => setShowPalette(false)}>
              <div className="search-palette" onClick={(e) => e.stopPropagation()}>
                <div className="palette-header">
                  <input
                    ref={paletteInputRef}
                    type="text"
                    className="palette-input"
                    placeholder="🔍 Tìm kiếm nâng cao... (filter: ảnh, video; từ khóa...)"
                    value={paletteQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchResults.length > 0) {
                        addToHistory(paletteQuery);
                        setShowPalette(false);
                      } else if (e.key === 'Escape') {
                        setShowPalette(false);
                      }
                    }}
                  />
                  <button className="palette-close" onClick={() => setShowPalette(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                <div className="palette-body">
                  {/* Filter chips */}
                  <div className="palette-section">
                    <div className="section-label">Loại</div>
                    <div className="filter-chips-row">
                      {['Tất cả', 'Sản phẩm', 'Ảnh', 'Video'].map((label, idx) => (
                        <span
                          key={label}
                          className={`filter-chip ${selectedCategory === ['all', 'product', 'album', 'video'][idx] ? 'active' : ''}`}
                          onClick={() => {
                            filterByCategory(['all', 'product', 'album', 'video'][idx]);
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Saved searches */}
                  {savedSearches.length > 0 && !paletteQuery.trim() && (
                    <div className="palette-section">
                      <div className="section-label">
                        <i className="fas fa-star me-1"></i>Tìm kiếm đã lưu
                      </div>
                      <div className="palette-items">
                        {savedSearches.map((q, idx) => (
                          <div
                            key={idx}
                            className="palette-item"
                            onClick={() => {
                              handleSearch(q);
                              addToHistory(q);
                            }}
                          >
                            <i className="fas fa-star"></i>
                            <span>{q}</span>
                            <button
                              className="unsave-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSavedSearch(q);
                              }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* History */}
                  {searchHistory.length > 0 && !paletteQuery.trim() && (
                    <div className="palette-section">
                      <div className="section-label">
                        <i className="fas fa-clock me-1"></i>Lịch sử tìm kiếm
                      </div>
                      <div className="palette-items">
                        {searchHistory.map((q, idx) => (
                          <div
                            key={idx}
                            className="palette-item"
                            onClick={() => {
                              handleSearch(q);
                            }}
                          >
                            <i className="fas fa-history"></i>
                            <span>{q}</span>
                            <button
                              className="save-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSavedSearch(q);
                              }}
                            >
                              <i className={`fas fa-star${savedSearches.includes(q) ? '' : '-o'}`}></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Results */}
                  {paletteQuery.trim() && searchResults.length > 0 && (
                    <div className="palette-section">
                      <div className="section-label">Kết quả ({searchResults.length})</div>
                      <div className="palette-items" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {searchResults.slice(0, 8).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="palette-result-item"
                            onClick={() => {
                              addToHistory(paletteQuery);
                              setShowPalette(false);
                            }}
                          >
                            {item.image && (
                              <img src={item.image} alt={item.name} className="result-thumb" />
                            )}
                            <div className="result-text">
                              <div className="result-name">{item.name}</div>
                              {item.price && <div className="result-meta">{item.price.replace(/[đ\s]/g, '')}đ</div>}
                            </div>
                            <button
                              className="save-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSavedSearch(paletteQuery);
                              }}
                            >
                              <i className={`fas fa-star${savedSearches.includes(paletteQuery) ? '' : '-o'}`}></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {paletteQuery.trim() && searchResults.length === 0 && (
                    <div className="palette-empty">
                      <i className="fas fa-search"></i>
                      <p>Không tìm thấy kết quả cho "{paletteQuery}"</p>
                    </div>
                  )}
                </div>
                
                <div className="palette-footer">
                  <span><kbd>Esc</kbd> để đóng</span>
                  <span><kbd>Enter</kbd> để lưu vào lịch sử</span>
                </div>
              </div>
            </div>
          )}

          {/* ========== AI CHAT BUTTON ========== */}
          <button
            className="btn btn-lg rounded-circle position-fixed shadow-lg"
            style={{ 
              bottom: fabOpen ? 320 : 130, 
              right: 16, 
              width: 56, 
              height: 56, 
              zIndex: 1050,
              transition: 'bottom 0.2s ease',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              border: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              cursor: 'pointer',
              outline: 'none'
            }}
            onClick={() => setShowAIChat(true)}
            onTouchStart={() => setShowAIChat(true)}
          >
            <i className="fas fa-robot fa-lg"></i>
          </button>

          {/* ========== AI CHAT FULLSCREEN (MOBILE) ========== */}
          {showAIChat && (
            <div className="ai-chat-mobile">
              <div className="chat-header">
                <button className="back-btn" onClick={() => setShowAIChat(false)}>
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div>
                  <strong>KTM AI Assistant</strong>
                  <div style={{fontSize: 11, opacity: 0.8}}>Hỏi về sản phẩm, giá cả...</div>
                </div>
              </div>
              
              <div className="chat-messages">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`mb-3 ${msg.role === 'user' ? 'd-flex justify-content-end' : ''}`}>
                    <div 
                      className={`p-3 rounded-3 position-relative ${msg.role === 'user' ? 'text-white' : 'bg-white border'}`}
                      style={{ 
                        maxWidth: '85%', 
                        whiteSpace: 'pre-wrap',
                        background: msg.role === 'user' ? 'linear-gradient(135deg, #667eea, #764ba2)' : undefined
                      }}
                    >
                      {msg.content}
                      
                      {/* Copy button for bot messages */}
                      {msg.role === 'assistant' && (
                        <button
                          className="btn btn-sm position-absolute"
                          style={{
                            top: 4,
                            right: 4,
                            padding: '2px 6px',
                            fontSize: 11,
                            background: copiedId === `chat-${i}` ? '#28a745' : 'rgba(0,0,0,0.1)',
                            border: 'none',
                            borderRadius: 4,
                            color: copiedId === `chat-${i}` ? '#fff' : '#666'
                          }}
                          onClick={() => {
                            window.KTM.clipboard.writeText(msg.content);
                            setCopiedId(`chat-${i}`);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                        >
                          <i className={`fas ${copiedId === `chat-${i}` ? 'fa-check' : 'fa-copy'}`}></i>
                        </button>
                      )}
                      
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 d-flex flex-wrap gap-2">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx} style={{width: 70}} className="text-center">
                              {att.image && (
                                <img 
                                  src={att.image} 
                                  className="rounded"
                                  style={{width: 70, height: 50, objectFit: 'cover', cursor: 'pointer'}}
                                  onClick={() => setPreviewImage({ url: att.image, name: att.name, price: att.price })}
                                />
                              )}
                              <div style={{fontSize: 9}} className="text-truncate">{att.name}</div>
                              {att.price && <div style={{fontSize: 10, color: '#dc3545', fontWeight: 600}}>{att.price.replace(/[đ\s]/g, '')}đ</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="mb-3">
                    <div className="bg-white border p-3 rounded-3 d-inline-block">
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Đang suy nghĩ...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}></div>
              </div>
              
              {/* Quick suggestions */}
              <div className="px-3 py-2 border-top d-flex gap-2 overflow-auto">
                {['Giá van 2 tay?', 'Combo rẻ nhất?', 'Freeship?', 'Van 3 tay?'].map(q => (
                  <button
                    key={q}
                    className="btn btn-sm btn-outline-secondary flex-shrink-0"
                    onClick={() => handleAIChat(q)}
                    disabled={aiLoading}
                    style={{whiteSpace: 'nowrap'}}
                  >
                    {q}
                  </button>
                ))}
              </div>
              
              <div className="chat-input-area">
                <form onSubmit={(e) => { e.preventDefault(); handleAIChat(aiInput); }} className="chat-input-wrap">
                  <input
                    ref={aiInputRef}
                    type="text"
                    className="chat-input"
                    placeholder="Nhập câu hỏi..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    disabled={aiLoading}
                  />
                  <button type="submit" className="send-btn" disabled={aiLoading || !aiInput.trim()}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========== IMAGE PREVIEW MODAL ========== */}
          {previewImage && (
            <div className="preview-modal" onClick={() => setPreviewImage(null)}>
              <div className="preview-header">
                <div></div>
                <button className="close-btn" onClick={() => setPreviewImage(null)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="preview-body" onClick={(e) => e.stopPropagation()}>
                <img src={previewImage.url} alt={previewImage.name} />
              </div>
              
              <div className="preview-footer" onClick={(e) => e.stopPropagation()}>
                <div className="name">{previewImage.name}</div>
                {previewImage.price && <div className="price">{previewImage.price.replace(/[đ\s]/g, '')}đ</div>}
                {previewImage.note && <div className="mb-2" style={{fontSize: 14, color: '#17a2b8'}}>{previewImage.note}</div>}
                
                <div className="action-btns">
                  <button 
                    className={copiedId === 'preview-img' ? 'btn-success text-white' : 'btn-outline-light text-white'}
                    style={{background: copiedId === 'preview-img' ? '#28a745' : 'rgba(255,255,255,0.2)'}}
                    onClick={() => copyImage(previewImage.url, 'preview')}
                  >
                    <i className={`fas ${copiedId === 'preview-img' ? 'fa-check' : 'fa-copy'}`}></i>
                    Copy ảnh
                  </button>
                  {previewImage.price && (
                    <button 
                      className={copiedId === 'preview-price' ? 'btn-success text-white' : 'btn-warning'}
                      onClick={() => copyText(previewImage.price.replace(/[đ\s]/g, ''), 'preview-price')}
                    >
                      <i className={`fas ${copiedId === 'preview-price' ? 'fa-check' : 'fa-tag'}`}></i>
                      Copy giá
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Product Modal for FAB */}
          <ProductModal
            show={showProductModal}
            product={editingProduct}
            categories={categories}
            onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
            onSave={handleSaveProduct}
          />

      {/* ========== FAB - FLOATING ACTION BUTTON ========== */}
          <div className={`fab-container mobile-only ${fabOpen ? 'open' : ''}`}>
            <div className="fab-actions">
              <button 
                className="fab-action product"
                onClick={() => { setFabOpen(false); setShowProductModal(true); setEditingProduct(null); }}
              >
                <i className="fas fa-box"></i>
                <span className="tooltip">Thêm sản phẩm</span>
              </button>
                  <button 
                    className="fab-action product"
                    onClick={() => { setFabOpen(false); onNavigate && onNavigate('orders', 'create'); }}
                  >
                    <i className="fas fa-receipt"></i>
                    <span className="tooltip">Tạo order nhanh</span>
                  </button>
            </div>
            <button 
              className={`fab-main ${fabOpen ? 'open' : ''}`}
              onClick={() => setFabOpen(!fabOpen)}
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>

          {/* ========== QUICK EDIT MODAL ========== */}
          {showQuickEdit && editingItem && (
            <div className="modal show d-block" style={{background: 'rgba(0,0,0,0.6)'}}>
              <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{borderRadius: 16, maxHeight: '90vh'}}>
                  <div className="modal-header" style={{background: 'linear-gradient(135deg, #ffc107, #ff9800)', border: 'none'}}>
                    <h6 className="modal-title fw-bold">
                      <i className="fas fa-pen me-2"></i>Sửa nhanh
                    </h6>
                    <button type="button" className="btn-close" onClick={() => setShowQuickEdit(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Tên sản phẩm</label>
                      <input
                        type="text"
                        className="form-control"
                        value={productForm.name}
                        onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Mã SP</label>
                        <input
                          type="text"
                          className="form-control"
                          value={productForm.code}
                          onChange={(e) => setProductForm({...productForm, code: e.target.value})}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Giá</label>
                        <input
                          type="text"
                          className="form-control"
                          value={productForm.price}
                          onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Hoa hồng (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={productForm.commission_percent}
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="5"
                        onChange={(e) => setProductForm({...productForm, commission_percent: e.target.value})}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Danh mục</label>
                      <select
                        className="form-select"
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {productCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Ghi chú (ưu đãi)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={productForm.note}
                        placeholder="VD: Free ship, Giảm 10%..."
                        onChange={(e) => setProductForm({...productForm, note: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowQuickEdit(false)}>
                      Hủy
                    </button>
                    <button type="button" className="btn btn-warning" onClick={handleSaveQuickEdit}>
                      <i className="fas fa-save me-1"></i>Lưu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

