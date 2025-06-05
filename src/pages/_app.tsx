import { 
  Home, 
  PieChart, 
  TrendingUp, 
  BookOpen, 
  FileText, 
  Users, 
  Settings, 
  List, 
  PlusCircle,
  BarChart,
  Sparkles 
} from "lucide-react"; 

const menuItems = [
  { 
    title: "Recomendações",
    href: "/recommendations",
    icon: TrendingUp,
    submenu: [
      { 
        title: "Listar Recomendações", 
        href: "/recommendations",
        icon: List,
      },
      { 
        title: "Nova Recomendação", 
        href: "/recommendations/new",
        icon: PlusCircle,
      },
      { 
        title: "Visão Geral do Sistema", 
        href: "/recommendations/overview",
        icon: BarChart,
      }
    ]
  },
]; 