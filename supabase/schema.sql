-- ============================================================
-- PUVELA — Supabase schema
-- Chạy trong Supabase → SQL Editor → New query → dán toàn bộ → Run
-- Nước hoa chính hãng: full bottle + chiết (decant). Mô hình dữ liệu:
-- brands → products → product_variants (chiết 5/10ml + full) ; collections (m2m) ;
-- leads (bắt khách) ; reviews ; orders + order_items (checkout).
-- ============================================================

-- ---------- BRANDS ----------
create table if not exists brands (
  slug text primary key,
  name text not null,
  country text
);

-- ---------- COLLECTIONS ----------
create table if not exists collections (
  slug text primary key,           -- nu | nam | unisex
  title text not null,
  intro text,
  sort int default 0
);

-- ---------- PRODUCTS ----------
create table if not exists products (
  slug text primary key,           -- vd: sauvage, coco, santal33, br540
  name text not null,
  brand_slug text references brands(slug),
  category text,                   -- "Eau de Parfum · Nam"
  gender text,                     -- nam | nu | unisex
  description text,
  notes jsonb,                     -- {"top":"...","mid":"...","base":"..."}
  longevity int check (longevity between 1 and 5),
  sillage  int check (sillage  between 1 and 5),
  is_niche boolean default false,
  badge text,                      -- "Best seller" | "Niche" | "Hot" | null
  hero_image text,
  gallery jsonb,                   -- ["url1","url2","url3"]
  is_published boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_products_gender on products(gender);

-- ---------- PRODUCT VARIANTS (chiết & full) ----------
create table if not exists product_variants (
  id bigint generated always as identity primary key,
  product_slug text not null references products(slug) on delete cascade,
  kind text not null check (kind in ('chiet','full')),
  label text not null,             -- "Chiết 10ml" | "Full 100ml"
  volume_ml numeric,
  price int not null,              -- VND
  sku text,
  stock int default 0,
  sort int default 0
);
create index if not exists idx_variants_product on product_variants(product_slug);

-- ---------- PRODUCT ↔ COLLECTION (m2m) ----------
create table if not exists product_collections (
  product_slug text references products(slug) on delete cascade,
  collection_slug text references collections(slug) on delete cascade,
  primary key (product_slug, collection_slug)
);

-- ---------- LEADS (bắt khách: newsletter, quiz, popup) ----------
create table if not exists leads (
  id bigint generated always as identity primary key,
  email text,
  phone text,
  source text,                     -- newsletter | quiz | popup
  scent_dna jsonb,                 -- kết quả quiz {profile,name,match}
  note text,
  created_at timestamptz default now()
);

-- ---------- REVIEWS ----------
create table if not exists reviews (
  id bigint generated always as identity primary key,
  product_slug text references products(slug) on delete cascade,
  author text,
  rating int check (rating between 1 and 5),
  body text,
  image_url text,
  verified boolean default false,
  is_published boolean default true,
  created_at timestamptz default now()
);

-- ---------- ORDERS (checkout — dùng ở bước sau) ----------
create table if not exists orders (
  id bigint generated always as identity primary key,
  code text unique,
  customer_name text,
  phone text,
  address text,
  note text,
  payment_method text,             -- cod | bank | momo
  status text default 'new',       -- new | confirmed | shipping | done | cancelled
  subtotal int,
  shipping_fee int default 0,
  total int,
  items jsonb,                     -- các dòng hàng [{slug,name,label,price,qty}]
  created_at timestamptz default now()
);
create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id bigint references orders(id) on delete cascade,
  variant_id bigint references product_variants(id),
  product_name text,
  variant_label text,
  price int,
  qty int default 1
);

-- ============================================================
-- ROW LEVEL SECURITY
-- anon (khách web) chỉ được: ĐỌC catalog + review, GHI lead + order.
-- KHÔNG đọc được leads/orders của người khác. Quản trị dùng service_role.
-- ============================================================
alter table brands             enable row level security;
alter table collections        enable row level security;
alter table products           enable row level security;
alter table product_variants   enable row level security;
alter table product_collections enable row level security;
alter table reviews            enable row level security;
alter table leads              enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;

-- Public READ catalog
create policy "read brands"        on brands             for select to anon using (true);
create policy "read collections"   on collections        for select to anon using (true);
create policy "read products"      on products           for select to anon using (is_published);
create policy "read variants"      on product_variants   for select to anon using (true);
create policy "read prod_col"      on product_collections for select to anon using (true);
create policy "read reviews"       on reviews            for select to anon using (is_published);

-- Public WRITE lead (chỉ insert)
create policy "insert lead"        on leads              for insert to anon with check (true);

-- Public WRITE order (chỉ insert — checkout)
create policy "insert order"       on orders             for insert to anon with check (true);
create policy "insert order_items" on order_items        for insert to anon with check (true);

-- ============================================================
-- SEED — 4 sản phẩm mẫu khớp website (thay bằng hàng thật sau)
-- ============================================================
insert into brands(slug,name,country) values
  ('dior','Dior','Pháp'),('chanel','Chanel','Pháp'),
  ('lelabo','Le Labo','Mỹ'),('mfk','Maison Francis Kurkdjian','Pháp')
on conflict do nothing;

insert into collections(slug,title,intro,sort) values
  ('nu','Nước hoa Nữ','Nước hoa nữ chính hãng nhập khẩu — chiết 5–10ml để thử, hoặc full nguyên seal.',1),
  ('nam','Nước hoa Nam','Nước hoa nam chính hãng — quốc dân & niche. Thử chiết trước, ưng rồi rước full.',2),
  ('unisex','Unisex & Niche','Những mùi phá vỡ ranh giới nam nữ — độc bản, sang trọng.',3)
on conflict do nothing;

insert into products(slug,name,brand_slug,category,gender,description,notes,longevity,sillage,is_niche,badge,hero_image,gallery) values
  ('sauvage','Dior Sauvage EDP','dior','Eau de Parfum · Nam','nam','Tươi mát và nam tính — bergamot Calabria, tiêu Sichuan trên nền ambroxan và gỗ khoáng.','{"top":"Bergamot Calabria","mid":"Tiêu Sichuan","base":"Ambroxan · Gỗ"}',4,4,false,'Best seller','https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1300&q=85','["https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1300&q=85","https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=1000&q=85","https://images.unsplash.com/photo-1557170334-a9632e77c6e4?auto=format&fit=crop&w=1000&q=85"]'),
  ('coco','Chanel Coco Mademoiselle','chanel','Eau de Parfum · Nữ','nu','Quyến rũ và sang trọng — cam bergamot dẫn vào hoa hồng, nhài, khép bằng patchouli và vani.','{"top":"Cam · Bergamot","mid":"Hoa hồng · Nhài","base":"Patchouli · Vani"}',4,3,false,null,'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1300&q=85','["https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1300&q=85","https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1000&q=85","https://images.unsplash.com/photo-1610461888750-10bfc601b874?auto=format&fit=crop&w=1000&q=85"]'),
  ('santal33','Le Labo Santal 33','lelabo','Eau de Parfum · Unisex · Niche','unisex','Niche unisex đình đám — gỗ đàn hương kem béo, bạch đậu khấu, violet và chút da thuộc.','{"top":"Bạch đậu khấu","mid":"Violet · Gỗ đàn hương","base":"Da thuộc · Xạ hương"}',4,3,true,'Niche','https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=1300&q=85','["https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=1300&q=85","https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1000&q=85","https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85"]'),
  ('br540','MFK Baccarat Rouge 540','mfk','Eau de Parfum · Unisex · Niche','unisex','Huyền thoại niche — nghệ tây và nhài trên nền amberwood cùng long diên hương pha lê.','{"top":"Nghệ tây · Nhài","mid":"Amberwood","base":"Long diên hương · Gỗ"}',5,5,true,'Hot','https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1300&q=85','["https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1300&q=85","https://images.unsplash.com/photo-1592945403244-b3fbafd7d539?auto=format&fit=crop&w=1000&q=85","https://images.unsplash.com/photo-1590156225416-1a8fda5ec9dc?auto=format&fit=crop&w=1000&q=85"]')
on conflict do nothing;

insert into product_variants(product_slug,kind,label,volume_ml,price,sort) values
  ('sauvage','chiet','Chiết 5ml',5,100000,1),('sauvage','chiet','Chiết 10ml',10,180000,2),('sauvage','full','Full 100ml',100,2750000,3),
  ('coco','chiet','Chiết 5ml',5,140000,1),('coco','chiet','Chiết 10ml',10,250000,2),('coco','full','Full 50ml',50,2950000,3),
  ('santal33','chiet','Chiết 5ml',5,250000,1),('santal33','chiet','Chiết 10ml',10,450000,2),('santal33','full','Full 50ml',50,5900000,3),
  ('br540','chiet','Chiết 5ml',5,270000,1),('br540','chiet','Chiết 10ml',10,480000,2),('br540','full','Full 70ml',70,6500000,3)
on conflict do nothing;

insert into product_collections(product_slug,collection_slug) values
  ('coco','nu'),('br540','nu'),
  ('sauvage','nam'),('santal33','nam'),
  ('santal33','unisex'),('br540','unisex')
on conflict do nothing;
