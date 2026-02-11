import{neon as se}from"@neondatabase/serverless";import Nt from"crypto";const r=se(process.env.DATABASE_URL);let Ut=!1,Rt=0;const ie=10*60*1e3;let gt=0;const ae=10*60*1e3,ut=3;function St(t){return t?String(t).replace(/[^0-9]/g,""):""}function Tt(t,e=!1){if(t==null)return e;const n=String(t).trim().toLowerCase();return n==="1"||n==="true"||n==="yes"||n==="y"||n==="on"?!0:n==="0"||n==="false"||n==="no"||n==="n"||n==="off"?!1:e}function vt(t,e=null){const n=Number(t);return Number.isFinite(n)?Math.trunc(n):e}function Wt(t){const n=String(t??"").trim().match(/^([0-9]{4})-([0-9]{2})$/);if(!n)return null;const p=Number(n[1]),m=Number(n[2]);if(!Number.isFinite(p)||!Number.isFinite(m)||m<1||m>12)return null;const s=String(m).padStart(2,"0");return`${p}-${s}-01`}function Ht(t){if(t==null||t==="")return 0;const e=String(t).replace(/[^0-9]/g,"");return e?Number(e):0}function ue(t){if(!t)return null;const e=String(t),n=e.toLowerCase();if(n.includes("freeship")||n.includes("free ship")||n.includes("mi\u1EC5n ph\xED ship")||n.includes("mien phi ship")||n.includes("mi\u1EC5n ph\xED v\u1EADn chuy\u1EC3n")||n.includes("mien phi van chuyen"))return 0;const p=e.match(/(?:ship|vận\s*chuyển|van\s*chuyen|\bvc\b)\s*[:=\-]?\s*([0-9][0-9\.,\s]*)(?:\s*(k|nghìn|nghin|tr|triệu|trieu|m))?/i);if(!p)return null;const m=String(p[1]||"").replace(/[^0-9]/g,"");if(!m)return null;let s=Number(m);const N=String(p[2]||"").toLowerCase();return N==="k"||N.startsWith("ngh")?s*=1e3:(N==="tr"||N.startsWith("tri")||N==="m")&&(s*=1e6),Number.isFinite(s)?s:null}const de=1.64;function ce(t){const e=typeof t=="number"?t:parseFloat(String(t??"").trim());return Number.isFinite(e)?Math.max(0,Math.min(100,e)):de}function me(t){const e=String(t??"").trim().toLowerCase();return e==="cancelled"?"canceled":e}async function Ee(){if(!Ut){await r`
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
    `}catch{}Ut=!0}}async function Te(){const t=Date.now();Rt&&t-Rt<ie||(Rt=t,await r`
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
  `)}async function _e(){const t=Date.now();gt&&t-gt<ae||(gt=t,await r`
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
      AND created_at <= (NOW() - ((${ut}::int) * INTERVAL '1 day'))
  `)}function Xt(t,e,n){if(Array.isArray(t)&&t.length){const p=t.map(m=>({product_id:m?.product_id,quantity:Number(m?.quantity??1),unit_price:(()=>{const s=m?.unit_price??m?.unitPrice,N=s==null||s===""?NaN:Number(s);return Number.isFinite(N)?Math.max(0,Math.trunc(N)):null})(),variant:(()=>{const s=m?.variant,N=s!=null?String(s).trim():"";return N?N.slice(0,200):null})(),variant_json:(()=>{let s=m?.variant_json??m?.variantJson;if(s==null||s==="")return null;if(typeof s=="string"){const N=s.trim();if(!N)return null;try{s=JSON.parse(N)}catch{return null}}return!s||typeof s!="object"?null:s})()})).filter(m=>m.product_id&&Number.isFinite(m.quantity)&&m.quantity>0);if(p.length)return p}if(e){const p=Number(n??1);return[{product_id:e,quantity:Number.isFinite(p)&&p>0?p:1}]}return[]}function Ct(t){const e=Array.isArray(t.items)?t.items:[];if(e.length)return{...t,items:e};if(!t.product_id)return{...t,items:[]};const n=Number(t.quantity??1),p={id:null,product_id:t.product_id,quantity:Number.isFinite(n)&&n>0?n:1,product_name:t.product_name||null,product_price:t.product_price||null,product_code:t.product_code||null,product_note:t.product_note||null,unit_price:null,variant:null,variant_json:null};return{...t,items:[p]}}async function xt({name:t,phone:e,address:n}){const p=St(e);if(!p)throw new Error("Phone is required");const m=await r`
    SELECT id, name, phone, address, created_at, updated_at
    FROM customers
    WHERE phone = ${p}
    LIMIT 1
  `;if(m.length){const M=m[0],ot=t??M.name,h=n??M.address;return await r`
      UPDATE customers
      SET name = ${ot}, address = ${h}, updated_at = NOW()
      WHERE id = ${M.id}
    `,{...M,name:ot,address:h,phone:p}}const s=Nt.randomUUID();return(await r`
    INSERT INTO customers (id, name, phone, address)
    VALUES (${s}, ${t||null}, ${p}, ${n||null})
    RETURNING *
  `)[0]}async function pe(t,e){if(e.setHeader("Access-Control-Allow-Origin","*"),e.setHeader("Access-Control-Allow-Methods","GET, POST, PUT, DELETE, OPTIONS"),e.setHeader("Access-Control-Allow-Headers","Content-Type"),t.method==="OPTIONS")return e.status(200).end();const n=t.query.id||t.body?.id,p=n!=null?String(n):null,m=t.query.resource;try{const s=Tt(t.query?.debug,!1),N=s?Date.now():0;await Ee();const M=s?Date.now():0;await _e();const ot=s?Date.now():0;if(m==="customers"){if(t.method==="GET"){const h=St(t.query.phone);if(!h)return e.status(400).json({error:"phone is required"});const y=await r`
          SELECT id, name, phone, address, created_at, updated_at
          FROM customers
          WHERE phone = ${h}
          LIMIT 1
        `;if(y.length)return e.status(200).json({exists:!0,customer:y[0]});const D=await r`
          SELECT
            COALESCE(o.customer_name, '') AS customer_name,
            COALESCE(o.address, '') AS address
          FROM orders o
          WHERE regexp_replace(COALESCE(o.phone, ''), '[^0-9]', '', 'g') = ${h}
          ORDER BY o.created_at DESC
          LIMIT 1
        `;if(!D.length)return e.status(200).json({exists:!1});const W={name:D[0].customer_name||null,phone:h,address:D[0].address||null};try{const I=Nt.randomUUID(),O=await r`
            INSERT INTO customers (id, name, phone, address)
            VALUES (${I}, ${W.name}, ${W.phone}, ${W.address})
            RETURNING *
          `;return e.status(200).json({exists:!0,customer:O[0]})}catch{const I=await r`
            SELECT id, name, phone, address, created_at, updated_at
            FROM customers
            WHERE phone = ${h}
            LIMIT 1
          `;return I.length?e.status(200).json({exists:!0,customer:I[0]}):e.status(200).json({exists:!1})}}return e.status(405).json({error:"Method not allowed"})}if(t.method==="GET"){let h=null;if(m==="stats"){const i=String(t.query.month??"").trim(),d=Wt(i);if(!d)return e.status(400).json({error:"month is required (YYYY-MM)"});const P=ce(t.query.ship_percent??t.query.shipPercent),st=Tt(t.query.meta,!1);let c=[];try{c=await r`SELECT id, name, code, price, note, commission_percent, variants FROM products`}catch{c=[]}const f=new Map;for(const o of Array.isArray(c)?c:[]){const a=String(o?.id??"").trim();a&&f.set(a,o)}const et=o=>(Array.isArray(o)?o:[]).map(L=>{const U=String(L?.name||"").trim();if(!U)return null;const v=(Array.isArray(L?.options)?L.options:[]).map(R=>{const g=String(R?.label||"").trim();if(!g)return null;const S=R?.price,C=S==null||S===""?NaN:typeof S=="number"?S:typeof S=="string"?Ht(S):Number(S),V=Number.isFinite(C)?Math.trunc(C):null,Y=R?.price_delta??R?.priceDelta??null,$=Number(Y),J=Number.isFinite($)?Math.trunc($):0;return{label:g,price:V,price_delta:J}}).filter(Boolean);return{name:U,options:v}}).filter(Boolean),ct=o=>{const a=String(o??"").trim();return a&&f.get(a)||null},Pt=o=>{const a=o?.unit_price??o?.unitPrice,L=a==null||a===""?NaN:Number(a);if(Number.isFinite(L))return Math.max(0,Math.trunc(L));const U=String(o?.product_id||"").trim(),v=ct(U),R=Ht(v?.price),g=o?.variant_json??o?.variantJson,S=g&&typeof g=="object"?g:null;if(!S)return R;const C=et(v?.variants);if(!C.length)return R;let V=R;for(const Y of C){const $=String(Y?.name||"").trim(),J=String(S?.[$]||"").trim();if(!$||!J)continue;const at=(Array.isArray(Y.options)?Y.options:[]).find(Et=>String(Et?.label||"").trim()===J);if(!at)continue;if(Number.isFinite(Number(at.price))){V=Math.max(0,Math.trunc(Number(at.price)));continue}const mt=Number(at.price_delta);Number.isFinite(mt)&&(V+=Math.trunc(mt))}return V},At=5,Dt=new Map((Array.isArray(c)?c:[]).map(o=>{const a=o?.commission_percent??o?.commissionPercent,L=Number(a),U=Number.isFinite(L)?Math.max(0,Math.min(100,L)):At;return[String(o?.id),U]})),Bt=o=>o.customer_id||o.phone||"unknown",Vt=o=>{const a=Array.isArray(o)?o:[];let L=!1,U=0;for(const v of a){const R=String(v?.product_id||"").trim(),g=ct(R),S=v?.product_note??g?.note??null,C=ue(S);C!=null&&(L=!0,C>U&&(U=C))}return{found:L,fee:U}},Yt=s?Date.now():0,Ft=await r(`
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
        `,[d]),$t=s?Date.now():0,wt=(Array.isArray(Ft)?Ft:[]).map(Ct),B={draft:0,pending:0,processing:0,done:0,paid:0,canceled:0,other:0};let it=0,ht=0,Ot=0,ft=0,Gt=0,Mt=0,jt=0,It=0;const yt=new Map,_t=new Map,Lt=new Map;for(const o of wt){const a=me(o?.status),v=a==="canceled"||a==="draft",R=Array.isArray(o?.items)?o.items:[];let g=0,S=0,C=0;for(const K of R){const w=Number(K?.quantity||0)||0,rt=Pt(K),nt=w*rt,G=String(K?.product_id||""),ne=Dt.has(G)?Dt.get(G):At,oe=(Number(ne)||0)/100;if(g+=w,S+=nt,C+=nt*oe,!v){const pt=K?.product_id||"unknown",bt=ct(pt),lt=yt.get(pt)||{product_id:pt,product_name:bt?.name||"\u2014",product_code:bt?.code||"",orders:0,quantity:0,revenue:0};lt.orders+=1,lt.quantity+=w,lt.revenue+=nt,yt.set(pt,lt)}}const V=Vt(R),Y=Number(o?.adjustment_amount??0)||0,$=S+(V.found?V.fee:0)+Y,J=S+Y,at=!V.found&&P>0&&S>0?S*P/100:0,mt=S>0?C/S:At/100,Et=C+Y*mt-at*mt,re=a==="done"||a==="paid";if(a==="draft"?B.draft+=1:a==="pending"?B.pending+=1:a==="processing"?B.processing+=1:a==="canceled"?B.canceled+=1:a==="paid"?(B.paid+=1,B.done+=1,ft+=$,Mt+=J,It+=Et):a==="done"?(B.done+=1,ft+=$,Mt+=J,It+=Et):B.other+=1,!v){it+=1,ht+=g,Ot+=$,Gt+=J,jt+=Et;const K=Bt(o),w=_t.get(K)||{key:K,customer_name:o.customer_name||"",phone:o.phone||"",orders:0,quantity:0,revenue:0};w.orders+=1,w.quantity+=g,w.revenue+=$,!w.customer_name&&o.customer_name&&(w.customer_name=o.customer_name),!w.phone&&o.phone&&(w.phone=o.phone),_t.set(K,w);const rt=o.created_at?new Date(o.created_at):null;if(rt&&!Number.isNaN(rt.getTime())){const nt=`${rt.getFullYear()}-${String(rt.getMonth()+1).padStart(2,"0")}-${String(rt.getDate()).padStart(2,"0")}`,G=Lt.get(nt)||{day:nt,orders:0,quantity:0,revenue:0,doneOrders:0,doneRevenue:0};G.orders+=1,G.quantity+=g,G.revenue+=$,re&&(G.doneOrders+=1,G.doneRevenue+=$),Lt.set(nt,G)}}}const Jt=Array.from(yt.values()).sort((o,a)=>a.revenue-o.revenue),Kt=Array.from(_t.values()).sort((o,a)=>a.revenue-o.revenue),zt=Array.from(Lt.values()).sort((o,a)=>o.day.localeCompare(a.day)),kt=_t.size,Qt=it?Math.round(Ot/it):0,Zt=it?ht/it:0,te=Math.round(It),ee=Math.round(jt),qt={statusCounts:B,activeOrders:it,totalQty:ht,totalRevenue:Ot,doneRevenue:ft,tempCommission:te,tempCommissionAll:ee,products:Jt,customers:Kt,days:zt,uniqueCustomers:kt,avgOrderValue:Qt,avgQtyPerOrder:Zt};return st?e.status(200).json({stats:qt,meta:{month:i,ship_percent:P,ordersCount:wt.length,...s?{timingsMs:{schema:M-N,cleanup:ot-M,autoAdvance:h,query:$t-Yt,total:$t-N}}:{}}}):e.status(200).json(qt)}if(n){const d=await r(`
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
        `,[n]);return d.length?e.status(200).json(Ct(d[0])):e.status(404).json({error:"Order not found"})}const{month:y}=t.query,D=y?Wt(y):null,W=t.query.search??t.query.q??"",I=String(W??"").trim(),O=I.replace(/[^0-9]+/g,""),dt=Tt(t.query.includeItems??t.query.items??t.query.include_items,!0),j=Tt(t.query.meta,!1),u=vt(t.query.limit,null),A=Math.max(0,vt(t.query.offset,0)??0),H=s&&j,z=String(t.query.overdue||"").trim()==="1"||String(t.query.overdue||"").trim().toLowerCase()==="true",X=String(t.query.draftExpiring||t.query.draft_expiring||"").trim()==="1"||String(t.query.draftExpiring||t.query.draft_expiring||"").trim().toLowerCase()==="true",k=t.query.days??t.query.overdueDays??3;let F=Number(k);(!Number.isFinite(F)||F<0)&&(F=3),F=Math.trunc(F);const Q=t.query.remainingDays??t.query.remaining_days??3;let T=Number(Q);(!Number.isFinite(T)||T<0)&&(T=3),T=Math.trunc(T),T>ut&&(T=ut);const q=Math.max(0,ut-T);let l=`
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
      `;const E=[];if(I?(l+=" WHERE (",l+=" (c.name ILIKE $1 OR o.customer_name ILIKE $1)",E.push(`%${I}%`),O&&(O.length>=9&&(l+=` OR (c.phone = $${E.length+1} OR o.phone = $${E.length+1})`,E.push(O)),l+=` OR (c.phone LIKE $${E.length+1} OR o.phone LIKE $${E.length+1})`,E.push(`%${O}%`)),l+=" )"):X?(l+=" WHERE o.status = 'draft' AND o.created_at IS NOT NULL",l+=" AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))",E.push(ut),q>0&&(l+=" AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))",E.push(q))):z?(l+=" WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))",E.push(F)):D?(l+=" WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')",E.push(D)):y&&(l+=" WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1",E.push(y)),l+=" GROUP BY o.id, c.id, p0.id ORDER BY o.created_at DESC",Number.isFinite(u)&&u>0){const i=j?u+1:u;l+=` LIMIT $${E.length+1}`,E.push(i),A>0&&(l+=` OFFSET $${E.length+1}`,E.push(A))}else A>0&&(l+=` OFFSET $${E.length+1}`,E.push(A));if(!dt){let i=`
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
        `;const d=[];if(I?(i+=" WHERE (",i+=" (c.name ILIKE $1 OR o.customer_name ILIKE $1)",d.push(`%${I}%`),O&&(O.length>=9&&(i+=` OR (c.phone = $${d.length+1} OR o.phone = $${d.length+1})`,d.push(O)),i+=` OR (c.phone LIKE $${d.length+1} OR o.phone LIKE $${d.length+1})`,d.push(`%${O}%`)),i+=" )"):X?(i+=" WHERE o.status = 'draft' AND o.created_at IS NOT NULL",i+=" AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))",d.push(ut),q>0&&(i+=" AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))",d.push(q))):z?(i+=" WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))",d.push(F)):D?(i+=" WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')",d.push(D)):y&&(i+=" WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1",d.push(y)),i+=" ORDER BY o.created_at DESC",Number.isFinite(u)&&u>0){const ct=j?u+1:u;i+=` LIMIT $${d.length+1}`,d.push(ct),A>0&&(i+=` OFFSET $${d.length+1}`,d.push(A))}else A>0&&(i+=` OFFSET $${d.length+1}`,d.push(A));const P=s?Date.now():0,st=await r(i,d),c=s?Date.now():0;let f=Array.isArray(st)?st:[],et=!1;return j&&Number.isFinite(u)&&u>0&&f.length>u&&(et=!0,f=f.slice(0,u)),j?e.status(200).json({orders:f,meta:{includeItems:!1,limit:Number.isFinite(u)&&u>0?u:null,offset:A,count:f.length,hasMore:et,...H?{timingsMs:{schema:M-N,cleanup:ot-M,autoAdvance:h,query:c-P,total:c-N}}:{}}}):e.status(200).json(f)}const Z=s?Date.now():0,tt=await r(l,E),x=s?Date.now():0;let b=(Array.isArray(tt)?tt:[]).map(Ct),_=!1;return j&&Number.isFinite(u)&&u>0&&b.length>u&&(_=!0,b=b.slice(0,u)),j?e.status(200).json({orders:b,meta:{includeItems:!0,limit:Number.isFinite(u)&&u>0?u:null,offset:A,count:b.length,hasMore:_,...H?{timingsMs:{schema:M-N,cleanup:ot-M,autoAdvance:h,query:x-Z,total:x-N}}:{}}}):e.status(200).json(b)}if(t.method==="POST"){if(n)return e.status(400).json({error:"Use /api/orders for creating orders (no id in URL)"});const{customer_name:h,phone:y,address:D,product_id:W,quantity:I,status:O,items:dt,adjustment_amount:j,adjustment_note:u,note:A,parent_order_id:H,split_seq:z,created_at:X,created_at_from_order_id:k}=t.body,F=St(y);if(!F)return e.status(400).json({error:"phone is required"});const Q=await xt({name:h,phone:F,address:D}),T=Xt(dt,W,I);if(!T.length)return e.status(400).json({error:"items is required"});const q=T[0],l=Number(j),E=Number.isFinite(l)?Math.trunc(l):0,Z=u!=null&&String(u).trim()?String(u).trim():null,tt=A!=null&&String(A).trim()?String(A).trim():null;let x=null;const b=k!=null&&String(k).trim()?String(k).trim():null;if(b){const c=await r`SELECT created_at FROM orders WHERE id = ${b} LIMIT 1`;if(!c.length)return e.status(400).json({error:"created_at_from_order_id not found"});x=c[0]?.created_at??null}else if(X!=null&&String(X).trim()){const c=String(X).trim(),f=new Date(c);if(!Number.isFinite(f.getTime()))return e.status(400).json({error:"created_at is invalid"});x=c}let _=H!=null&&String(H).trim()?String(H).trim():null,i=0;if(!_){const c=Number(z);Number.isFinite(c)&&Math.trunc(c)===1&&(i=1)}if(_){if(!(await r`SELECT id, split_seq FROM orders WHERE id = ${_} LIMIT 1`).length)return e.status(400).json({error:"parent_order_id not found"});await r`
          UPDATE orders
          SET split_seq = 1
          WHERE id = ${_} AND (split_seq IS NULL OR split_seq = 0)
        `;const f=await r`
          SELECT (GREATEST(COALESCE(MAX(split_seq), 0), 1) + 1) AS next_seq
          FROM orders
          WHERE id = ${_} OR parent_order_id = ${_}
        `,et=Number(f?.[0]?.next_seq??2);i=Number.isFinite(et)?Math.trunc(et):2,i<2&&(i=2)}const P=(x==null?await r`
            INSERT INTO orders (customer_id, parent_order_id, split_seq, product_id, quantity, status, status_updated_at, adjustment_amount, adjustment_note, note)
            VALUES (${Q.id}, ${_}, ${i}, ${q.product_id}, ${q.quantity}, ${O}, NOW(), ${E}, ${Z}, ${tt})
            RETURNING id
          `:await r`
            INSERT INTO orders (customer_id, parent_order_id, split_seq, product_id, quantity, status, status_updated_at, adjustment_amount, adjustment_note, note, created_at)
            VALUES (${Q.id}, ${_}, ${i}, ${q.product_id}, ${q.quantity}, ${O}, NOW(), ${E}, ${Z}, ${tt}, ${x}::timestamp)
            RETURNING id
          `)?.[0]?.id;if(P==null)return e.status(500).json({error:"Failed to create order"});const st=String(P);for(const c of T){const f=c.variant_json!=null?JSON.stringify(c.variant_json):null;await r`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, variant, variant_json)
          VALUES (${Nt.randomUUID()}, ${st}, ${c.product_id}, ${c.quantity}, ${c.unit_price}, ${c.variant}, ${f}::jsonb)
        `}return e.status(201).json({success:!0,id:P})}if(t.method==="PUT"){if(!n)return e.status(400).json({error:"Order ID is required"});const{customer_name:h,phone:y,address:D,product_id:W,quantity:I,status:O,items:dt,adjustment_amount:j,adjustment_note:u,note:A}=t.body,H=St(y);if(!H)return e.status(400).json({error:"phone is required"});const z=await r`SELECT parent_order_id, split_seq, status FROM orders WHERE id = ${n} LIMIT 1`;if(!z.length)return e.status(404).json({error:"Order not found"});const X=z[0],k=Object.prototype.hasOwnProperty.call(t.body||{},"parent_order_id"),F=Object.prototype.hasOwnProperty.call(t.body||{},"split_seq");let Q=X.parent_order_id??null;if(k){const _=t.body.parent_order_id;Q=_!=null&&String(_).trim()?String(_).trim():null}let T=Number(X.split_seq??0);if(Number.isFinite(T)||(T=0),T=Math.trunc(T),F){const _=Number(t.body.split_seq);T=Number.isFinite(_)?Math.max(0,Math.trunc(_)):0}const q=await xt({name:h,phone:H,address:D}),l=Xt(dt,W,I);if(!l.length)return e.status(400).json({error:"items is required"});const E=l[0],Z=Number(j),tt=Number.isFinite(Z)?Math.trunc(Z):0,x=u!=null&&String(u).trim()?String(u).trim():null,b=A!=null&&String(A).trim()?String(A).trim():null;await r`
        UPDATE orders SET
          customer_id = ${q.id},
          parent_order_id = ${Q},
          split_seq = ${T},
          product_id = ${E.product_id},
          quantity = ${E.quantity},
          status = ${O},
          status_updated_at = CASE WHEN status IS DISTINCT FROM ${O} THEN NOW() ELSE status_updated_at END,
          adjustment_amount = ${tt},
          adjustment_note = ${x},
          note = ${b},
          updated_at = NOW()
        WHERE id = ${n}
      `,await r`DELETE FROM order_items WHERE order_id = ${p}`;for(const _ of l){const i=_.variant_json!=null?JSON.stringify(_.variant_json):null;await r`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, variant, variant_json)
          VALUES (${Nt.randomUUID()}, ${p}, ${_.product_id}, ${_.quantity}, ${_.unit_price}, ${_.variant}, ${i}::jsonb)
        `}return e.status(200).json({success:!0})}return t.method==="DELETE"?n?(await r`DELETE FROM order_items WHERE order_id = ${p}`,await r`DELETE FROM orders WHERE id = ${n}`,e.status(200).json({success:!0})):e.status(400).json({error:"Order ID is required"}):e.status(405).json({error:"Method not allowed"})}catch(s){return console.error("Orders API error:",s),e.status(500).json({error:s.message})}}export{pe as default};

