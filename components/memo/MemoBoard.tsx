'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale/ja'
import type { Memo } from '@/types'

const MEMBERS = [
  { name: '豪',  role: '父',  avatar: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700'    },
  { name: '美緒', role: '母',  avatar: 'bg-rose-400',    badge: 'bg-rose-100 text-rose-700'    },
  { name: '京弥', role: '息子', avatar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
]

function getMember(name: string) {
  return MEMBERS.find(m => m.name === name) ?? MEMBERS[0]
}

function formatDate(str: string): string {
  try {
    return format(new Date(str), 'M/d HH:mm', { locale: ja })
  } catch {
    return ''
  }
}

export default function MemoBoard() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [author, setAuthor] = useState('豪')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setMemos(data as Memo[])
      })

    const channel = supabase
      .channel('memos-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'memos' },
        payload => {
          setMemos(prev => {
            if (prev.some(m => m.id === (payload.new as Memo).id)) return prev
            return [payload.new as Memo, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'memos' },
        payload => {
          setMemos(prev => prev.filter(m => m.id !== (payload.old as { id: string }).id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const post = async () => {
    const trimmed = content.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setContent('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await supabase.from('memos').insert({ author, content: trimmed })
    setSubmitting(false)
  }

  const remove = async (id: string) => {
    await supabase.from('memos').delete().eq('id', id)
  }

  const member = getMember(author)

  return (
    <div>
      {/* ヘッダー + 投稿エリア */}
      <div
        className="bg-white border-b border-gray-100"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <div className="px-4 pb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-3">掲示板</h1>

          {/* 投稿者セレクター */}
          <div className="flex gap-2 mb-3">
            {MEMBERS.map(m => (
              <button
                key={m.name}
                onClick={() => setAuthor(m.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                  author === m.name
                    ? `${m.avatar} text-white shadow-sm`
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {m.name}
                <span className="text-[10px] opacity-75">{m.role}</span>
              </button>
            ))}
          </div>

          {/* 入力エリア */}
          <div className="flex gap-2 items-end">
            {/* アバター */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mb-0.5 ${member.avatar}`}
            >
              {author[0]}
            </div>

            {/* テキストエリア */}
            <div className="flex-1 bg-gray-100 rounded-2xl px-3.5 py-2.5">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => {
                  setContent(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    post()
                  }
                }}
                placeholder="ひとことどうぞ..."
                className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                rows={1}
                maxLength={500}
                style={{ minHeight: '22px', maxHeight: '120px' }}
              />
            </div>

            {/* 送信ボタン */}
            <button
              onClick={post}
              disabled={!content.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0 ${
                content.trim()
                  ? `${member.avatar} text-white`
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* メモ一覧（新しい順） */}
      <div className="px-4 py-4 space-y-3">
        {memos.length === 0 ? (
          <div className="text-center py-14 text-gray-300">
            <p className="text-sm">まだ投稿がありません</p>
            <p className="text-xs mt-1">最初のひとことを書いてみよう！</p>
          </div>
        ) : (
          memos.map(memo => {
            const m = getMember(memo.author)
            return (
              <div key={memo.id} className="flex gap-3">
                {/* アバター */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${m.avatar}`}
                >
                  {memo.author[0]}
                </div>

                {/* コンテンツ */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.badge}`}
                    >
                      {memo.author}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(memo.created_at)}</span>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                      {memo.content}
                    </p>
                  </div>
                </div>

                {/* 削除ボタン */}
                <button
                  onClick={() => remove(memo.id)}
                  className="text-gray-200 active:text-red-400 p-1 self-start mt-6 flex-shrink-0 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
