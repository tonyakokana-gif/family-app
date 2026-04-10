'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Check, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { InventoryItem, StockLevel } from '@/types'

const STOCK_CONFIG: Record<StockLevel, { label: string; className: string }> = {
  ok:  { label: '十分',    className: 'bg-emerald-100 text-emerald-700' },
  low: { label: '残り少',  className: 'bg-amber-100  text-amber-700'   },
  out: { label: 'なし',    className: 'bg-red-100    text-red-600'     },
}

const NEXT_STOCK: Record<StockLevel, StockLevel> = {
  ok: 'low', low: 'out', out: 'ok',
}

const CATEGORIES = ['日用品', '調味料']

export default function InventoryList() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // 初回フェッチ
    supabase
      .from('inventory_items')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setItems(data as InventoryItem[])
        setLoading(false)
      })

    // リアルタイム購読
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        payload => {
          setItems(prev => {
            if (payload.eventType === 'UPDATE') {
              return prev.map(item =>
                item.id === (payload.new as InventoryItem).id
                  ? (payload.new as InventoryItem)
                  : item
              )
            }
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as InventoryItem].sort((a, b) =>
                a.name.localeCompare(b.name, 'ja')
              )
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(item => item.id !== (payload.old as { id: string }).id)
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const autoAddToShopping = async (item: InventoryItem) => {
    if (addedIds.has(item.id)) return
    const { error } = await supabase.from('shopping_list').insert({
      item_name: item.name,
      inventory_item_id: item.id,
      is_purchased: false,
    })
    if (!error) {
      setAddedIds(prev => { const s = new Set(prev); s.add(item.id); return s })
      setTimeout(
        () => setAddedIds(prev => { const s = new Set(prev); s.delete(item.id); return s }),
        2000
      )
    }
  }

  const cycleStock = async (item: InventoryItem) => {
    const next = NEXT_STOCK[item.stock_level]
    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, stock_level: next } : i))
    )
    await supabase
      .from('inventory_items')
      .update({ stock_level: next, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    // 残り少・なしになったら自動で買い物リストに追加
    if (next === 'low' || next === 'out') {
      await autoAddToShopping(item)
    }
  }

  const addToShopping = async (item: InventoryItem) => {
    await autoAddToShopping(item)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* ヘッダー */}
      <div
        className="bg-white px-4 pb-4 border-b border-gray-100"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <h1 className="text-xl font-bold text-gray-900">在庫管理</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          バッジをタップ → 在庫更新（残り少・なしで自動的に買い物リストへ追加）
        </p>
      </div>

      <div className="px-4 py-4 space-y-6">
        {CATEGORIES.map(category => {
          const categoryItems = items.filter(i => i.category === category)
          if (categoryItems.length === 0) return null

          return (
            <section key={category}>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                {category}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {categoryItems.map((item, idx) => {
                  const stock = STOCK_CONFIG[item.stock_level]
                  const added = addedIds.has(item.id)

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center px-4 py-3 gap-3 ${
                        idx < categoryItems.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <span className="flex-1 text-sm font-medium text-gray-800">
                        {item.name}
                      </span>

                      {/* 在庫バッジ（タップで循環） */}
                      <button
                        onClick={() => cycleStock(item)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 ${stock.className}`}
                      >
                        {stock.label}
                      </button>

                      {/* 買い物リストへ追加 */}
                      <button
                        onClick={() => addToShopping(item)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95 ${
                          added
                            ? 'bg-emerald-500 text-white'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}
                      >
                        {added ? <Check size={15} /> : <ShoppingCart size={15} />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* 未登録カテゴリのアイテムがあれば表示 */}
        {(() => {
          const otherItems = items.filter(i => !CATEGORIES.includes(i.category))
          if (otherItems.length === 0) return null
          return (
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                その他
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {otherItems.map((item, idx) => {
                  const stock = STOCK_CONFIG[item.stock_level]
                  const added = addedIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center px-4 py-3 gap-3 ${
                        idx < otherItems.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <span className="flex-1 text-sm font-medium text-gray-800">{item.name}</span>
                      <button
                        onClick={() => cycleStock(item)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold active:scale-95 ${stock.className}`}
                      >
                        {stock.label}
                      </button>
                      <button
                        onClick={() => addToShopping(item)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full active:scale-95 ${
                          added ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600'
                        }`}
                      >
                        {added ? <Check size={15} /> : <ShoppingCart size={15} />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-300">
            <Plus size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">アイテムがありません</p>
            <p className="text-xs mt-1">SQLでシードデータを投入してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
