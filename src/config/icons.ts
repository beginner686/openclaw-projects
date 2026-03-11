import {
  Bell,
  Briefcase,
  Camera,
  Connection,
  DataLine,
  Document,
  DocumentChecked,
  EditPen,
  Grid,
  Histogram,
  Lock,
  Reading,
  Search,
  Tickets,
  TrendCharts,
  User,
} from '@element-plus/icons-vue'

export const iconMap = {
  Bell,
  Briefcase,
  Camera,
  Connection,
  DataLine,
  Document,
  DocumentChecked,
  EditPen,
  Grid,
  Histogram,
  Lock,
  Reading,
  Search,
  Tickets,
  TrendCharts,
  User,
} as const

export type IconName = keyof typeof iconMap
