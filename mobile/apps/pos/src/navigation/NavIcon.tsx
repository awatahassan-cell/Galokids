import type { ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  type LucideProps,
  MessageSquare,
  Package,
  PlusCircle,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
  Tags,
  Ticket,
  TrendingUp,
  Truck,
  UserCog,
  Users,
} from 'lucide-react-native';
import { colors } from '@/theme';

/**
 * The back office's icons, taken from the panel rather than invented.
 *
 * The web panel draws its navigation with Lucide, one named glyph per tab.
 * Emoji were standing in for them here, which is why a shopkeeper moving
 * between the panel and the till saw two different pictures for the same job —
 * and why the rail looked like a list of stickers rather than a tool.
 *
 * Every name below is the same glyph the panel uses for that tab, so the two
 * stay recognisable as one system.
 */

export type NavIconName =
  | 'dashboard' | 'calendar' | 'profit' | 'till' | 'orders' | 'social' | 'pos-sales'
  | 'page-order' | 'shifts' | 'products' | 'purchases' | 'inventory' | 'ledger'
  | 'suppliers' | 'categories' | 'labels' | 'expenses' | 'coupons' | 'banner'
  | 'customers' | 'staff' | 'cashiers' | 'messages' | 'reviews' | 'activity'
  | 'settings';

const GLYPHS: Record<NavIconName, ComponentType<LucideProps>> = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  profit: TrendingUp,
  till: Receipt,
  orders: ShoppingBag,
  social: Smartphone,
  'pos-sales': Store,
  'page-order': PlusCircle,
  shifts: ClipboardList,
  products: Package,
  purchases: Truck,
  inventory: Boxes,
  ledger: History,
  suppliers: Truck,
  categories: Tags,
  labels: FileText,
  expenses: DollarSign,
  coupons: Ticket,
  banner: ImageIcon,
  customers: Users,
  staff: UserCog,
  cashiers: BarChart3,
  messages: MessageSquare,
  reviews: Star,
  activity: ShieldCheck,
  settings: Settings,
};

export function NavIcon({
  name,
  size = 18,
  color = colors.textMuted,
}: {
  name: NavIconName;
  size?: number;
  color?: string;
}) {
  const Glyph = GLYPHS[name] ?? Activity;

  return <Glyph size={size} color={color} strokeWidth={2} />;
}
