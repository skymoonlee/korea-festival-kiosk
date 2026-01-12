export interface Category {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  is_available: boolean;
  created_at: string;
  optionGroups?: OptionGroup[];
}

export interface OptionGroup {
  id: number;
  menu_item_id: number;
  name: string;
  is_required: boolean;
  max_select: number;
  created_at: string;
  choices?: OptionChoice[];
}

export interface OptionChoice {
  id: number;
  option_group_id: number;
  name: string;
  price_modifier: number;
  is_default: boolean;
  created_at: string;
}

export interface SetMenu {
  id: number;
  name: string;
  price: number;
  description?: string;
  is_available: boolean;
  created_at: string;
  items?: SetMenuItem[];
}

export interface SetMenuItem {
  id: number;
  set_menu_id: number;
  menu_item_id: number;
  quantity: number;
  menuItem?: MenuItem;
}

export interface Order {
  id: number;
  order_number: number;
  status: 'pending' | 'cooking' | 'completed' | 'cancelled';
  total_price: number;
  created_at: string;
  completed_at?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id?: number;
  set_menu_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
  options_json?: string;
  options?: SelectedOption[];
}

export interface SelectedOption {
  groupName: string;
  choiceName: string;
  priceModifier: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[];
  totalPrice: number;
}

export interface AdminUser {
  id: number;
  username: string;
  created_at: string;
}
