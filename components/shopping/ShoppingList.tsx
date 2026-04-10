'use client'

import { useState, useEffect } from 'react'
import { Trash2, Circle, CheckCircle2, ShoppingBag } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { ShoppingItem } from '@/types'

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('shopping_list')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setItems(data as ShoppingItem[])
        setLoading(false)
      })

    const channel = supabase
      .channel('shopping-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_list' },
        payload => {
          setItems(prev => {
            if (payload.eventType === 'INSERT') {
              // 重複防止
              if (prev.some(i => i.id === (payload.new as ShoppingItem).id)) return prev
              return [payload.new as ShoppingItem, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(item =>
                item.id === (payload.new as ShoppingItem).id
                  ? (payload.new as ShoppingItem)
                  : item
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

  const toggle = async (item: ShoppingItem) => {
    // 楽観的更新
    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i))
    )
    await supabase
      .from('shopping_list')
      .update({ is_purchased: !item.is_purchased })
      .eq('id', item.id)
  }

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('shopping_list').delete().eq('id', id)
  }

  const clearPurchased = async () => {
    const ids = items.filter(i => i.is_purchased).map(i => i.id)
    if (ids.length === 0) return
    setItems(prev => prev.filter(i => !i.is_purchased))
    await supabase.from('shopping_list').delete().in('id', ids)
  }

  const unpurchased = items.filter(i => !i.is_purchased)
  const purchased = items.filter(i => i.is_purchased)

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
        className="bg-white px-4 pb-4 border-b border-gray-100 flex items-end justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900">買い物リスト</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            未購入 {unpurchased.length} 件 ／ 合計 {items.length} 件
          </p>
        </div>
        {purchased.length > 0 && (
          <button
            onClick={clearPurchased}
            className="text-xs text-red-500 font-medium px-3 py-1.5 rounded-full bg-red-50 active:bg-red-100 transition-colors"
          >
            購入済みをクリア
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <ShoppingBag size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">買い物リストは空です</p>
            <p className="text-xs mt-1 text-gray-300">在庫画面のカートボタンから追加できます</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 未購入 */}
            {unpurchased.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {unpurchased.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center px-4 py-3.5 gap-3 ${
                      idx < unpurchased.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggle(item)}
                      className="text-gray-300 active:text-indigo-500 transition-colors flex-shrink-0"
                    >
                      <Circle size={22} />
                    </button>
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {item.item_name}
                    </span>
                    <button
                      onClick={() => remove(item.id)}
                      className="text-gray-300 active:text-red-400 p-1 flex-shrink-0 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 購入済み */}
            {purchased.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 px-1 mb-2">購入済み</p>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden opacity-60">
                  {purchased.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center px-4 py-3.5 gap-3 ${
                        idx < purchased.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <button
                        onClick={() => toggle(item)}
                        className="text-emerald-500 flex-shrink-0"
                      >
                        <CheckCircle2 size={22} />
                      </button>
                      <span className="flex-1 text-sm text-gray-400 line-through">
                        {item.item_name}
                      </span>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-gray-300 active:text-red-400 p-1 flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
