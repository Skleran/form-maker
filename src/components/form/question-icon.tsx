import * as React from "react"
import {
  BadgeDollarSign,
  Briefcase,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Heart,
  HelpCircle,
  Hash,
  ImageIcon,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Star,
  Tag,
  User,
  type LucideIcon,
} from "lucide-react"

export interface QuestionIconOption {
  value: string
  label: string
  icon: LucideIcon
}

export const QUESTION_ICON_OPTIONS: QuestionIconOption[] = [
  { value: "user", label: "Kullanıcı / Kişi", icon: User },
  { value: "mail", label: "E-posta", icon: Mail },
  { value: "phone", label: "Telefon", icon: Phone },
  { value: "calendar", label: "Tarih / Randevu", icon: Calendar },
  { value: "clock", label: "Saat / Zaman", icon: Clock },
  { value: "map-pin", label: "Konum / Adres", icon: MapPin },
  { value: "star", label: "Değerlendirme / Yıldız", icon: Star },
  { value: "building", label: "Şirket / Kurum", icon: Building },
  { value: "briefcase", label: "İş / Departman", icon: Briefcase },
  { value: "file-text", label: "Belge / Metin", icon: FileText },
  { value: "message-square", label: "Yorum / Geri Bildirim", icon: MessageSquare },
  { value: "hash", label: "Sayı / Kod", icon: Hash },
  { value: "heart", label: "Beğeni / Tercih", icon: Heart },
  { value: "tag", label: "Kategori / Etiket", icon: Tag },
  { value: "dollar", label: "Ücret / Bütçe", icon: BadgeDollarSign },
  { value: "shield", label: "Güvenlik / Onay", icon: ShieldCheck },
  { value: "help", label: "Soru / Destek", icon: HelpCircle },
  { value: "check", label: "Doğrulama / Kontrol", icon: CheckCircle2 },
  { value: "image", label: "Görsel / Medya", icon: ImageIcon },
]

export const QUESTION_ICON_MAP: Record<string, LucideIcon> = QUESTION_ICON_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.icon
    return acc
  },
  {} as Record<string, LucideIcon>
)

interface QuestionIconProps {
  name?: string | null
  className?: string
}

export function QuestionIcon({ name, className = "size-4" }: QuestionIconProps) {
  if (!name) return null
  const IconComponent = QUESTION_ICON_MAP[name]
  if (!IconComponent) return null
  return <IconComponent className={className} />
}
