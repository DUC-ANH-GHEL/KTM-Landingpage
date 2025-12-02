import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Data từ searchData.js
const SEARCH_PRODUCTS = [
  // ================== 3 TY XY LANH RIÊNG LẺ ==================
  {
    id: 'xylanh-giua',
    name: 'Xy lanh giữa',
    price: '1.950.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538306/2_sxq2wa.jpg',
    category: 'Ty xy lanh',
    note: 'Thêm dây là 2.150.000đ'
  },
  {
    id: 'xylanh-nghieng',
    name: 'Xy lanh nghiêng',
    price: '1.950.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/3_nxbqyo.jpg',
    category: 'Ty xy lanh',
    note: 'Thêm dây là 2.150.000đ'
  },
  {
    id: 'xylanh-ui',
    name: 'Xy lanh ủi',
    price: '2.200.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/4_rj8cv2.jpg',
    category: 'Ty xy lanh'
  },

  // ================== COMBO VAN 1 TAY ==================
  {
    id: 'combo-van1-2',
    name: 'Combo Van 1 tay + 1 xylanh nghiêng/giữa',
    price: '4.750.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1751807509/74.1_Combo_1_tay_xylanh_nghi%C3%AAng_thbmua.jpg',
    category: 'Combo Van 1 tay'
  },
  {
    id: 'combo-van1-3',
    name: 'Combo Van 1 tay + 1 xylanh nghiêng/giữa',
    price: '4.750.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762522/COMBO_VAN_1_TAY_1_TY_GI%E1%BB%AEA_KTM_ulsy1c.jpg',
    category: 'Combo Van 1 tay'
  },
  {
    id: 'combo-van1-1',
    name: 'Combo Van 1 tay + 1 xylanh ủi',
    price: '5.000.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1751807509/74_combo_van_1_tay_1_xylanh_%E1%BB%A7i_gvf1t1.jpg',
    category: 'Combo Van 1 tay'
  },

  // ================== COMBO VAN 2 TAY ==================
  {
    id: 'combo-van2-3',
    name: 'Combo van 2 tay 2 ty nghiêng giữa KTM',
    price: '7.300.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762120/combo_van_2_tay_2_ty_nghi%C3%AAng_gi%E1%BB%AFa_KTM_bwpf3o.jpg',
    category: 'Combo Van 2 tay'
  },
  {
    id: 'combo-van2-1',
    name: 'Combo van 2 tay 1 ty nghiêng ktm',
    price: '5.080.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762121/combo_van_2_tay_1_ty_nghi%C3%AAng_ktm_eumive.jpg',
    category: 'Combo Van 2 tay'
  },
  {
    id: 'combo-van2-2',
    name: 'Combo van 2 tay 1 ty giữa ktm',
    price: '5.080.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762402/combo_van_2_tay_1_ty_gi%E1%BB%AFa_KTM_e6ssao.jpg',
    category: 'Combo Van 2 tay'
  },

  // ================== COMBO VAN 3 TAY ==================
  {
    id: 'combo-van3-1',
    name: 'Combo Van 3 tay + 1 xylanh giữa',
    price: '5.550.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749300157/Combo_van_3_tay_xylanh_gi%E1%BB%AFa_mxdsth.jpg',
    category: 'Combo Van 3 tay'
  },
  {
    id: 'combo-van3-2',
    name: 'Combo Van 3 tay + 3 xylanh',
    price: '10.250.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749300461/combo_van_3_tay_3_xylanh_nghi%C3%AAng_gi%E1%BB%AFa_%E1%BB%A7i_mgppxh.jpg',
    category: 'Combo Van 3 tay'
  },
  {
    id: 'combo-van3-3',
    name: 'Combo Van 3 tay + 2 xylanh',
    price: '7.800.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749300324/Combo_Van_3_tay_2_xylanh_nghi%C3%AAng_gi%E1%BB%AFa_evihrt.jpg',
    category: 'Combo Van 3 tay'
  },

  // ================== COMBO VAN 4 TAY ==================
  {
    id: 'combo-van4-1',
    name: 'Combo Van 4 tay + 2 xylanh',
    price: '8.300.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749135217/Combo_van_4_tay_1_xylanh_nghi%C3%AAng_1_xylanh_gi%E1%BB%AFa_nh6gjh.jpg',
    category: 'Combo Van 4 tay'
  },
  {
    id: 'combo-van4-2',
    name: 'Combo van 4 tay 1 ty giữa ktm',
    price: '6.050.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762675/combo_van_4_tay_1_ty_gi%E1%BB%AFa_ktm_auo6xo.jpg',
    category: 'Combo Van 4 tay'
  },
  {
    id: 'combo-van4-3',
    name: 'Combo van 4 tay 1 ty nghiêng ktm',
    price: '6.050.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762677/combo_van_4_tay_1_ty_nghi%C3%AAng_ktm_eyk6fr.jpg',
    category: 'Combo Van 4 tay'
  },

  // ================== COMBO VAN 5 TAY ==================
  {
    id: 'combo-van5-1',
    name: 'Combo Van 5 tay + 2 xylanh',
    price: '8.800.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747537715/Combo_van_5_tay_2_xylanh_1_nghi%C3%AAng_1_gi%E1%BB%AFa_KTM_htd1au.jpg',
    category: 'Combo Van 5 tay'
  },
  {
    id: 'combo-van5-2',
    name: 'Combo Van 5 tay + 1 xylanh',
    price: '6.550.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747539250/Combo_van_5_tay_1_xylanh_nghi%C3%AAng_KTM_kv6irg.jpg',
    category: 'Combo Van 5 tay'
  },
  {
    id: 'combo-van5-3',
    name: 'Combo Van 5 tay + 1 xylanh',
    price: '6.550.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760762831/combo_van_5_tay_1_ty_gi%E1%BB%AFa_KTM_l74ame.jpg',
    category: 'Combo Van 5 tay'
  },

  // ================== TRANG GẠT THUỶ LỰC ==================
  {
    id: 'trang-62',
    name: 'Trang Trượt van 4 tay KTM 4 xylanh Lắp trên xới',
    code: 'KTM-62',
    price: '21.200.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749135668/trang_g%E1%BA%A1t_wleewb.jpg',
    category: 'Trang gạt'
  },
  {
    id: 'trang-63',
    name: 'Trang Gập Van tay KTM 4 xylanh Lắp trên xới',
    code: 'KTM-63',
    price: '23.200.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1749135668/trang_g%E1%BA%A1t_wleewb.jpg',
    category: 'Trang gạt'
  },

  // ================== PHỤ TÙNG ==================
  {
    id: 'spare-1',
    name: 'Bộ nối nhanh',
    code: 'SP-01',
    price: '400.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760870151/9-1_n%E1%BB%91i_nhanh_KTM_gsouip.jpg',
    category: 'Phụ kiện'
  },
  {
    id: 'spare-2',
    name: 'Van chống tụt hình vuông',
    code: 'SP-02',
    price: '630.000đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1760870364/24_Van_ch%E1%BB%91ng_t%E1%BB%A5t_lo%E1%BA%A1i_vu%C3%B4ng_KTM_sdnjcd.jpg',
    category: 'Phụ kiện'
  },
  {
    id: 'mat-bich',
    name: 'Mặt bích',
    price: '550.000 đ',
    category: 'Phụ kiện',
    note: 'có freeship',
  },
  {
    id: 'nhot-5l',
    name: 'Nhớt động cơ 5L',
    price: '590.000 đ',
    category: 'Phụ kiện',
    note: 'có freeship',
  },
  {
    id: 'nhot-20l',
    name: 'Nhớt động cơ 20L',
    price: '2.140.000 đ',
    category: 'Phụ kiện',
    note: 'có freeship',
  },

  // ================== Van tay ===================
  {
    id: 'van-1',
    name: 'Van 1 tay',
    code: 'V-01',
    price: '1.900.000 đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/van1_sjzm7p.png',
    category: 'Van điều khiển'
  },
  {
    id: 'van-2',
    name: 'Van 2 tay',
    code: 'V-02',
    price: '2.200.000 đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538310/van2_hogp0r.png',
    category: 'Van điều khiển'
  },
  {
    id: 'van-3',
    name: 'Van 3 tay',
    code: 'V-03',
    price: '2.700.000 đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/van3_qettd5.png',
    category: 'Van điều khiển'
  },
  {
    id: 'van-4',
    name: 'Van 4 tay',
    code: 'V-04',
    price: '3.200.000 đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538311/van4_bxu8ry.png',
    category: 'Van điều khiển'
  },
  {
    id: 'van-5',
    name: 'Van 5 tay',
    code: 'V-05',
    price: '3.600.000 đ',
    image: 'https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538312/van5_pjllmw.png',
    category: 'Van điều khiển'
  },
  {
    id: 'van-6',
    name: 'Van 6 tay',
    code: 'V-06',
    price: '4.100.000 đ',
    image: 'https://img.icons8.com/color/48/settings.png',
    category: 'Van điều khiển'
  }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to migrate data.' });
  }

  try {
    // 1. Tạo table products nếu chưa có
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        code VARCHAR(50),
        price VARCHAR(50),
        image TEXT,
        category VARCHAR(100),
        note TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 2. Clear existing data (optional - uncomment if want to reset)
    // await sql`DELETE FROM products`;

    // 3. Insert all products
    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (let i = 0; i < SEARCH_PRODUCTS.length; i++) {
      const p = SEARCH_PRODUCTS[i];
      try {
        // Upsert - insert or update if exists
        await sql`
          INSERT INTO products (id, name, code, price, image, category, note, sort_order)
          VALUES (${p.id}, ${p.name}, ${p.code || null}, ${p.price || null}, ${p.image || null}, ${p.category || null}, ${p.note || null}, ${i})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            code = EXCLUDED.code,
            price = EXCLUDED.price,
            image = EXCLUDED.image,
            category = EXCLUDED.category,
            note = EXCLUDED.note,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW()
        `;
        inserted++;
      } catch (err) {
        errors.push({ id: p.id, error: err.message });
      }
    }

    // 4. Get total count
    const countResult = await sql`SELECT COUNT(*) as total FROM products`;
    
    return res.status(200).json({
      success: true,
      message: `Migration completed!`,
      stats: {
        processed: SEARCH_PRODUCTS.length,
        inserted: inserted,
        errors: errors.length,
        totalInDB: countResult[0].total
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: error.message });
  }
}
