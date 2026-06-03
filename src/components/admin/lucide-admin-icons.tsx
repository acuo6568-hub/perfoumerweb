"use client";

import type { ComponentProps } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight as LucideArrowRight,
  BarChart3,
  Bell as LucideBell,
  CheckCircle as LucideCheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle as LucideCircle,
  ClipboardEdit,
  Clock as LucideClock,
  Copy as LucideCopy,
  Database as LucideDatabase,
  Download as LucideDownload,
  Eye as LucideEye,
  FileImage,
  Globe as LucideGlobe,
  Heart as LucideHeart,
  Image as ImageIcon,
  Layers3,
  Link as LucideLink,
  MailOpen,
  MessageCircle,
  NotebookPen,
  Package as LucidePackage,
  Paperclip as LucidePaperclip,
  Plus as LucidePlus,
  RefreshCw,
  Rows3,
  Save as LucideSave,
  Search as LucideSearch,
  Send as LucideSend,
  Sparkles as LucideSparkles,
  Tag as LucideTag,
  Trash2,
  Type as LucideType,
  Upload as LucideUpload,
  UserCircle as LucideUserCircle,
  Users as LucideUsers,
  X as LucideX,
} from "lucide-react";

type AdminIconProps = ComponentProps<typeof LucideSearch> & {
  weight?: string;
};

function withAdminIcon(Icon: typeof LucideSearch) {
  return function AdminIcon({ weight: _weight, strokeWidth = 1.8, ...props }: AdminIconProps) {
    return <Icon strokeWidth={strokeWidth} {...props} />;
  };
}

export const ArrowsClockwise = withAdminIcon(RefreshCw);
export const ArrowClockwise = withAdminIcon(RefreshCw);
export const ArrowCounterClockwise = withAdminIcon(RefreshCw);
export const ArrowRightIcon = withAdminIcon(LucideArrowRight);
export const ArrowRightLucide = withAdminIcon(LucideArrowRight);
export const ArrowRightCompat = withAdminIcon(LucideArrowRight);
export const ArrowRightSimple = withAdminIcon(LucideArrowRight);
export const ArrowRightAlt = withAdminIcon(LucideArrowRight);
export const ArrowRightAdmin = withAdminIcon(LucideArrowRight);
export const ArrowRightLine = withAdminIcon(LucideArrowRight);
export const ArrowRightCircle = withAdminIcon(LucideArrowRight);
export const ArrowRightPlain = withAdminIcon(LucideArrowRight);
export const ArrowRightThin = withAdminIcon(LucideArrowRight);
export const ArrowRight = withAdminIcon(LucideArrowRight);
export const ArrowUpRight = withAdminIcon(LucideArrowRight);
export const CaretLeft = withAdminIcon(ChevronLeft);
export const CaretRight = withAdminIcon(ChevronRight);
export const CheckCircleIcon = withAdminIcon(LucideCheckCircle);
export const CheckCircleCompat = withAdminIcon(LucideCheckCircle);
export const CheckCircleAdmin = withAdminIcon(LucideCheckCircle);
export const CheckCircleThin = withAdminIcon(LucideCheckCircle);
export const CheckCircleFilled = withAdminIcon(LucideCheckCircle);
export const CheckCircleSimple = withAdminIcon(LucideCheckCircle);
export const CheckCircleRound = withAdminIcon(LucideCheckCircle);
export const CheckCircleLine = withAdminIcon(LucideCheckCircle);
export const CheckCircle = withAdminIcon(LucideCheckCircle);
export const CircleNotch = withAdminIcon(LucideCircle);
export const ClockCounterClockwise = withAdminIcon(LucideClock);
export const ClockIcon = withAdminIcon(LucideClock);
export const ClockCompat = withAdminIcon(LucideClock);
export const Clock = withAdminIcon(LucideClock);
export const Code = withAdminIcon(ClipboardEdit);
export const CopySimple = withAdminIcon(LucideCopy);
export const DatabaseIcon = withAdminIcon(LucideDatabase);
export const Database = withAdminIcon(LucideDatabase);
export const DownloadSimple = withAdminIcon(LucideDownload);
export const EnvelopeOpen = withAdminIcon(MailOpen);
export const EyeIcon = withAdminIcon(LucideEye);
export const Eye = withAdminIcon(LucideEye);
export const FloppyDisk = withAdminIcon(LucideSave);
export const FunnelSimple = withAdminIcon(Layers3);
export const HeartIcon = withAdminIcon(LucideHeart);
export const Heart = withAdminIcon(LucideHeart);
export const Image = withAdminIcon(ImageIcon);
export const ImageSquare = withAdminIcon(FileImage);
export const Link = withAdminIcon(LucideLink);
export const LinkSimple = withAdminIcon(LucideLink);
export const MagnifyingGlass = withAdminIcon(LucideSearch);
export const NotePencil = withAdminIcon(NotebookPen);
export const PackageIcon = withAdminIcon(LucidePackage);
export const Package = withAdminIcon(LucidePackage);
export const PaperclipIcon = withAdminIcon(LucidePaperclip);
export const Paperclip = withAdminIcon(LucidePaperclip);
export const PaperPlaneRight = withAdminIcon(LucideSend);
export const PlusIcon = withAdminIcon(LucidePlus);
export const Plus = withAdminIcon(LucidePlus);
export const Rows = withAdminIcon(Rows3);
export const SignOut = withAdminIcon(ArrowLeft);
export const Sparkle = withAdminIcon(LucideSparkles);
export const Spinner = withAdminIcon(RefreshCw);
export const SquaresFour = withAdminIcon(BarChart3);
export const TagIcon = withAdminIcon(LucideTag);
export const Tag = withAdminIcon(LucideTag);
export const TextT = withAdminIcon(LucideType);
export const TrendUp = withAdminIcon(BarChart3);
export const Trash = withAdminIcon(Trash2);
export const UploadSimple = withAdminIcon(LucideUpload);
export const UserCircleIcon = withAdminIcon(LucideUserCircle);
export const UserCircle = withAdminIcon(LucideUserCircle);
export const UsersIcon = withAdminIcon(LucideUsers);
export const Users = withAdminIcon(LucideUsers);
export const WarningCircle = withAdminIcon(AlertCircle);
export const XIcon = withAdminIcon(LucideX);
export const XLogo = withAdminIcon(LucideX);
export const X = withAdminIcon(LucideX);

export const BellIcon = withAdminIcon(LucideBell);
export const BellAdmin = withAdminIcon(LucideBell);
export const BellCompat = withAdminIcon(LucideBell);
export const BellSimple = withAdminIcon(LucideBell);
export const Bell = withAdminIcon(LucideBell);
export const FacebookLogo = withAdminIcon(LucideGlobe);
export const GlobeIcon = withAdminIcon(LucideGlobe);
export const Globe = withAdminIcon(LucideGlobe);
export const GoogleLogo = withAdminIcon(LucideGlobe);
export const InstagramLogo = withAdminIcon(LucideGlobe);
export const MetaLogo = withAdminIcon(LucideGlobe);
export const PinterestLogo = withAdminIcon(LucideGlobe);
export const RedditLogo = withAdminIcon(LucideGlobe);
export const SnapchatLogo = withAdminIcon(LucideGlobe);
export const TiktokLogo = withAdminIcon(LucideGlobe);
export const TwitterLogo = withAdminIcon(LucideGlobe);
export const WhatsappLogo = withAdminIcon(MessageCircle);
export const YoutubeLogo = withAdminIcon(LucideGlobe);
