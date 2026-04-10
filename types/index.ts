export type StockLevel = 'ok' | 'low' | 'out'

export interface InventoryItem {
  id: string
  name: string
  category: string
  stock_level: StockLevel
  updated_at: string
}

export interface ShoppingItem {
  id: string
  item_name: string
  inventory_item_id: string | null
  is_purchased: boolean
  created_at: string
}

export interface Memo {
  id: string
  author: string
  content: string
  created_at: string
}

export interface CalendarEvent {
  id: string
  summary: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  description?: string
  colorId?: string
}
