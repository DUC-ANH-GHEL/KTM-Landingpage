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

// Smart local filter - phân tích kỹ từng keyword
function smartLocalFilter(query, products) {
  const lowerQuery = query.toLowerCase().trim();
  
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
    
    // Combine all searchable text
    const allText = `${name} ${folder} ${category} ${note}`;
    
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
    
    // FOLDER filter - phải match folder hoặc tên
    if (folderKeywordsFound.length > 0) {
      const hasFolder = folderKeywordsFound.some(kw => 
        folder.includes(kw) || name.includes(kw) || allText.includes(kw)
      );
      if (!hasFolder) {
        return false;
      }
    }
    
    // OTHER keywords - tất cả phải match (AND logic)
    if (otherKeywords.length > 0) {
      const allMatch = otherKeywords.every(kw => allText.includes(kw));
      if (!allMatch) {
        return false;
      }
    }
    
    return true;
  });

  return filtered.map(p => p.id);
}
