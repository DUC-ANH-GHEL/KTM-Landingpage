// api/ai-search.js - AI-powered semantic search
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, products } = req.body;

  if (!query || !products || !Array.isArray(products)) {
    return res.status(400).json({ error: 'query and products array are required' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // Always use smart local filter (more reliable)
  const matchedIds = smartLocalFilter(query, products);
  return res.status(200).json({ matchedIds, query, method: 'smart-filter' });
}

// Hàm bỏ dấu tiếng Việt
function removeVietnameseTones(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Levenshtein distance - tính độ khác biệt giữa 2 chuỗi
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Common Vietnamese typo patterns (Telex, VNI, lỗi chính tả phổ biến)
const TYPO_CORRECTIONS = {
  // Telex patterns
  'aa': 'â', 'aw': 'ă', 'ee': 'ê', 'oo': 'ô', 'ow': 'ơ', 'uw': 'ư',
  'dd': 'đ', 'w': 'ư',
  // Common typos
  'ngieng': 'nghiêng', 'ngheng': 'nghiêng', 'ngheeng': 'nghiêng',
  'giua': 'giữa', 'giu': 'giữ',
  'xylanh': 'xy lanh', 'xilanh': 'xy lanh',
  'ktm': 'ktm',
  'vanm': 'van', 'vna': 'van',
  'comob': 'combo', 'cmbo': 'combo',
  'tya': 'ty', 'tay': 'tay',
  // w/o tones typos
  'san pham': 'sản phẩm', 'sanpham': 'sản phẩm',
  'may cay': 'máy cày', 'maycay': 'máy cày',
};

// Fix typos trong query
function fixTypos(query) {
  let fixed = query.toLowerCase();
  
  // Apply known corrections
  Object.entries(TYPO_CORRECTIONS).forEach(([typo, correct]) => {
    fixed = fixed.replace(new RegExp(typo, 'gi'), correct);
  });
  
  return fixed;
}

// Fuzzy match - kiểm tra từ có gần giống không
function fuzzyMatch(word, target, maxDistance = 2) {
  // Exact match
  if (target.includes(word)) return true;
  
  // Normalize và check
  const normWord = removeVietnameseTones(word);
  const normTarget = removeVietnameseTones(target);
  if (normTarget.includes(normWord)) return true;
  
  // Levenshtein check cho từng từ trong target
  const targetWords = normTarget.split(/\s+/);
  for (const tw of targetWords) {
    if (tw.length >= 3 && normWord.length >= 3) {
      const distance = levenshteinDistance(normWord, tw);
      // Cho phép lỗi tùy theo độ dài từ
      const allowedDistance = Math.min(maxDistance, Math.floor(normWord.length / 3));
      if (distance <= allowedDistance) {
        return true;
      }
    }
  }
  
  return false;
}

// Smart local filter - phân tích kỹ từng keyword
function smartLocalFilter(query, products) {
  // Fix typos trước
  const fixedQuery = fixTypos(query);
  const lowerQuery = fixedQuery.toLowerCase().trim();
  const normalizedQuery = removeVietnameseTones(lowerQuery);
  
  console.log('Query processing:', { original: query, fixed: fixedQuery, normalized: normalizedQuery });
  
  // 1. Phân tích TYPE filter (ảnh/album, video, sản phẩm)
  // Dùng regex đơn giản hơn để match cả có dấu và không dấu
  let typeFilter = null;
  const albumKeywords = ['ảnh', 'anh', 'album', 'hình', 'hinh', 'photo', 'image', 'picture', 'pic'];
  const videoKeywords = ['video', 'clip', 'youtube'];
  const productKeywords = ['sản phẩm', 'san pham', 'product', 'sp'];
  
  // Check từng keyword
  for (const kw of albumKeywords) {
    if (lowerQuery.includes(kw)) {
      // Đảm bảo không phải là phần của từ khác (như "xylanh")
      const regex = new RegExp(`(^|\\s)${kw}($|\\s)`, 'i');
      if (regex.test(lowerQuery) || lowerQuery.endsWith(kw)) {
        typeFilter = 'album';
        break;
      }
    }
  }
  
  if (!typeFilter) {
    for (const kw of videoKeywords) {
      if (lowerQuery.includes(kw)) {
        typeFilter = 'video';
        break;
      }
    }
  }
  
  if (!typeFilter) {
    for (const kw of productKeywords) {
      if (lowerQuery.includes(kw)) {
        typeFilter = 'product';
        break;
      }
    }
  }
  
  // 2. Extract số tay (CHÍNH XÁC)
  const tayMatch = lowerQuery.match(/(\d+)\s*tay/);
  const tayNum = tayMatch ? tayMatch[1] : null;
  
  // 3. Extract số ty/xylanh (CHÍNH XÁC)
  const tyMatch = lowerQuery.match(/(\d+)\s*(ty|xi\s*lanh|xylanh)/);
  const tyNum = tyMatch ? tyMatch[1] : null;
  
  // 4. Extract folder/brand keywords (yanmar, kubota, etc.)
  const folderKeywordsFound = [];
  const folderPatterns = ['yanmar', 'kubota', 'iseki', 'ktm', 'máy cày', 'may cay'];
  folderPatterns.forEach(pattern => {
    if (lowerQuery.includes(pattern)) {
      folderKeywordsFound.push(pattern);
    }
  });
  
  // 5. Extract other meaningful keywords
  let cleanQuery = lowerQuery;
  
  // Remove type keywords
  albumKeywords.forEach(kw => {
    cleanQuery = cleanQuery.replace(new RegExp(`(^|\\s)${kw}($|\\s)`, 'gi'), ' ');
  });
  videoKeywords.forEach(kw => {
    cleanQuery = cleanQuery.replace(new RegExp(kw, 'gi'), '');
  });
  productKeywords.forEach(kw => {
    cleanQuery = cleanQuery.replace(new RegExp(kw, 'gi'), '');
  });
  
  // Remove số tay, số ty
  cleanQuery = cleanQuery
    .replace(/\d+\s*tay/g, '')
    .replace(/\d+\s*(ty|xi\s*lanh|xylanh)/g, '')
    .replace(/\b(van|combo)\b/g, ''); // Quá chung
  
  // Remove folder patterns
  folderPatterns.forEach(p => {
    cleanQuery = cleanQuery.replace(new RegExp(p, 'gi'), '');
  });
  
  const otherKeywords = cleanQuery
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .filter(w => !['và', 'hoặc', 'với', 'cho', 'của', 'cái', 'loại', 'tìm', 'kiếm'].includes(w));

  // DEBUG log
  console.log('Query analysis:', {
    original: query,
    typeFilter,
    tayNum,
    tyNum,
    folderKeywordsFound,
    otherKeywords
  });

  // 6. Filter products
  const filtered = products.filter(p => {
    const name = (p.name || '').toLowerCase();
    const folder = (p.folder || '').toLowerCase();
    const category = (p.category || '').toLowerCase();
    const type = (p._type || '').toLowerCase();
    const note = (p.note || '').toLowerCase();
    
    // Combine all searchable text (cả có dấu và không dấu)
    const allText = `${name} ${folder} ${category} ${note}`;
    const normalizedAllText = removeVietnameseTones(allText);
    const normalizedName = removeVietnameseTones(name);
    const normalizedFolder = removeVietnameseTones(folder);
    
    // TYPE filter - nếu user chỉ định loại
    if (typeFilter && type !== typeFilter) {
      return false;
    }
    
    // TAY filter - CHÍNH XÁC số tay
    if (tayNum) {
      const productTayMatch = name.match(/(\d+)\s*tay/);
      if (!productTayMatch || productTayMatch[1] !== tayNum) {
        return false;
      }
    }
    
    // TY filter - CHÍNH XÁC số ty/xylanh
    if (tyNum) {
      const productTyMatch = name.match(/(\d+)\s*(ty|xi\s*lanh|xylanh)/);
      if (!productTyMatch || productTyMatch[1] !== tyNum) {
        return false;
      }
    }
    
    // FOLDER filter - phải match folder hoặc tên (dùng fuzzy match)
    if (folderKeywordsFound.length > 0) {
      const hasFolder = folderKeywordsFound.some(kw => {
        return fuzzyMatch(kw, allText);
      });
      if (!hasFolder) {
        return false;
      }
    }
    
    // OTHER keywords - tất cả phải match (AND logic) - dùng fuzzy match
    if (otherKeywords.length > 0) {
      const allMatch = otherKeywords.every(kw => {
        return fuzzyMatch(kw, allText);
      });
      if (!allMatch) {
        return false;
      }
    }
    
    return true;
  });

  return filtered.map(p => p.id);
}
