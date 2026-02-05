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