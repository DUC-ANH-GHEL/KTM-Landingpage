import{neon as ae}from"@neondatabase/serverless";import St from"crypto";const r=ae(process.env.DATABASE_URL);let vt=!1,Rt=0;const ue=10*60*1e3;let gt=0;const de=10*60*1e3,ct=3;function Tt(t){return t?String(t).replace(/[^0-9]/g,""):""}function At(t,e=!1){if(t==null)return e;const n=String(t).trim().toLowerCase();return n==="1"||n==="true"||n==="yes"||n==="y"||n==="on"?!0:n==="0"||n==="false"||n==="no"||n==="n"||n==="off"?!1:e}function Wt(t,e=null){const n=Number(t);return Number.isFinite(n)?Math.trunc(n):e}function Ht(t){const n=String(t??"").trim().match(/^([0-9]{4})-([0-9]{2})$/);if(!n)return null;const p=Number(n[1]),m=Number(n[2]);if(!Number.isFinite(p)||!Number.isFinite(m)||m<1||m>12)return null;const s=String(m).padStart(2,"0");return`${p}-${s}-01`}function Xt(t){if(t==null||t==="")return 0;const e=String(t).replace(/[^0-9]/g,"");return e?Number(e):0}function ce(t){if(!t)return null;const e=String(t),n=e.toLowerCase();if(n.includes("freeship")||n.includes("free ship")||n.includes("mi\u1EC5n ph\xED ship")||n.includes("mien phi ship")||n.includes("mi\u1EC5n ph\xED v\u1EADn chuy\u1EC3n")||n.includes("mien phi van chuyen"))return 0;const p=e.match(/(?:ship|vận\s*chuyển|van\s*chuyen|\bvc\b)\s*[:=\-]?\s*([0-9][0-9\.,\s]*)(?:\s*(k|nghìn|nghin|tr|triệu|trieu|m))?/i);if(!p)return null;const m=String(p[1]||"").replace(/[^0-9]/g,"");if(!m)return null;let s=Number(m);const N=String(p[2]||"").toLowerCase();return N==="k"||N.startsWith("ngh")?s*=1e3:(N==="tr"||N.startsWith("tri")||N==="m")&&(s*=1e6),Number.isFinite(s)?s:null}const me=1.64;function Ee(t){const e=typeof t=="number"?t:parseFloat(String(t??"").trim());return Number.isFinite(e)?Math.max(0,Math.min(100,e)):me}function _e(t){const e=String(t??"").trim().toLowerCase();return e==="cancelled"?"canceled":e}async function pe(){if(!vt){await r`
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
    `}catch{}vt=!0}}async function he(){const t=Date.now();Rt&&t-Rt<ue||(Rt=t,await r`
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
  `)}async function le(){const t=Date.now();gt&&t-gt<de||(gt=t,await r`
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
      AND created_at <= (NOW() - ((${ct}::int) * INTERVAL '1 day'))
  `)}function xt(t,e,n){if(Array.isArray(t)&&t.length){const p=t.map(m=>({product_id:m?.product_id,quantity:Number(m?.quantity??1),unit_price:(()=>{const s=m?.unit_price??m?.unitPrice,N=s==null||s===""?NaN:Number(s);return Number.isFinite(N)?Math.max(0,Math.trunc(N)):null})(),variant:(()=>{const s=m?.variant,N=s!=null?String(s).trim():"";return N?N.slice(0,200):null})(),variant_json:(()=>{let s=m?.variant_json??m?.variantJson;if(s==null||s==="")return null;if(typeof s=="string"){const N=s.trim();if(!N)return null;try{s=JSON.parse(N)}catch{return null}}return!s||typeof s!="object"?null:s})()})).filter(m=>m.product_id&&Number.isFinite(m.quantity)&&m.quantity>0);if(p.length)return p}if(e){const p=Number(n??1);return[{product_id:e,quantity:Number.isFinite(p)&&p>0?p:1}]}return[]}function Ct(t){const e=Array.isArray(t.items)?t.items:[];if(e.length)return{...t,items:e};if(!t.product_id)return{...t,items:[]};const n=Number(t.quantity??1),p={id:null,product_id:t.product_id,quantity:Number.isFinite(n)&&n>0?n:1,product_name:t.product_name||null,product_price:t.product_price||null,product_code:t.product_code||null,product_note:t.product_note||null,unit_price:null,variant:null,variant_json:null};return{...t,items:[p]}}async function Pt({name:t,phone:e,address:n}){const p=Tt(e);if(!p)throw new Error("Phone is required");const m=await r`
    SELECT id, name, phone, address, created_at, updated_at
    FROM customers
    WHERE phone = ${p}
    LIMIT 1
  `;if(m.length){const M=m[0],it=t??M.name,h=n??M.address;return await r`
      UPDATE customers
      SET name = ${it}, address = ${h}, updated_at = NOW()
      WHERE id = ${M.id}
    `,{...M,name:it,address:h,phone:p}}const s=St.randomUUID();return(await r`
    INSERT INTO customers (id, name, phone, address)
    VALUES (${s}, ${t||null}, ${p}, ${n||null})
    RETURNING *
  `)[0]}async function Ne(t,e){if(e.setHeader("Access-Control-Allow-Origin","*"),e.setHeader("Access-Control-Allow-Methods","GET, POST, PUT, DELETE, OPTIONS"),e.setHeader("Access-Control-Allow-Headers","Content-Type"),t.method==="OPTIONS")return e.status(200).end();const n=t.query.id||t.body?.id,p=n!=null?String(n):null,m=t.query.resource;try{const s=At(t.query?.debug,!1),N=s?Date.now():0;await pe();const M=s?Date.now():0;await le();const it=s?Date.now():0;if(m==="customers"){if(t.method==="GET"){const h=Tt(t.query.phone);if(!h)return e.status(400).json({error:"phone is required"});const L=await r`
          SELECT id, name, phone, address, created_at, updated_at
          FROM customers
          WHERE phone = ${h}
          LIMIT 1
        `;if(L.length)return e.status(200).json({exists:!0,customer:L[0]});const D=await r`
          SELECT
            COALESCE(o.customer_name, '') AS customer_name,
            COALESCE(o.address, '') AS address
          FROM orders o
          WHERE regexp_replace(COALESCE(o.phone, ''), '[^0-9]', '', 'g') = ${h}
          ORDER BY o.created_at DESC
          LIMIT 1
        `;if(!D.length)return e.status(200).json({exists:!1});const X={name:D[0].customer_name||null,phone:h,address:D[0].address||null};try{const I=St.randomUUID(),O=await r`
            INSERT INTO customers (id, name, phone, address)
            VALUES (${I}, ${X.name}, ${X.phone}, ${X.address})
            RETURNING *
          `;return e.status(200).json({exists:!0,customer:O[0]})}catch{const I=await r`
            SELECT id, name, phone, address, created_at, updated_at
            FROM customers
            WHERE phone = ${h}
            LIMIT 1
          `;return I.length?e.status(200).json({exists:!0,customer:I[0]}):e.status(200).json({exists:!1})}}return e.status(405).json({error:"Method not allowed"})}if(t.method==="GET"){let h=null;if(m==="stats"){const a=String(t.query.month??"").trim(),d=Ht(a);if(!d)return e.status(400).json({error:"month is required (YYYY-MM)"});const V=Ee(t.query.ship_percent??t.query.shipPercent),at=At(t.query.meta,!1);let c=[];try{c=await r`SELECT id, name, code, price, note, commission_percent, variants FROM products`}catch{c=[]}const f=new Map;for(const o of Array.isArray(c)?c:[]){const i=String(o?.id??"").trim();i&&f.set(i,o)}const rt=o=>(Array.isArray(o)?o:[]).map(R=>{const U=String(R?.name||"").trim();if(!U)return null;const v=(Array.isArray(R?.options)?R.options:[]).map(g=>{const C=String(g?.label||"").trim();if(!C)return null;const S=g?.price,y=S==null||S===""?NaN:typeof S=="number"?S:typeof S=="string"?Xt(S):Number(S),G=Number.isFinite(y)?Math.trunc(y):null,W=g?.price_delta??g?.priceDelta??null,$=Number(W),J=Number.isFinite($)?Math.trunc($):0;return{label:C,price:G,price_delta:J}}).filter(Boolean);return{name:U,options:v}}).filter(Boolean),Et=o=>{const i=String(o??"").trim();return i&&f.get(i)||null},Bt=o=>{const i=o?.unit_price??o?.unitPrice,R=i==null||i===""?NaN:Number(i);if(Number.isFinite(R))return Math.max(0,Math.trunc(R));const U=String(o?.product_id||"").trim(),v=Et(U),g=Xt(v?.price),C=o?.variant_json??o?.variantJson,S=C&&typeof C=="object"?C:null;if(!S)return g;const y=rt(v?.variants);if(!y.length)return g;let G=g;for(const W of y){const $=String(W?.name||"").trim(),J=String(S?.[$]||"").trim();if(!$||!J)continue;const nt=(Array.isArray(W.options)?W.options:[]).find(K=>String(K?.label||"").trim()===J);if(!nt)continue;if(Number.isFinite(Number(nt.price))){G=Math.max(0,Math.trunc(Number(nt.price)));continue}const dt=Number(nt.price_delta);Number.isFinite(dt)&&(G+=Math.trunc(dt))}return G},ht=5,Dt=new Map((Array.isArray(c)?c:[]).map(o=>{const i=o?.commission_percent??o?.commissionPercent,R=Number(i),U=Number.isFinite(R)?Math.max(0,Math.min(100,R)):ht;return[String(o?.id),U]})),Vt=o=>o.customer_id||o.phone||"unknown",Yt=o=>{const i=Array.isArray(o)?o:[];let R=!1,U=0;for(const v of i){const g=String(v?.product_id||"").trim(),C=Et(g),S=v?.product_note??C?.note??null,y=ce(S);y!=null&&(R=!0,y>U&&(U=y))}return{found:R,fee:U}},Gt=s?Date.now():0,Ft=await r(`
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
        `,[d]),$t=s?Date.now():0,wt=(Array.isArray(Ft)?Ft:[]).map(Ct),Y={draft:0,pending:0,processing:0,done:0,paid:0,canceled:0,other:0};let ut=0,Ot=0,ft=0,It=0,Jt=0,Mt=0,jt=0,_t=0,qt=0;const yt=new Map,pt=new Map,Lt=new Map;for(const o of wt){const i=_e(o?.status),v=i==="canceled"||i==="draft",g=Array.isArray(o?.items)?o.items:[];let C=0,S=0,y=0;for(const z of g){const w=Number(z?.quantity||0)||0,ot=Bt(z),st=w*ot,H=String(z?.product_id||""),se=Dt.has(H)?Dt.get(H):ht,ie=(Number(se)||0)/100;if(C+=w,S+=st,y+=st*ie,!v){const lt=z?.product_id||"unknown",Ut=Et(lt),Nt=yt.get(lt)||{product_id:lt,product_name:Ut?.name||"\u2014",product_code:Ut?.code||"",orders:0,quantity:0,revenue:0};Nt.orders+=1,Nt.quantity+=w,Nt.revenue+=st,yt.set(lt,Nt)}}const G=Yt(g),W=Number(o?.adjustment_amount??0)||0,$=S+(G.found?G.fee:0)+W,J=S+W,nt=!G.found&&V>0&&S>0?S*V/100:0,dt=S>0?y/S:ht/100,K=y+W*dt-nt*dt,oe=i==="done"||i==="paid";if(i==="draft"?Y.draft+=1:i==="pending"?Y.pending+=1:i==="processing"?Y.processing+=1:i==="canceled"?Y.canceled+=1:i==="paid"?(Y.paid+=1,Y.done+=1,It+=$,Mt+=J,qt+=K):i==="done"?(Y.done+=1,It+=$,Mt+=J):Y.other+=1,i!=="paid"&&i!=="canceled"&&i!=="draft"&&(console.log("[DEBUG][UNPAID COMM]",{orderId:o?.id,status:i,orderCommissionProducts:y,adj:W,effectiveCommissionRate:dt,estimatedShipCost:nt,orderCommissionNoShip:K,unpaidCommissionNoShip_before:_t,unpaidCommissionNoShip_after:_t+K}),_t+=K),!v){ut+=1,Ot+=C,ft+=$,Jt+=J,jt+=K;const z=Vt(o),w=pt.get(z)||{key:z,customer_name:o.customer_name||"",phone:o.phone||"",orders:0,quantity:0,revenue:0};w.orders+=1,w.quantity+=C,w.revenue+=$,!w.customer_name&&o.customer_name&&(w.customer_name=o.customer_name),!w.phone&&o.phone&&(w.phone=o.phone),pt.set(z,w);const ot=o.created_at?new Date(o.created_at):null;if(ot&&!Number.isNaN(ot.getTime())){const st=`${ot.getFullYear()}-${String(ot.getMonth()+1).padStart(2,"0")}-${String(ot.getDate()).padStart(2,"0")}`,H=Lt.get(st)||{day:st,orders:0,quantity:0,revenue:0,doneOrders:0,doneRevenue:0,commission:0};H.orders+=1,H.quantity+=C,H.revenue+=$,H.commission+=K,oe&&(H.doneOrders+=1,H.doneRevenue+=$),Lt.set(st,H)}}}const Kt=Array.from(yt.values()).sort((o,i)=>i.revenue-o.revenue),zt=Array.from(pt.values()).sort((o,i)=>i.revenue-o.revenue),kt=Array.from(Lt.values()).sort((o,i)=>o.day.localeCompare(i.day)),Qt=pt.size,Zt=ut?Math.round(ft/ut):0,te=ut?Ot/ut:0,ee=Math.round(_t),re=Math.round(jt),ne=Math.round(qt),bt={statusCounts:Y,activeOrders:ut,totalQty:Ot,totalRevenue:ft,doneRevenue:It,tempCommission:ee,tempCommissionAll:re,commissionPaid:ne,products:Kt,customers:zt,days:kt,uniqueCustomers:Qt,avgOrderValue:Zt,avgQtyPerOrder:te};return at?e.status(200).json({stats:bt,meta:{month:a,ship_percent:V,ordersCount:wt.length,...s?{timingsMs:{schema:M-N,cleanup:it-M,autoAdvance:h,query:$t-Gt,total:$t-N}}:{}}}):e.status(200).json(bt)}if(n){const d=await r(`
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
        `,[n]);return d.length?e.status(200).json(Ct(d[0])):e.status(404).json({error:"Order not found"})}const{month:L}=t.query,D=L?Ht(L):null,X=t.query.search??t.query.q??"",I=String(X??"").trim(),O=I.replace(/[^0-9]+/g,""),mt=At(t.query.includeItems??t.query.items??t.query.include_items,!0),j=At(t.query.meta,!1),u=Wt(t.query.limit,null),A=Math.max(0,Wt(t.query.offset,0)??0),x=s&&j,k=String(t.query.overdue||"").trim()==="1"||String(t.query.overdue||"").trim().toLowerCase()==="true",P=String(t.query.draftExpiring||t.query.draft_expiring||"").trim()==="1"||String(t.query.draftExpiring||t.query.draft_expiring||"").trim().toLowerCase()==="true",Q=t.query.days??t.query.overdueDays??3;let F=Number(Q);(!Number.isFinite(F)||F<0)&&(F=3),F=Math.trunc(F);const Z=t.query.remainingDays??t.query.remaining_days??3;let T=Number(Z);(!Number.isFinite(T)||T<0)&&(T=3),T=Math.trunc(T),T>ct&&(T=ct);const q=Math.max(0,ct-T);let l=`
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
      `;const E=[];if(I?(l+=" WHERE (",l+=" (c.name ILIKE $1 OR o.customer_name ILIKE $1)",E.push(`%${I}%`),O&&(O.length>=9&&(l+=` OR (c.phone = $${E.length+1} OR o.phone = $${E.length+1})`,E.push(O)),l+=` OR (c.phone LIKE $${E.length+1} OR o.phone LIKE $${E.length+1})`,E.push(`%${O}%`)),l+=" )"):P?(l+=" WHERE o.status = 'draft' AND o.created_at IS NOT NULL",l+=" AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))",E.push(ct),q>0&&(l+=" AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))",E.push(q))):k?(l+=" WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))",E.push(F)):D?(l+=" WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')",E.push(D)):L&&(l+=" WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1",E.push(L)),l+=" GROUP BY o.id, c.id, p0.id ORDER BY o.created_at DESC",Number.isFinite(u)&&u>0){const a=j?u+1:u;l+=` LIMIT $${E.length+1}`,E.push(a),A>0&&(l+=` OFFSET $${E.length+1}`,E.push(A))}else A>0&&(l+=` OFFSET $${E.length+1}`,E.push(A));if(!mt){let a=`
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
        `;const d=[];if(I?(a+=" WHERE (",a+=" (c.name ILIKE $1 OR o.customer_name ILIKE $1)",d.push(`%${I}%`),O&&(O.length>=9&&(a+=` OR (c.phone = $${d.length+1} OR o.phone = $${d.length+1})`,d.push(O)),a+=` OR (c.phone LIKE $${d.length+1} OR o.phone LIKE $${d.length+1})`,d.push(`%${O}%`)),a+=" )"):P?(a+=" WHERE o.status = 'draft' AND o.created_at IS NOT NULL",a+=" AND o.created_at > (NOW() - ($1::int * INTERVAL '1 day'))",d.push(ct),q>0&&(a+=" AND o.created_at <= (NOW() - ($2::int * INTERVAL '1 day'))",d.push(q))):k?(a+=" WHERE o.status = 'pending' AND o.created_at <= (NOW() - ($1::int * INTERVAL '1 day'))",d.push(F)):D?(a+=" WHERE o.created_at >= $1::date AND o.created_at < ($1::date + INTERVAL '1 month')",d.push(D)):L&&(a+=" WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1",d.push(L)),a+=" ORDER BY o.created_at DESC",Number.isFinite(u)&&u>0){const Et=j?u+1:u;a+=` LIMIT $${d.length+1}`,d.push(Et),A>0&&(a+=` OFFSET $${d.length+1}`,d.push(A))}else A>0&&(a+=` OFFSET $${d.length+1}`,d.push(A));const V=s?Date.now():0,at=await r(a,d),c=s?Date.now():0;let f=Array.isArray(at)?at:[],rt=!1;return j&&Number.isFinite(u)&&u>0&&f.length>u&&(rt=!0,f=f.slice(0,u)),j?e.status(200).json({orders:f,meta:{includeItems:!1,limit:Number.isFinite(u)&&u>0?u:null,offset:A,count:f.length,hasMore:rt,...x?{timingsMs:{schema:M-N,cleanup:it-M,autoAdvance:h,query:c-V,total:c-N}}:{}}}):e.status(200).json(f)}const tt=s?Date.now():0,et=await r(l,E),B=s?Date.now():0;let b=(Array.isArray(et)?et:[]).map(Ct),_=!1;return j&&Number.isFinite(u)&&u>0&&b.length>u&&(_=!0,b=b.slice(0,u)),j?e.status(200).json({orders:b,meta:{includeItems:!0,limit:Number.isFinite(u)&&u>0?u:null,offset:A,count:b.length,hasMore:_,...x?{timingsMs:{schema:M-N,cleanup:it-M,autoAdvance:h,query:B-tt,total:B-N}}:{}}}):e.status(200).json(b)}if(t.method==="POST"){if(n)return e.status(400).json({error:"Use /api/orders for creating orders (no id in URL)"});const{customer_name:h,phone:L,address:D,product_id:X,quantity:I,status:O,items:mt,adjustment_amount:j,adjustment_note:u,note:A,parent_order_id:x,split_seq:k,created_at:P,created_at_from_order_id:Q}=t.body,F=Tt(L);if(!F)return e.status(400).json({error:"phone is required"});const Z=await Pt({name:h,phone:F,address:D}),T=xt(mt,X,I);if(!T.length)return e.status(400).json({error:"items is required"});const q=T[0],l=Number(j),E=Number.isFinite(l)?Math.trunc(l):0,tt=u!=null&&String(u).trim()?String(u).trim():null,et=A!=null&&String(A).trim()?String(A).trim():null;let B=null;const b=Q!=null&&String(Q).trim()?String(Q).trim():null;if(b){const c=await r`SELECT created_at FROM orders WHERE id = ${b} LIMIT 1`;if(!c.length)return e.status(400).json({error:"created_at_from_order_id not found"});B=c[0]?.created_at??null}else if(P!=null&&String(P).trim()){const c=String(P).trim(),f=new Date(c);if(!Number.isFinite(f.getTime()))return e.status(400).json({error:"created_at is invalid"});B=c}let _=x!=null&&String(x).trim()?String(x).trim():null,a=0;if(!_){const c=Number(k);Number.isFinite(c)&&Math.trunc(c)===1&&(a=1)}if(_){if(!(await r`SELECT id, split_seq FROM orders WHERE id = ${_} LIMIT 1`).length)return e.status(400).json({error:"parent_order_id not found"});await r`
          UPDATE orders
          SET split_seq = 1
          WHERE id = ${_} AND (split_seq IS NULL OR split_seq = 0)
        `;const f=await r`
          SELECT (GREATEST(COALESCE(MAX(split_seq), 0), 1) + 1) AS next_seq
          FROM orders
          WHERE id = ${_} OR parent_order_id = ${_}
        `,rt=Number(f?.[0]?.next_seq??2);a=Number.isFinite(rt)?Math.trunc(rt):2,a<2&&(a=2)}const V=(B==null?await r`
            INSERT INTO orders (customer_id, parent_order_id, split_seq, product_id, quantity, status, status_updated_at, adjustment_amount, adjustment_note, note)
            VALUES (${Z.id}, ${_}, ${a}, ${q.product_id}, ${q.quantity}, ${O}, NOW(), ${E}, ${tt}, ${et})
            RETURNING id
          `:await r`
            INSERT INTO orders (customer_id, parent_order_id, split_seq, product_id, quantity, status, status_updated_at, adjustment_amount, adjustment_note, note, created_at)
            VALUES (${Z.id}, ${_}, ${a}, ${q.product_id}, ${q.quantity}, ${O}, NOW(), ${E}, ${tt}, ${et}, ${B}::timestamp)
            RETURNING id
          `)?.[0]?.id;if(V==null)return e.status(500).json({error:"Failed to create order"});const at=String(V);for(const c of T){const f=c.variant_json!=null?JSON.stringify(c.variant_json):null;await r`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, variant, variant_json)
          VALUES (${St.randomUUID()}, ${at}, ${c.product_id}, ${c.quantity}, ${c.unit_price}, ${c.variant}, ${f}::jsonb)
        `}return e.status(201).json({success:!0,id:V})}if(t.method==="PUT"){if(!n)return e.status(400).json({error:"Order ID is required"});const{customer_name:h,phone:L,address:D,product_id:X,quantity:I,status:O,items:mt,adjustment_amount:j,adjustment_note:u,note:A}=t.body,x=Tt(L);if(!x)return e.status(400).json({error:"phone is required"});const k=await r`SELECT parent_order_id, split_seq, status FROM orders WHERE id = ${n} LIMIT 1`;if(!k.length)return e.status(404).json({error:"Order not found"});const P=k[0],Q=Object.prototype.hasOwnProperty.call(t.body||{},"parent_order_id"),F=Object.prototype.hasOwnProperty.call(t.body||{},"split_seq");let Z=P.parent_order_id??null;if(Q){const _=t.body.parent_order_id;Z=_!=null&&String(_).trim()?String(_).trim():null}let T=Number(P.split_seq??0);if(Number.isFinite(T)||(T=0),T=Math.trunc(T),F){const _=Number(t.body.split_seq);T=Number.isFinite(_)?Math.max(0,Math.trunc(_)):0}const q=await Pt({name:h,phone:x,address:D}),l=xt(mt,X,I);if(!l.length)return e.status(400).json({error:"items is required"});const E=l[0],tt=Number(j),et=Number.isFinite(tt)?Math.trunc(tt):0,B=u!=null&&String(u).trim()?String(u).trim():null,b=A!=null&&String(A).trim()?String(A).trim():null;await r`
        UPDATE orders SET
          customer_id = ${q.id},
          parent_order_id = ${Z},
          split_seq = ${T},
          product_id = ${E.product_id},
          quantity = ${E.quantity},
          status = ${O},
          status_updated_at = CASE WHEN status IS DISTINCT FROM ${O} THEN NOW() ELSE status_updated_at END,
          adjustment_amount = ${et},
          adjustment_note = ${B},
          note = ${b},
          updated_at = NOW()
        WHERE id = ${n}
      `,await r`DELETE FROM order_items WHERE order_id = ${p}`;for(const _ of l){const a=_.variant_json!=null?JSON.stringify(_.variant_json):null;await r`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, variant, variant_json)
          VALUES (${St.randomUUID()}, ${p}, ${_.product_id}, ${_.quantity}, ${_.unit_price}, ${_.variant}, ${a}::jsonb)
        `}return e.status(200).json({success:!0})}return t.method==="DELETE"?n?(await r`DELETE FROM order_items WHERE order_id = ${p}`,await r`DELETE FROM orders WHERE id = ${n}`,e.status(200).json({success:!0})):e.status(400).json({error:"Order ID is required"}):e.status(405).json({error:"Method not allowed"})}catch(s){return console.error("Orders API error:",s),e.status(500).json({error:s.message})}}export{Ne as default};

