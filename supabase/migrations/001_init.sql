-- =============================================
-- 家族アプリ データベース初期化
-- Supabase SQL Editor で実行してください
-- =============================================

-- ① 在庫管理テーブル
create table if not exists inventory_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default '日用品',
  stock_level text not null default 'ok'
                check (stock_level in ('ok', 'low', 'out')),
  updated_at  timestamptz default now()
);

-- ② 買い物リストテーブル
create table if not exists shopping_list (
  id                  uuid primary key default gen_random_uuid(),
  item_name           text not null,
  inventory_item_id   uuid references inventory_items(id) on delete set null,
  is_purchased        boolean not null default false,
  created_at          timestamptz default now()
);

-- ③ メモ掲示板テーブル
create table if not exists memos (
  id         uuid primary key default gen_random_uuid(),
  author     text not null,
  content    text not null,
  created_at timestamptz default now()
);

-- =============================================
-- RLS（Row Level Security）設定
-- 家族間で共有するため全操作を許可
-- =============================================
alter table inventory_items enable row level security;
alter table shopping_list    enable row level security;
alter table memos            enable row level security;

create policy "family_all_inventory" on inventory_items for all using (true) with check (true);
create policy "family_all_shopping"  on shopping_list    for all using (true) with check (true);
create policy "family_all_memos"     on memos            for all using (true) with check (true);

-- =============================================
-- Realtime 有効化
-- =============================================
alter publication supabase_realtime add table inventory_items;
alter publication supabase_realtime add table shopping_list;
alter publication supabase_realtime add table memos;

-- =============================================
-- 初期データ（在庫アイテム）
-- =============================================
insert into inventory_items (name, category, stock_level) values
  -- 日用品
  ('トイレットペーパー', '日用品', 'ok'),
  ('ティッシュ',         '日用品', 'ok'),
  ('キッチンペーパー',   '日用品', 'ok'),
  ('洗剤（食器用）',     '日用品', 'ok'),
  ('洗剤（洗濯用）',     '日用品', 'ok'),
  ('柔軟剤',             '日用品', 'ok'),
  ('シャンプー',         '日用品', 'ok'),
  ('コンディショナー',   '日用品', 'ok'),
  ('ボディソープ',       '日用品', 'ok'),
  ('歯磨き粉',           '日用品', 'ok'),
  ('ハンドソープ',       '日用品', 'ok'),
  ('ゴミ袋（大）',       '日用品', 'ok'),
  ('ゴミ袋（小）',       '日用品', 'ok'),
  ('ラップ',             '日用品', 'ok'),
  ('アルミホイル',       '日用品', 'ok'),
  -- 調味料
  ('醤油',     '調味料', 'ok'),
  ('みりん',   '調味料', 'ok'),
  ('料理酒',   '調味料', 'ok'),
  ('砂糖',     '調味料', 'ok'),
  ('塩',       '調味料', 'ok'),
  ('サラダ油', '調味料', 'ok'),
  ('ごま油',   '調味料', 'ok'),
  ('味噌',     '調味料', 'ok'),
  ('酢',       '調味料', 'ok'),
  ('ケチャップ',   '調味料', 'ok'),
  ('マヨネーズ',   '調味料', 'ok'),
  ('ソース',       '調味料', 'ok'),
  ('めんつゆ',     '調味料', 'ok'),
  ('鶏がらスープの素', '調味料', 'ok'),
  ('コンソメ',     '調味料', 'ok')
on conflict do nothing;
