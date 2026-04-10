'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, Check, Plus, Pencil, Trash2, X } from 'lucide-react'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('inventory_items')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setItems(data as InventoryItem[])
        setLoading(false)
      })

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

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  useEffect(() => {
    if (addingCategory && addInputRef.current) addInputRef.current.focus()
  }, [addingCategory])

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
    if (next === 'low' || next === 'out') {
      await autoAddToShopping(item)
    }
  }

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setEditingName(item.name)
  }

  const saveEdit = async (item: InventoryItem) => {
    const name = editingName.trim()
    if (!name || name === item.name) {
      setEditingId(null)
      return
    }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, name } : i))
    setEditingId(null)
    await supabase
      .from('inventory_items')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', item.id)
  }

  const deleteItem = async (item: InventoryItem) => {
    if (!confirm(`「${item.name}」を削除しますか？`)) return
    setItems(prev => prev.filter(i => i.id !== item.id))
    await supabase.from('inventory_items').delete().eq('id', item.id)
  }

  const addItem = async (category: string) => {
    const name = newItemName.trim()
    if (!name) { setAddingCategory(null); return }
    setAddingCategory(null)
    setNewItemName('')
    await supabase.from('inventory_items').insert({
      name,
      category,
      stock_level: 'ok',
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  const renderItem = (item: InventoryItem, idx: number, total: number) => {
    const stock = STOCK_CONFIG[item.stock_level]
    const added = addedIds.has(item.id)
    const isEditing = editingId === item.id

    return (
      <div
        key={item.id}
        className={`flex items-center px-4 py-3 gap-2 ${idx < total - 1 ? 'border-b border-gray-50' : ''}`}
      >
        {isEditing ? (
          <input
            ref={editInputRef}
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            onBlur={() => saveEdit(item)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(item); if (e.key === 'Escape') setEditingId(null) }}
            className="flex-1 text-sm font-medium text-gray-800 border-b border-indigo-400 outline-none bg-transparent"
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-gray-800">{item.name}</span>
        )}

        {/* 編集ボタン */}
        <button
          onClick={() => isEditing ? saveEdit(item) : startEdit(item)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 active:scale-95"
        >
          {isEditing ? <Check size={14} className="text-indigo-500" /> : <Pencil size={13} />}
        </button>

        {/* 在庫バッジ */}
        <button
          onClick={() => cycleStock(item)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 ${stock.className}`}
        >
          {stock.label}
        </button>

        {/* 買い物リストへ追加 */}
        <button
          onClick={() => autoAddToShopping(item)}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95 ${
            added ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {added ? <Check size={15} /> : <ShoppingCart size={15} />}
        </button>

        {/* 削除ボタン */}
        <button
          onClick={() => deleteItem(item)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 active:scale-95"
        >
          <Trash2 size={13} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        className="bg-white px-4 pb-4 border-b border-gray-100"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <h1 className="text-xl font-bold text-gray-900">在庫管理</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          ✏️ 品名編集 ／ バッジで在庫更新（残り少・なしで買い物リストへ自動追加）
        </p>
      </div>

      <div className="px-4 py-4 space-y-6">
        {CATEGORIES.map(category => {
          const categoryItems = items.filter(i => i.category === category)

          return (
            <section key={category}>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                {category}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {categoryItems.map((item, idx) => renderItem(item, idx, categoryItems.length))}

                {/* アイテム追加行 */}
                {addingCategory === category ? (
                  <div className="flex items-center px-4 py-3 gap-2 border-t border-gray-50">
                    <input
                      ref={addInputRef}
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addItem(category); if (e.key === 'Escape') { setAddingCategory(null); setNewItemName('') } }}
                      placeholder="品名を入力..."
                      className="flex-1 text-sm text-gray-800 border-b border-indigo-400 outline-none bg-transparent"
                    />
                    <button onClick={() => addItem(category)} className="text-xs text-indigo-600 font-semibold">追加</button>
                    <button onClick={() => { setAddingCategory(null); setNewItemName('') }} className="text-gray-300"><X size={14} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingCategory(category)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-xs text-gray-400 border-t border-gray-50 active:bg-gray-50"
                  >
                    <Plus size={14} />
                    <span>アイテムを追加</span>
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
