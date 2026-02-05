import{neon as ie}from"@neondatabase/serverless";import Nt from"crypto";const r=ie(process.env.DATABASE_URL);let Ut=!1,Rt=0;const ae=10*60*1e3;let gt=0;const ue=10*60*1e3,ot=3;function St(t){return t?String(t).replace(/[^0-9]/g,""):""}function Tt(t,e=!1){if(t==null)return e;const n=String(t).trim().toLowerCase();return n==="1"||n==="true"||n==="yes"||n==="y"||n==="on"?!0:n==="0"||n==="false"||n==="no"||n==="n"||n==="off"?!1:e}function vt(t,e=null){const n=Number(t);return Number.isFinite(n)?Math.trunc(n):e}function Wt(t){const n=String(t??"").trim().match(/^([0-9]{4})-([0-9]{2})$/);if(!n)return null;const m=Number(n[1]),c=Number(n[2]);if(!Number.isFinite(m)||!Number.isFinite(c)||c<1||c>12)return null;const s=String(c).padStart(2,"0");return`${m}-${s}-01`}function Ht(t){if(t==null||t==="")return 0;const e=String(t).replace(/[^0-9]/g,"");return e?Number(e):0}function de(t){if(!t)return null;const e=String(t),n=e.toLowerCase();if(n.includes("freeship")||n.includes("free ship")||n.includes("mi\u1EC5n ph\xED ship")||n.includes("mien phi ship")||n.includes("mi\u1EC5n ph\xED v\u1EADn chuy\u1EC3n")||n.includes("mien phi van chuyen"))return 0;const m=e.match(/(?:ship|vận\s*chuyển|van\s*chuyen|\bvc\b)\s*[:=\-]?\s*([0-9][0-9\.,\s]*)(?:\s*(k|nghìn|nghin|tr|triệu|trieu|m))?/i);if(!m)return null;const c=String(m[1]||"").replace(/[^0-9]/g,"");if(!c)return null;let s=Number(c);const p=String(m[2]||"").toLowerCase();return p==="k"||p.startsWith("ngh")?s*=1e3:(p==="tr"||p.startsWith("tri")||p==="m")&&(s*=1e6),Number.isFinite(s)?s:null}const ce=1.64;function me(t){const e=typeof t=="number"?t:parseFloat(String(t??"").trim());return Number.isFinite(e)?Math.max(0,Math.min(100,e)):ce}function Ee(t){const e=String(t??"").trim().toLowerCase();return e==="cancelled"?"canceled":e}async function pe(){if(!Ut){await r`
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(36) PRIMARY KEY,
      name TEXT,
      phone VARCHAR(30) UNIQUE NOT NULL,
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `,await r`CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone)`;try{await r`CREATE EXTENSION IF NOT EXISTS pg_trgm`}catch{}try{await r`CREATE INDEX IF NOT EXISTS customers_name_trgm_idx ON customers USING gin (name gin_trgm_ops)`}catch{}try{await r`CREATE INDEX IF NOT EXISTS customers_phone_trgm_idx ON customers USING gin (phone gin_trgm_ops)`}catch{}await r`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(36)`,await r`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await r`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP`,await r`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at)`,await r`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)`,await r`CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON orders(status, created_at)`,await r`CREATE INDEX IF NOT EXISTS orders_status_updated_at_idx ON orders(status, status_updated_at)`,await r`CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id)`,await r`CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(phone)`,await r`CREATE INDEX IF NOT EXISTS orders_customer_name_idx ON orders(customer_name)`;try{await r`CREATE INDEX IF NOT EXISTS orders_phone_trgm_idx ON orders USING gin (phone gin_trgm_ops)`}catch{}try{await r`CREATE INDEX IF NOT EXISTS orders_customer_name_trgm_idx ON orders USING gin (customer_name gin_trgm_ops)`}catch{}await r`ALTER TABLE orders ADD COLUMN IF NOT EXISTS adjustment_amount INTEGER DEFAULT 0`,await r`ALTER TABLE orders ADD COLUMN IF NOT EXISTS adjustment_note TEXT`,await r`ALTER TABLE orders ADD COLUMN IF NOT EXISTS note TEXT`,await r`ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_order_id VARCHAR(64)`,await r`ALTER TABLE orders ADD COLUMN IF NOT EXISTS split_seq INTEGER DEFAULT 0`,await r`CREATE INDEX IF NOT EXISTS orders_parent_order_id_idx ON orders(parent_order_id)`,await r`
    CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER,
      variant TEXT,
      variant_json JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `,await r`CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)`,await r`CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items(product_id)`,await r`CREATE INDEX IF NOT EXISTS order_items_created_at_idx ON order_items(created_at)`,await r`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price INTEGER`,await r`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant TEXT`,await r`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_json JSONB`;try{await r`ALTER TABLE order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(id)
      ON DELETE CASCADE
    `}catch{}for(const t of["customer_name","phone","address"])try{await r(`ALTER TABLE orders ALTER COLUMN ${t} DROP NOT NULL`)}catch{}try{await r`ALTER TABLE orders
      ADD CONSTRAINT orders_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id)
      ON DELETE SET NULL
    `}catch{}Ut=!0}}async function Xt(){const t=Date.now();Rt&&t-Rt<ae||(Rt=t,await r`
    UPDATE orders
    SET status = 'done', status_updated_at = NOW(), updated_at = NOW()
    WHERE status = 'pending'
      AND created_at IS NOT NULL
      AND created_at <= (NOW() - INTERVAL '20 days')
  `,await r`
    UPDATE orders
    SET status = 'done', status_updated_at = NOW(), updated_at = NOW()
    WHERE status = 'processing'
      AND COALESCE(status_updated_at, updated_at, created_at) IS NOT NULL
      AND COALESCE(status_updated_at, updated_at, created_at) <= (NOW() - INTERVAL '7 days')
  `)}async function _e(){const t=Date.now();gt&&t-gt<ue||(gt=t,await r`
    UPDATE orders
    SET
      status = 'canceled',
      status_updated_at = NOW(),
      updated_at = NOW(),
      note = (
        CASE
          WHEN COALESCE(note, '') = '' THEN 'AUTO: Đơn nháp quá hạn → chuyển sang Hủy'
          ELSE note || E'\n' || 'AUTO: Đơn nháp quá hạn → chuyển sang Hủy'
        END
      )
    WHERE status = 'draft'
      AND created_at IS NOT NULL
      AND created_at <= (NOW() - ((${ot}::int) * INTERVAL '1 day'))
  `)}function xt(t,e,n){if(Array.isArray(t)&&t.length){const m=t.map(c=>({product_id:c?.product_id,quantity:Number(c?.quantity??1),unit_price:(()=>{const s=c?.unit_price??c?.unitPrice,p=s==null||s===""?NaN:Number(s);return Number.isFinite(p)?Math.max(0,Math.trunc(p)):null})(),variant:(()=>{const s=c?.variant,p=s!=null?String(s).trim():"";return p?p.slice(0,200):null})(),variant_json:(()=>{let s=c?.variant_json??c?.variantJson;if(s==null||s==="")return null;if(typeof s=="string"){const p=s.trim();if(!p)return null;try{s=JSON.parse(p)}catch{return null}}return!s||typeof s!="object"?null:s})()})).filter(c=>c.product_id&&Number.isFinite(c.quantity)&&c.quantity>0);if(m.length)return m}if(e){const m=Number(n??1);return[{product_id:e,quantity:Number.isFinite(m)&&m>0?m:1}]}return[]}function Ct(t){const e=Array.isArray(t.items)?t.items:[];if(e.length)return{...t,items:e};if(!t.product_id)return{...t,items:[]};const n=Number(t.quantity??1),m={id:null,product_id:t.product_id,quantity:Number.isFinite(n)&&n>0?n:1,product_name:t.product_name||null,product_price:t.product_price||null,product_code:t.product_code||null,product_note:t.product_note||null,unit_price:null,variant:null,variant_json:null};return{...t,items:[m]}}async function Pt({name:t,phone:e,address:n}){const m=St(e);if(!m)throw new Error("Phone is required");const c=await r`
    SELECT id, name, phone, address, created_at, updated_at
    FROM customers
    WHERE phone = ${m}
    LIMIT 1
  `;if(c.length){const M=c[0],et=t??M.name,A=n??M.address;return await r`
      UPDATE customers
      SET name = ${et}, address = ${A}, updated_at = NOW()
      WHERE id = ${M.id}
    `,{...M,name:et,address:A,phone:m}}const s=Nt.randomUUID();return(await r`
    INSERT INTO customers (id, name, phone, address)
    VALUES (${s}, ${t||null}, ${m}, ${n||null})
    RETURNING *
  `)[0]}async function le(t,e){if(e.setHeader("Access-Control-Allow-Origin","*"),e.setHeader("Access-Control-Allow-Methods","GET, POST, PUT, DELETE, OPTIONS"),e.setHeader("Access-Control-Allow-Headers","Content-Type"),t.method==="OPTIONS")return e.status(200).end();const n=t.query.id||t.body?.id,m=n!=null?String(n):null,c=t.query.resource;try{const s=Tt(t.query?.debug,!1),p=s?Date.now():0;await pe();const M=s?Date.now():0;await _e();const et=s?Date.now():0;if(c==="customers"){if(t.method==="GET"){const A=St(t.query.phone);if(!A)return e.status(400).json({error:"phone is required"});const f=await r`
          SELECT id, name, phone, address, created_at, updated_at
          FROM customers
          WHERE phone = ${A}
          LIMIT 1
        `;if(f.length)return e.status(200).json({exists:!0,customer:f[0]});const C=await r`
          SELECT
            COALESCE(o.customer_name, '') AS customer_name,
            COALESCE(o.address, '') AS address
          FROM orders o
          WHERE regexp_replace(COALESCE(o.phone, ''), '[^0-9]', '', 'g') = ${A}
          ORDER BY o.created_at DESC
          LIMIT 1
        `;if(!C.length)return e.status(200).json({exists:!1});const v={name:C[0].customer_name||null,phone:A,address:C[0].address||null};try{const O=Nt.randomUUID(),h=await r`
            INSERT INTO customers (id, name, phone, address)
            VALUES (${O}, ${v.name}, ${v.phone}, ${v.address})
            RETURNING *
          `;return e.status(200).json({exists:!0,customer:h[0]})}catch{const O=await r`
            SELECT id, name, phone, address, created_at, updated_at
            FROM customers
            WHERE phone = ${A}
            LIMIT 1
          `;return O.length?e.status(200).json({exists:!0,customer:O[0]}):e.status(200).json({exists:!1})}}return e.status(405).json({error:"Method not allowed"})}if(t.method==="GET"){let A=null;if(s){const i=Date.now();await Xt(),A=Date.now()-i}else await Xt();if(c==="stats"){const i=String(t.query.month??"").trim(),d=Wt(i);if(!d)return e.status(400).json({error:"month is required (YYYY-MM)"});const J=me(t.query.ship_percent??t.query.shipPercent),mt=Tt(t.query.meta,!1);let H=[];try{H=await r`SELECT id, name, code, price, note, commission_percent, variants FROM products`}catch{H=[]}const X=new Map;for(const o of Array.isArray(H)?H:[]){const a=String(o?.id??"").trim();a&&X.set(a,o)}const Et=o=>(Array.isArray(o)?o:[]).map(y=>{const q=String(y?.name||"").trim();if(!q)return null;const U=(Array.isArray(y?.options)?y.options:[]).map(L=>{const R=String(L?.label||"").trim();if(!R)return null;const l=L?.price,g=l==null||l===""?NaN:typeof l=="number"?l:typeof l=="string"?Ht(l):Number(l),P=Number.isFinite(g)?Math.trunc(g):null,B=L?.price_delta??L?.priceDelta??null,w=Number(B),K=Number.isFinite(w)?Math.trunc(w):0;return{label:R,price:P,price_delta:K}}).filter(Boolean);return{name:q,options:U}}).filter(Boolean),ut=o=>{const a=String(o??"").trim();return a&&X.get(a)||null},Bt=o=>{const a=o?.unit_price??o?.unitPrice,y=a==null||a===""?NaN:Number(a);if(Number.isFinite(y))return Math.max(0,Math.trunc(y));const q=String(o?.product_id||"").trim(),U=ut(q),L=Ht(U?.price),R=o?.variant_json??o?.variantJson,l=R&&typeof R=="object"?R:null;if(!l)return L;const g=Et(U?.variants);if(!g.length)return L;let P=L;for(const B of g){const w=String(B?.name||"").trim(),K=String(l?.[w]||"").trim();if(!w||!K)continue;const nt=(Array.isArray(B.options)?B.options:[]).find(ct=>String(ct?.label||"").trim()===K);if(!nt)continue;if(Number.isFinite(Number(nt.price))){P=Math.max(0,Math.trunc(Number(nt.price)));continue}const dt=Number(nt.price_delta);Number.isFinite(dt)&&(P+=Math.trunc(dt))}return P},At=5,Dt=new Map((Array.isArray(H)?H:[]).map(o=>{const a=o?.commission_percent??o?.commissionPercent,y=Number(a),q=Number.isFinite(y)?Math.max(0,Math.min(100,y)):At;return[String(o?.id),q]})),Yt=o=>o.customer_id||o.phone||"unknown",Vt=o=>{const a=Array.isArray(o)?o:[];let y=!1,q=0;for(const U of a){const L=String(U?.product_id||"").trim(),R=ut(L),l=U?.product_note??R?.note??null,g=de(l);g!=null&&(y=!0,g>q&&(q=g))}return{found:y,fee:q}},Gt=s?Date.now():0,Ft=await r(`
          SELECT
            o.id,
            o.parent_order_id,
            o.split_seq,
            o.product_id,
            o.quantity,
            o.status,
            o.created_at,
            o.customer_id,
            o.adjustment_amount,
            o.adjustment_note,
            o.note,
            p0.name AS product_name,
            p0.price AS product_price,
            p0.code AS product_code,
            p0.note AS product_note,
            COALESCE(c.name, o.customer_name) AS customer_name,
            COALESCE(c.phone, o.phone) AS phone,
            COALESCE(c.address, o.address) AS address,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'variant', oi.variant,
                  'variant_json', oi.variant_json
                )
              ) FILTER (WHERE oi.id IS NOT NULL),
              '[]'::json
            ) AS items,
            COALESCE(SUM(oi.quantity) FILTER (WHERE oi.id IS NOT NULL), o.quantity, 0) AS total_quantity
          FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
          LEFT JOIN products p0 ON p0.id = o.product_id
          LEFT JOIN order_items oi ON oi.order_id = (o.id::text)
          WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')
          GROUP BY o.id, c.id, p0.id
          ORDER BY o.created_at DESC
        `,[d]),wt=s?Date.now():0,$t=(Array.isArray(Ft)?Ft:[]).map(Ct),x={draft:0,pending:0,processing:0,done:0,paid:0,canceled:0,other:0};let rt=0,ht=0,Ot=0,ft=0,Jt=0,Mt=0,jt=0,It=0;const yt=new Map,pt=new Map,Lt=new Map;for(const o of $t){const a=Ee(o?.status),U=a==="canceled"||a==="draft",L=Array.isArray(o?.items)?o.items:[];let R=0,l=0,g=0;for(const z of L){const $=Number(z?.quantity||0)||0,Z=Bt(z),tt=$*Z,Y=String(z?.product_id||""),oe=Dt.has(Y)?Dt.get(Y):At,se=(Number(oe)||0)/100;if(R+=$,l+=tt,g+=tt*se,!U){const _t=z?.product_id||"unknown",bt=ut(_t),lt=yt.get(_t)||{product_id:_t,product_name:bt?.name||"\u2014",product_code:bt?.code||"",orders:0,quantity:0,revenue:0};lt.orders+=1,lt.quantity+=$,lt.revenue+=tt,yt.set(_t,lt)}}const P=Vt(L),B=Number(o?.adjustment_amount??0)||0,w=l+(P.found?P.fee:0)+B,K=l+B,nt=!P.found&&J>0&&l>0?l*J/100:0,dt=l>0?g/l:At/100,ct=g+B*dt-nt*dt,ne=a==="done"||a==="paid";if(a==="draft"?x.draft+=1:a==="pending"?x.pending+=1:a==="processing"?x.processing+=1:a==="canceled"?x.canceled+=1:a==="paid"?(x.paid+=1,x.done+=1,ft+=w,Mt+=K,It+=ct):a==="done"?(x.done+=1,ft+=w,Mt+=K,It+=ct):x.other+=1,!U){rt+=1,ht+=R,Ot+=w,Jt+=K,jt+=ct;const z=Yt(o),$=pt.get(z)||{key:z,customer_name:o.customer_name||"",phone:o.phone||"",orders:0,quantity:0,revenue:0};$.orders+=1,$.quantity+=R,$.revenue+=w,!$.customer_name&&o.customer_name&&($.customer_name=o.customer_name),!$.phone&&o.phone&&($.phone=o.phone),pt.set(z,$);const Z=o.created_at?new Date(o.created_at):null;if(Z&&!Number.isNaN(Z.getTime())){const tt=`${Z.getFullYear()}-${String(Z.getMonth()+1).padStart(2,"0")}-${String(Z.getDate()).padStart(2,"0")}`,Y=Lt.get(tt)||{day:tt,orders:0,quantity:0,revenue:0,doneOrders:0,doneRevenue:0};Y.orders+=1,Y.quantity+=R,Y.revenue+=w,ne&&(Y.doneOrders+=1,Y.doneRevenue+=w),Lt.set(tt,Y)}}}const Kt=Array.from(yt.values()).sort((o,a)=>a.revenue-o.revenue),zt=Array.from(pt.values()).sort((o,a)=>a.revenue-o.revenue),kt=Array.from(Lt.values()).sort((o,a)=>o.day.localeCompare(a.day)),Qt=pt.size,Zt=rt?Math.round(Ot/rt):0,te=rt?ht/rt:0,ee=Math.round(It),re=Math.round(jt),qt={statusCounts:x,activeOrders:rt,totalQty:ht,totalRevenue:Ot,doneRevenue:ft,tempCommission:ee,tempCommissionAll:re,products:Kt,customers:zt,days:kt,uniqueCustomers:Qt,avgOrderValue:Zt,avgQtyPerOrder:te};return mt?e.status(200).json({stats:qt,meta:{month:i,ship_percent:J,ordersCount:$t.length,...s?{timingsMs:{schema:M-p,cleanup:et-M,autoAdvance:A,query:wt-Gt,total:wt-p}}:{}}}):e.status(200).json(qt)}if(n){const d=await r(`
          SELECT
            o.id,
            o.parent_order_id,
            o.split_seq,
            o.product_id,
            o.quantity,
            o.status,
            o.created_at,
            o.customer_id,
            o.adjustment_amount,
            o.adjustment_note,
            o.note,
            p0.name AS product_name,
            p0.price AS product_price,
            p0.code AS product_code,
            p0.note AS product_note,
            COALESCE(c.name, o.customer_name) AS customer_name,
            COALESCE(c.phone, o.phone) AS phone,
            COALESCE(c.address, o.address) AS address,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'variant', oi.variant,
                  'variant_json', oi.variant_json
                )
              ) FILTER (WHERE oi.id IS NOT NULL),
              '[]'::json
            ) AS items,
            COALESCE(SUM(oi.quantity) FILTER (WHERE oi.id IS NOT NULL), o.quantity, 0) AS total_quantity
          FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
          LEFT JOIN products p0 ON p0.id = o.product_id
          LEFT JOIN order_items oi ON oi.order_id = (o.id::text)
          WHERE o.id = $1
          GROUP BY o.id, c.id, p0.id
        `,[n]);return d.length?e.status(200).json(Ct(d[0])):e.status(404).json({error:"Order not found"})}const{month:f}=t.query,C=f?Wt(f):null,v=t.query.search??t.query.q??"",O=String(v??"").trim(),h=O.replace(/[^0-9]+/g,""),st=Tt(t.query.includeItems??t.query.items??t.query.include_items,!0),j=Tt(t.query.meta,!1),u=vt(t.query.limit,null),N=Math.max(0,vt(t.query.offset,0)??0),W=s&&j,k=String(t.query.overdue||"").trim()==="1"||String(t.query.overdue||"").trim().toLowerCase()==="true",V=String(t.query.draftExpiring||t.query.draft_expiring||"").trim()==="1"||String(t.query.draftExpiring||t.query.draft_expiring||"").trim().toLowerCase()==="true",it=t.query.days??t.query.overdueDays??3;let I=Number(it);(!Number.isFinite(I)||I<0)&&(I=3),I=Math.trunc(I);const Q=t.query.remainingDays??t.query.remaining_days??3;let S=Number(Q);(!Number.isFinite(S)||S<0)&&(S=3),S=Math.trunc(S),S>ot&&(S=ot);const G=Math.max(0,ot-S);let _=`
        SELECT
          o.id,
          o.parent_order_id,
          o.split_seq,
          o.product_id,
          o.quantity,
          o.status,
          o.created_at,
          o.customer_id,
          o.adjustment_amount,
          o.adjustment_note,
          o.note,
          p0.name AS product_name,
          p0.price AS product_price,
          p0.code AS product_code,
          p0.note AS product_note,
          COALESCE(c.name, o.customer_name) AS customer_name,
          COALESCE(c.phone, o.phone) AS phone,
          COALESCE(c.address, o.address) AS address,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'variant', oi.variant,
                'variant_json', oi.variant_json
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) AS items,
          COALESCE(SUM(oi.quantity) FILTER (WHERE oi.id IS NOT NULL), o.quantity, 0) AS total_quantity
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN products p0 ON p0.id = o.product_id
        LEFT JOIN order_items oi ON oi.order_id = (o.id::text)
      `;const E=[];if(O?(_+=" WHERE (",_+=" (c.name ILIKE $1 OR o.customer_name ILIKE $1)",E.push(`%${O}%`),h&&(h.length>=9&&(_+=` OR (c.phone = $${E.length+1} OR o.phone = $${E.length+1})`,E.push(h)),_+=` OR (c.phone LIKE $${E.length+1} OR o.phone LIKE $${E.length+1})`,E.push(`%${h}%`)),_+=" )"):V?(_+=" WHERE o.status = 'draft' AND o.created_at IS NOT NULL",_+=" AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))",E.push(ot),G>0&&(_+=" AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))",E.push(G))):k?(_+=" WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))",E.push(I)):C?(_+=" WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')",E.push(C)):f&&(_+=" WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1",E.push(f)),_+=" GROUP BY o.id, c.id, p0.id ORDER BY o.created_at DESC",Number.isFinite(u)&&u>0){const i=j?u+1:u;_+=` LIMIT $${E.length+1}`,E.push(i),N>0&&(_+=` OFFSET $${E.length+1}`,E.push(N))}else N>0&&(_+=` OFFSET $${E.length+1}`,E.push(N));if(!st){let i=`
          SELECT
            o.id,
            o.parent_order_id,
            o.split_seq,
            o.product_id,
            o.quantity,
            o.status,
            o.created_at,
            o.customer_id,
            o.adjustment_amount,
            o.adjustment_note,
            o.note,
            p0.name AS product_name,
            p0.price AS product_price,
            p0.code AS product_code,
            p0.note AS product_note,
            COALESCE(c.name, o.customer_name) AS customer_name,
            COALESCE(c.phone, o.phone) AS phone,
            COALESCE(c.address, o.address) AS address,
            '[]'::json AS items,
            COALESCE(
              (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = (o.id::text)),
              o.quantity,
              0
            ) AS total_quantity
          FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
          LEFT JOIN products p0 ON p0.id = o.product_id
        `;const d=[];if(O?(i+=" WHERE (",i+=" (c.name ILIKE $1 OR o.customer_name ILIKE $1)",d.push(`%${O}%`),h&&(h.length>=9&&(i+=` OR (c.phone = $${d.length+1} OR o.phone = $${d.length+1})`,d.push(h)),i+=` OR (c.phone LIKE $${d.length+1} OR o.phone LIKE $${d.length+1})`,d.push(`%${h}%`)),i+=" )"):V?(i+=" WHERE o.status = 'draft' AND o.created_at IS NOT NULL",i+=" AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))",d.push(ot),G>0&&(i+=" AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))",d.push(G))):k?(i+=" WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))",d.push(I)):C?(i+=" WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')",d.push(C)):f&&(i+=" WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1",d.push(f)),i+=" ORDER BY o.created_at DESC",Number.isFinite(u)&&u>0){const ut=j?u+1:u;i+=` LIMIT $${d.length+1}`,d.push(ut),N>0&&(i+=` OFFSET $${d.length+1}`,d.push(N))}else N>0&&(i+=` OFFSET $${d.length+1}`,d.push(N));const J=s?Date.now():0,mt=await r(i,d),H=s?Date.now():0;let X=Array.isArray(mt)?mt:[],Et=!1;return j&&Number.isFinite(u)&&u>0&&X.length>u&&(Et=!0,X=X.slice(0,u)),j?e.status(200).json({orders:X,meta:{includeItems:!1,limit:Number.isFinite(u)&&u>0?u:null,offset:N,count:X.length,hasMore:Et,...W?{timingsMs:{schema:M-p,cleanup:et-M,autoAdvance:A,query:H-J,total:H-p}}:{}}}):e.status(200).json(X)}const D=s?Date.now():0,b=await r(_,E),at=s?Date.now():0;let F=(Array.isArray(b)?b:[]).map(Ct),T=!1;return j&&Number.isFinite(u)&&u>0&&F.length>u&&(T=!0,F=F.slice(0,u)),j?e.status(200).json({orders:F,meta:{includeItems:!0,limit:Number.isFinite(u)&&u>0?u:null,offset:N,count:F.length,hasMore:T,...W?{timingsMs:{schema:M-p,cleanup:et-M,autoAdvance:A,query:at-D,total:at-p}}:{}}}):e.status(200).json(F)}if(t.method==="POST"){if(n)return e.status(400).json({error:"Use /api/orders for creating orders (no id in URL)"});const{customer_name:A,phone:f,address:C,product_id:v,quantity:O,status:h,items:st,adjustment_amount:j,adjustment_note:u,note:N,parent_order_id:W,split_seq:k}=t.body,V=St(f);if(!V)return e.status(400).json({error:"phone is required"});const it=await Pt({name:A,phone:V,address:C}),I=xt(st,v,O);if(!I.length)return e.status(400).json({error:"items is required"});const Q=I[0],S=Number(j),G=Number.isFinite(S)?Math.trunc(S):0,_=u!=null&&String(u).trim()?String(u).trim():null,E=N!=null&&String(N).trim()?String(N).trim():null;let D=W!=null&&String(W).trim()?String(W).trim():null,b=0;if(!D){const i=Number(k);Number.isFinite(i)&&Math.trunc(i)===1&&(b=1)}if(D){if(!(await r`SELECT id, split_seq FROM orders WHERE id = ${D} LIMIT 1`).length)return e.status(400).json({error:"parent_order_id not found"});await r`
          UPDATE orders
          SET split_seq = 1
          WHERE id = ${D} AND (split_seq IS NULL OR split_seq = 0)
        `;const d=await r`
          SELECT (GREATEST(COALESCE(MAX(split_seq), 0), 1) + 1) AS next_seq
          FROM orders
          WHERE id = ${D} OR parent_order_id = ${D}
        `,J=Number(d?.[0]?.next_seq??2);b=Number.isFinite(J)?Math.trunc(J):2,b<2&&(b=2)}const F=(await r`
        INSERT INTO orders (customer_id, parent_order_id, split_seq, product_id, quantity, status, status_updated_at, adjustment_amount, adjustment_note, note)
        VALUES (${it.id}, ${D}, ${b}, ${Q.product_id}, ${Q.quantity}, ${h}, NOW(), ${G}, ${_}, ${E})
        RETURNING id
      `)?.[0]?.id;if(F==null)return e.status(500).json({error:"Failed to create order"});const T=String(F);for(const i of I){const d=i.variant_json!=null?JSON.stringify(i.variant_json):null;await r`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, variant, variant_json)
          VALUES (${Nt.randomUUID()}, ${T}, ${i.product_id}, ${i.quantity}, ${i.unit_price}, ${i.variant}, ${d}::jsonb)
        `}return e.status(201).json({success:!0,id:F})}if(t.method==="PUT"){if(!n)return e.status(400).json({error:"Order ID is required"});const{customer_name:A,phone:f,address:C,product_id:v,quantity:O,status:h,items:st,adjustment_amount:j,adjustment_note:u,note:N}=t.body,W=St(f);if(!W)return e.status(400).json({error:"phone is required"});const k=await r`SELECT parent_order_id, split_seq, status FROM orders WHERE id = ${n} LIMIT 1`;if(!k.length)return e.status(404).json({error:"Order not found"});const V=k[0],it=Object.prototype.hasOwnProperty.call(t.body||{},"parent_order_id"),I=Object.prototype.hasOwnProperty.call(t.body||{},"split_seq");let Q=V.parent_order_id??null;if(it){const T=t.body.parent_order_id;Q=T!=null&&String(T).trim()?String(T).trim():null}let S=Number(V.split_seq??0);if(Number.isFinite(S)||(S=0),S=Math.trunc(S),I){const T=Number(t.body.split_seq);S=Number.isFinite(T)?Math.max(0,Math.trunc(T)):0}const G=await Pt({name:A,phone:W,address:C}),_=xt(st,v,O);if(!_.length)return e.status(400).json({error:"items is required"});const E=_[0],D=Number(j),b=Number.isFinite(D)?Math.trunc(D):0,at=u!=null&&String(u).trim()?String(u).trim():null,F=N!=null&&String(N).trim()?String(N).trim():null;await r`
        UPDATE orders SET
          customer_id = ${G.id},
          parent_order_id = ${Q},
          split_seq = ${S},
          product_id = ${E.product_id},
          quantity = ${E.quantity},
          status = ${h},
          status_updated_at = CASE WHEN status IS DISTINCT FROM ${h} THEN NOW() ELSE status_updated_at END,
          adjustment_amount = ${b},
          adjustment_note = ${at},
          note = ${F},
          updated_at = NOW()
        WHERE id = ${n}
      `,await r`DELETE FROM order_items WHERE order_id = ${m}`;for(const T of _){const i=T.variant_json!=null?JSON.stringify(T.variant_json):null;await r`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, variant, variant_json)
          VALUES (${Nt.randomUUID()}, ${m}, ${T.product_id}, ${T.quantity}, ${T.unit_price}, ${T.variant}, ${i}::jsonb)
        `}return e.status(200).json({success:!0})}return t.method==="DELETE"?n?(await r`DELETE FROM order_items WHERE order_id = ${m}`,await r`DELETE FROM orders WHERE id = ${n}`,e.status(200).json({success:!0})):e.status(400).json({error:"Order ID is required"}):e.status(405).json({error:"Method not allowed"})}catch(s){return console.error("Orders API error:",s),e.status(500).json({error:s.message})}}export{le as default};

