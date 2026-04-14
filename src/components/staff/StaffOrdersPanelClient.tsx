"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Ban2Outlined,
  BasketShopping3Outlined,
  Bell1Outlined,
  BoxClosedOutlined,
  CheckCircle1Outlined,
  HandTakingUserOutlined,
  Locked1Outlined,
  MapPin5Outlined,
  PhoneOutlined,
  PowerButtonOutlined,
  RefreshCircle1ClockwiseOutlined,
  Search1Outlined,
  StopwatchOutlined,
  TruckDelivery1Outlined,
  VolumeHighOutlined,
  VolumeOffOutlined,
  Wallet1Outlined,
  XmarkCircleOutlined,
} from "@lineiconshq/free-icons";
import Lineicons, { type LineiconsProps } from "@lineiconshq/react-lineicons";
import { AZERBAIJAN_CITIES, resolveAzerbaijanCity } from "@/lib/azerbaijan-cities";
import { formatMessage, type Locale } from "@/lib/i18n";

const STAFF_SFX_STORAGE_KEY = "perfoumer.staff.sfx-enabled.v1";

type StaffOrdersPanelClientProps = {
  configured: boolean;
  initialAuthenticated: boolean;
  locale: Locale;
};

type StaffOrder = {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  total_amount: number;
  currency: string;
  items_json: unknown;
  delivery_address_json: Record<string, unknown> | null;
  tracking_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

type OrderLog = {
  id: string;
  order_id: string;
  actor_role: string;
  actor_username: string;
  action: string;
  reason?: string | null;
  details?: string | null;
  created_at: string;
};

type OrderItem = {
  perfume_slug: string;
  perfume_name: string;
  size_ml: number;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type QueueTab = "new" | "preparing" | "ready" | "history";
type DeliveryFilter = "all" | "pickup" | "delivery";
type PaymentQuickFilter = "all" | "paid" | "cod";
type OperationalStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "handed_over"
  | "ready_for_dispatch"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

type OrderMode = "pickup" | "delivery";
type StatusTone = "neutral" | "success" | "error";

type StatusMessage = {
  tone: StatusTone;
  message: string;
};

type AddressFormState = {
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postal_code: string;
  country: string;
};

type ActionConfig = {
  label: string;
  nextStatus: OperationalStatus;
  tone: "primary" | "secondary";
  icon: "check" | "package" | "truck" | "handoff";
  details?: string;
};

type SynthNote = {
  frequency: number;
  durationMs: number;
  gainValue: number;
  delayMs?: number;
  type?: OscillatorType;
  detune?: number;
  glideToFrequency?: number;
};

type AppIconName =
  | "workspace"
  | "sfxOn"
  | "sfxOff"
  | "test"
  | "refresh"
  | "logout"
  | "search"
  | "phone"
  | "map"
  | "lock"
  | "wait"
  | "check"
  | "cancel"
  | "refund"
  | "warning"
  | "money"
  | "package"
  | "truck"
  | "handoff";

const DEFAULT_ADDRESS_FORM: AddressFormState = {
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  country: "Azerbaijan",
};

const AUTO_REFRESH_MS = 15000;

const APP_ICONS: Record<AppIconName, LineiconsProps["icon"]> = {
  workspace: BasketShopping3Outlined,
  sfxOn: VolumeHighOutlined,
  sfxOff: VolumeOffOutlined,
  test: Bell1Outlined,
  refresh: RefreshCircle1ClockwiseOutlined,
  logout: PowerButtonOutlined,
  search: Search1Outlined,
  phone: PhoneOutlined,
  map: MapPin5Outlined,
  lock: Locked1Outlined,
  wait: StopwatchOutlined,
  check: CheckCircle1Outlined,
  cancel: XmarkCircleOutlined,
  refund: RefreshCircle1ClockwiseOutlined,
  warning: Ban2Outlined,
  money: Wallet1Outlined,
  package: BoxClosedOutlined,
  truck: TruckDelivery1Outlined,
  handoff: HandTakingUserOutlined,
};

const STAFF_COPY_EN = {
  countryDefault: "Azerbaijan",
  customerFallback: "Customer",
  phoneFallback: "Not provided",
  storePickup: "Store pickup",
  deliveryAddressAvailable: "Delivery address available",
  paymentUnknown: "Unknown",
  queueEyebrow: "Fulfillment workspace",
  queueTitle: "Queue, prepare, handoff, dispatch.",
  queueDescription:
    "Designed for speed during store operations with large actions, clear states, and no pricing or catalog edits.",
  configuredTitle: "Staff portal is not configured",
  configuredDescription: "Set `STAFF_PASSWORD` or `ADMIN_PASSWORD` and redeploy.",
  loginTitle: "Store staff fulfillment",
  loginDescription:
    "Handle incoming orders, preparation, pickup handoff, and delivery dispatch without admin-level controls.",
  usernamePlaceholder: "Username",
  passwordPlaceholder: "Password",
  signIn: "Sign in",
  sfxMuted: "Sound effects muted.",
  sfxEnabled: "Sound effects enabled.",
  enableSfxFirst: "Enable SFX first to test sound.",
  soundTestPlayed: "Sound test played.",
  muteSfx: "Mute SFX",
  unmuteSfx: "Unmute SFX",
  testSfx: "Test SFX",
  refresh: "Refresh",
  refreshing: "Refreshing...",
  logout: "Logout",
  orderQueue: "Order queue",
  queueOnlyNeededNow: "Only the orders staff needs to act on right now.",
  status: "Status",
  type: "Type",
  payment: "Payment",
  paymentAdvanced: "Payment (advanced)",
  hidePayment: "Hide payment",
  allFilter: "All",
  cashOnDelivery: "Cash on delivery",
  searchPlaceholder: "Search order, customer, item",
  backToActiveQueue: "Back to active queue",
  viewHistory: "View history",
  activeQueue: "Active queue",
  historyQueue: "History queue",
  noOrdersTitle: "No orders in this queue",
  noOrdersDescription: "Try another tab or delivery filter.",
  noItemPreview: "No item preview available",
  orderDetail: "Order detail",
  orderLabel: "Order",
  customerLabel: "Customer",
  pickupLocation: "Pickup location",
  deliveryAddress: "Delivery address",
  pickupLocationValue: "Main store handoff counter",
  editingAddress: "Editing address",
  viewOnly: "View only",
  addressEditingHint: "Edit the fields below, then save the new address.",
  addressViewHint: "Click Change delivery address to make this editable.",
  customerNameRequired: "Customer name *",
  phoneRequired: "Phone number *",
  addressLine1Required: "Address line 1 *",
  addressLine2: "Address line 2",
  cityRequired: "City *",
  postalCode: "Postal code",
  country: "Country",
  phoneFormatHint: "Format: +994XXXXXXXXX",
  addressLine1Placeholder: "Street, building, entrance",
  addressLine2Placeholder: "Apartment, floor, landmark",
  fullNamePlaceholder: "Full name",
  selectCityPlaceholder: "Select city",
  postalCodePlaceholder: "AZ1000",
  countryPlaceholder: "Azerbaijan",
  unsavedChanges: "Unsaved changes",
  noUnsavedChanges: "No unsaved changes",
  saveChanges: "Save changes",
  saving: "Saving...",
  cancel: "Cancel",
  changeDeliveryAddress: "Change delivery address",
  items: "Items",
  total: "Total",
  notes: "Notes",
  actionPanel: "Action panel",
  orderCompleted: "Order completed",
  orderLockedDescription: "This order is locked after completion or exception handling.",
  noManualAction: "No manual action required right now.",
  operationalSummary: "Operational summary",
  waiting: "Waiting",
  orderType: "Order type",
  orderControls: "Order controls",
  noMoreActions: "No more action buttons are available for completed, cancelled, or refunded orders.",
  addressEditingActive:
    "Address editing is active. Save or cancel address changes to continue with refund/cancel actions.",
  supportActionsHint: "Use these buttons for customer support actions. Reason and note are collected in a popup.",
  cancelling: "Cancelling...",
  refunding: "Refunding...",
  cancelOrder: "Cancel order",
  refundOrder: "Refund order",
  selectOrder: "Select an order from the queue.",
  refundOrderTitle: "Refund this order",
  cancelOrderTitle: "Cancel this order",
  modalDescription: "Add a short reason and, if needed, an optional note. This will be saved to the activity log.",
  actionCannotUndo: "This action cannot be undone.",
  close: "Close",
  refundType: "Refund type",
  refundFull: "Full",
  refundPartial: "Partial",
  refundFullHint: "Returns the full captured amount.",
  refundPartialHint: "Returns only a portion of the captured amount.",
  refundAmount: "Refund amount",
  maxAllowed: "Maximum allowed: {amount} {currency}",
  refundAmountInvalid: "Enter an amount between 0 and {amount} {currency}.",
  refundReasonRequired: "Reason for refund (required)",
  cancelReasonRequired: "Reason for cancel (required)",
  refundReasonPlaceholder: "e.g. damaged item, wrong product",
  cancelReasonPlaceholder: "e.g. customer request, duplicate order",
  optionalNote: "Optional note",
  optionalNotePlaceholder: "Add context for the log or customer follow-up",
  back: "Back",
  processingPartialRefund: "Processing partial refund...",
  processingRefund: "Processing refund...",
  confirmPartialRefund: "Confirm partial refund",
  confirmFullRefund: "Confirm full refund",
  confirmRefundAmount: "Refund {amount} {currency}",
  confirmCancel: "Confirm cancel",
  handoffEyebrow: "Handoff checkpoint",
  handoffTitle: "Verify before handing over",
  handoffDescription: "Use the order number, customer phone, or pickup code below before final release.",
  customerCard: "Customer",
  orderId: "Order ID",
  phone: "Phone",
  pickupCode: "Pickup code",
  itemsInHandoff: "Items in handoff",
  confirmHandover: "Confirm handover",
  handoffLockHint: "Order locks after handover and closes automatically.",
  auditTitle: "Audit log",
  auditDescription: "Every fulfillment action stays visible for review.",
  auditUpdatedBy: "Updated by {username} ({role})",
  auditReason: "Reason",
  auditUpdate: "Update",
  auditEmpty: "No activity logged for this order yet.",
  failedLoadOrders: "Failed to load orders.",
  failedLoadOrderDetail: "Failed to load order detail.",
  refreshingLatestOrders: "Refreshing latest orders...",
  ordersRefreshed: "Orders refreshed.",
  addressEditorOpened: "Delivery address editor opened.",
  discardUnsavedAddress: "Discard unsaved address changes?",
  addressEditCancelled: "Address edit cancelled.",
  loginFailed: "Login failed.",
  staffSessionStarted: "Staff session started.",
  loggedOut: "Logged out.",
  statusUpdateFailed: "Status update failed.",
  orderMovedToStatus: "Order moved to {status}.",
  pickupCompletedDetails: "Pickup handoff completed.",
  deliveryCompletedDetails: "Delivery completed.",
  noAddressChanges: "No address changes to save.",
  fillAddressRequired: "Fill full name, phone, line 1, and city before saving address.",
  refundReasonMissing: "Please add a reason for this refund.",
  partialRefundInvalid: "Enter a valid partial refund amount.",
  partialRefundTooHigh: "Partial refund cannot exceed the order total.",
  actionReasonMissing: "Please add a reason for this action.",
  orderUpdateFailed: "Order update failed.",
  partialRefundSuccess: "Partial refund completed successfully.",
  refundSuccess: "Order refunded successfully.",
  cancelSuccess: "Order cancelled successfully.",
  addressUpdated: "Delivery address updated.",
  fillRequiredFields: "Fill full name, phone, line 1, and city before saving address.",
  noValue: "No value",
  statusLabels: {
    new: "New",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    handed_over: "Handed Over",
    ready_for_dispatch: "Ready for Dispatch",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
  },
  queueLabels: {
    new: "New",
    preparing: "Preparing",
    ready: "Ready",
    history: "History",
  },
  modeLabels: {
    pickup: "Pickup",
    delivery: "Delivery",
  },
  paymentLabels: {
    completed: "Paid",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
  },
  auditLabels: {
    status_change: "Status updated",
    price_change: "Price updated",
    address_change: "Delivery address updated",
    refund: "Order refunded",
    cancel: "Order cancelled",
    fallback: "Order event",
  },
  actionLabels: {
    confirmOrder: "Confirm Order",
    startPreparing: "Start Preparing",
    readyForPickup: "Ready for Pickup",
    readyForDispatch: "Ready for Dispatch",
    markOutForDelivery: "Mark Out for Delivery",
    markDelivered: "Mark Delivered",
    enterHandoffMode: "Enter Handoff Mode",
    completeOrder: "Complete Order",
  },
  actionDetails: {
    confirmOrder: "Order confirmed and moved into the fulfillment queue.",
    startPreparing: "Your order is now being prepared.",
    readyForPickup: "Your order is ready for pickup.",
    readyForDispatch: "Your order is packed and ready for dispatch.",
    markOutForDelivery: "Your order is now out for delivery.",
    markDelivered: "Your order has been delivered.",
    completeOrder: "Order completed.",
  },
  waitMinutes: "{minutes} min",
  waitAgoMinutes: "{minutes}m ago",
  waitAgoHours: "{hours}h ago",
  waitAgoHoursMinutes: "{hours}h {minutes}m ago",
} as const;

const STAFF_COPY_AZ = {
  countryDefault: "Azərbaycan",
  customerFallback: "Müştəri",
  phoneFallback: "Təqdim edilməyib",
  storePickup: "Mağazadan götürmə",
  deliveryAddressAvailable: "Çatdırılma ünvanı mövcuddur",
  paymentUnknown: "Naməlum",
  queueEyebrow: "İcra iş sahəsi",
  queueTitle: "Növbə, hazırlıq, təhvil, çatdırılma.",
  queueDescription:
    "Mağaza işində sürət üçün qurulub: iri əməliyyat düymələri, aydın vəziyyətlər və əlavə admin müdaxiləsi olmadan sadə axın.",
  configuredTitle: "Əməkdaş paneli aktiv deyil",
  configuredDescription: "`STAFF_PASSWORD` və ya `ADMIN_PASSWORD` təyin edin və tətbiqi yenidən yayımlayın.",
  loginTitle: "Mağaza əməkdaş paneli",
  loginDescription:
    "Daxil olan sifarişləri, hazırlıq mərhələsini, təhvil prosesini və çatdırılmanı admin səlahiyyətləri olmadan idarə edin.",
  usernamePlaceholder: "İstifadəçi adı",
  passwordPlaceholder: "Şifrə",
  signIn: "Daxil ol",
  sfxMuted: "Səs effektləri söndürüldü.",
  sfxEnabled: "Səs effektləri aktivləşdirildi.",
  enableSfxFirst: "Səsi yoxlamaq üçün əvvəlcə SFX-i aktiv edin.",
  soundTestPlayed: "Səs testi səsləndirildi.",
  muteSfx: "SFX-i söndür",
  unmuteSfx: "SFX-i aktiv et",
  testSfx: "Səsi yoxla",
  refresh: "Yenilə",
  refreshing: "Yenilənir...",
  logout: "Çıxış",
  orderQueue: "Sifariş növbəsi",
  queueOnlyNeededNow: "Hazırda əməkdaş müdaxiləsi tələb olunan sifarişlər.",
  status: "Status",
  type: "Növ",
  payment: "Ödəniş",
  paymentAdvanced: "Ödəniş (əlavə)",
  hidePayment: "Ödənişi gizlət",
  allFilter: "Hamısı",
  cashOnDelivery: "Qapıda ödəniş",
  searchPlaceholder: "Sifariş, müştəri və ya məhsul axtar",
  backToActiveQueue: "Aktiv növbəyə qayıt",
  viewHistory: "Tarixçəni göstər",
  activeQueue: "Aktiv növbə",
  historyQueue: "Tarixçə",
  noOrdersTitle: "Bu növbədə sifariş yoxdur",
  noOrdersDescription: "Başqa tab və ya filtr seçin.",
  noItemPreview: "Məhsul xülasəsi hələ yoxdur",
  orderDetail: "Sifariş detalları",
  orderLabel: "Sifariş",
  customerLabel: "Müştəri",
  pickupLocation: "Təhvil nöqtəsi",
  deliveryAddress: "Çatdırılma ünvanı",
  pickupLocationValue: "Əsas mağaza təhvil masası",
  editingAddress: "Ünvan redaktə olunur",
  viewOnly: "Yalnız baxış",
  addressEditingHint: "Aşağıdakı sahələri redaktə edin və sonra yeni ünvanı saxlayın.",
  addressViewHint: "Redaktə etmək üçün “Çatdırılma ünvanını dəyiş” düyməsinə basın.",
  customerNameRequired: "Ad və soyad *",
  phoneRequired: "Telefon nömrəsi *",
  addressLine1Required: "Əsas ünvan sətri *",
  addressLine2: "Əlavə ünvan sətri",
  cityRequired: "Şəhər *",
  postalCode: "Poçt kodu",
  country: "Ölkə",
  phoneFormatHint: "Format: +994XXXXXXXXX",
  addressLine1Placeholder: "Küçə, bina, giriş",
  addressLine2Placeholder: "Mənzil, mərtəbə, orientir",
  fullNamePlaceholder: "Ad və soyad",
  selectCityPlaceholder: "Şəhər seçin",
  postalCodePlaceholder: "AZ1000",
  countryPlaceholder: "Azərbaycan",
  unsavedChanges: "Saxlanılmamış dəyişikliklər",
  noUnsavedChanges: "Saxlanılmamış dəyişiklik yoxdur",
  saveChanges: "Dəyişiklikləri saxla",
  saving: "Saxlanılır...",
  cancel: "Ləğv et",
  changeDeliveryAddress: "Çatdırılma ünvanını dəyiş",
  items: "Məhsullar",
  total: "Cəmi",
  notes: "Qeyd",
  actionPanel: "Əməliyyat paneli",
  orderCompleted: "Sifariş tamamlanıb",
  orderLockedDescription: "Bu sifariş tamamlandıqdan və ya istisna əməliyyatından sonra kilidlənir.",
  noManualAction: "Hazırda manual əməliyyat tələb olunmur.",
  operationalSummary: "Əməliyyat xülasəsi",
  waiting: "Gözləmə",
  orderType: "Sifariş növü",
  orderControls: "Sifariş idarəsi",
  noMoreActions: "Tamamlanmış, ləğv edilmiş və ya geri ödənmiş sifarişlər üçün əlavə əməliyyat düyməsi yoxdur.",
  addressEditingActive:
    "Ünvan redaktəsi aktivdir. Geri ödəniş və ya ləğv əməliyyatına keçmək üçün dəyişiklikləri saxlayın və ya ləğv edin.",
  supportActionsHint: "Bu düymələr müştəri dəstək əməliyyatları üçündür. Səbəb və əlavə qeyd pəncərədə toplanır.",
  cancelling: "Ləğv edilir...",
  refunding: "Geri ödəniş icra olunur...",
  cancelOrder: "Sifarişi ləğv et",
  refundOrder: "Geri ödəniş et",
  selectOrder: "Növbədən bir sifariş seçin.",
  refundOrderTitle: "Bu sifarişə geri ödəniş et",
  cancelOrderTitle: "Bu sifarişi ləğv et",
  modalDescription: "Qısa səbəb və istəyə bağlı əlavə qeyd yazın. Məlumat audit jurnalında saxlanılacaq.",
  actionCannotUndo: "Bu əməliyyat geri qaytarılmır.",
  close: "Bağla",
  refundType: "Geri ödəniş növü",
  refundFull: "Tam",
  refundPartial: "Qismən",
  refundFullHint: "Tutulmuş məbləğin tamamını geri qaytarır.",
  refundPartialHint: "Tutulmuş məbləğin yalnız bir hissəsini geri qaytarır.",
  refundAmount: "Geri ödəniş məbləği",
  maxAllowed: "Maksimum məbləğ: {amount} {currency}",
  refundAmountInvalid: "0 ilə {amount} {currency} arasında məbləğ daxil edin.",
  refundReasonRequired: "Geri ödəniş səbəbi (mütləqdir)",
  cancelReasonRequired: "Ləğv səbəbi (mütləqdir)",
  refundReasonPlaceholder: "məs: məhsul zədəlidir, yanlış məhsul göndərilib",
  cancelReasonPlaceholder: "məs: müştərinin istəyi, təkrar sifariş",
  optionalNote: "Əlavə qeyd (istəyə bağlı)",
  optionalNotePlaceholder: "Jurnal və ya müştəri ilə sonrakı əlaqə üçün əlavə qeyd yazın",
  back: "Geri",
  processingPartialRefund: "Qismən geri ödəniş icra olunur...",
  processingRefund: "Geri ödəniş icra olunur...",
  confirmPartialRefund: "Qismən geri ödənişi təsdiqlə",
  confirmFullRefund: "Tam geri ödənişi təsdiqlə",
  confirmRefundAmount: "{amount} {currency} geri ödəniş et",
  confirmCancel: "Ləğvi təsdiqlə",
  handoffEyebrow: "Təhvil yoxlama nöqtəsi",
  handoffTitle: "Təhvil verməzdən əvvəl təsdiqləyin",
  handoffDescription: "Sifarişi verməzdən əvvəl aşağıdakı sifariş nömrəsini, telefonu və ya götürmə kodunu yoxlayın.",
  customerCard: "Müştəri",
  orderId: "Sifariş ID-si",
  phone: "Telefon",
  pickupCode: "Götürmə kodu",
  itemsInHandoff: "Təhvilə hazır məhsullar",
  confirmHandover: "Təhvili təsdiqlə",
  handoffLockHint: "Təhvildən sonra sifariş kilidlənir və avtomatik bağlanır.",
  auditTitle: "Audit jurnalı",
  auditDescription: "Bütün icra əməliyyatları sonradan yoxlama üçün görünən qalır.",
  auditUpdatedBy: "Yeniləyən: {username} ({role})",
  auditReason: "Səbəb",
  auditUpdate: "Qeyd",
  auditEmpty: "Bu sifariş üzrə hələ audit qeydi yoxdur.",
  failedLoadOrders: "Sifarişləri yükləmək mümkün olmadı.",
  failedLoadOrderDetail: "Sifariş detalını yükləmək mümkün olmadı.",
  refreshingLatestOrders: "Ən son sifarişlər yenilənir...",
  ordersRefreshed: "Sifarişlər yeniləndi.",
  addressEditorOpened: "Çatdırılma ünvanı redaktəsi açıldı.",
  discardUnsavedAddress: "Saxlanılmamış ünvan dəyişiklikləri ləğv edilsin?",
  addressEditCancelled: "Ünvan redaktəsi ləğv edildi.",
  loginFailed: "Giriş uğursuz oldu.",
  staffSessionStarted: "Əməkdaş sessiyası başladı.",
  loggedOut: "Çıxış edildi.",
  statusUpdateFailed: "Status yenilənmədi.",
  orderMovedToStatus: "Sifariş {status} mərhələsinə keçirildi.",
  pickupCompletedDetails: "Mağazada təhvil prosesi tamamlandı.",
  deliveryCompletedDetails: "Çatdırılma tamamlandı.",
  noAddressChanges: "Saxlanılacaq ünvan dəyişikliyi yoxdur.",
  fillAddressRequired: "Ünvanı saxlamazdan əvvəl ad-soyad, telefon, əsas ünvan sətri və şəhər sahələrini doldurun.",
  refundReasonMissing: "Bu geri ödəniş üçün səbəb yazın.",
  partialRefundInvalid: "Qismən geri ödəniş üçün düzgün məbləğ daxil edin.",
  partialRefundTooHigh: "Qismən geri ödəniş məbləği sifariş məbləğini aşa bilməz.",
  actionReasonMissing: "Bu əməliyyat üçün səbəb yazın.",
  orderUpdateFailed: "Sifariş yenilənmədi.",
  partialRefundSuccess: "Qismən geri ödəniş uğurla tamamlandı.",
  refundSuccess: "Sifariş üzrə geri ödəniş uğurla tamamlandı.",
  cancelSuccess: "Sifariş uğurla ləğv edildi.",
  addressUpdated: "Çatdırılma ünvanı yeniləndi.",
  fillRequiredFields: "Ünvanı saxlamazdan əvvəl ad-soyad, telefon, əsas ünvan sətri və şəhər sahələrini doldurun.",
  noValue: "Məlumat yoxdur",
  statusLabels: {
    new: "Yeni",
    confirmed: "Təsdiqləndi",
    preparing: "Hazırlanır",
    ready_for_pickup: "Təhvilə hazırdır",
    handed_over: "Təhvil verildi",
    ready_for_dispatch: "Göndərişə hazırdır",
    out_for_delivery: "Çatdırılmadadır",
    delivered: "Çatdırıldı",
    completed: "Tamamlandı",
    cancelled: "Ləğv edildi",
    refunded: "Geri ödənildi",
  },
  queueLabels: {
    new: "Yeni",
    preparing: "Hazırlanır",
    ready: "Hazırdır",
    history: "Tarixçə",
  },
  modeLabels: {
    pickup: "Götürmə",
    delivery: "Çatdırılma",
  },
  paymentLabels: {
    completed: "Ödənilib",
    pending: "Gözləmədədir",
    failed: "Uğursuzdur",
    refunded: "Geri ödənilib",
  },
  auditLabels: {
    status_change: "Status yeniləndi",
    price_change: "Məbləğ yeniləndi",
    address_change: "Çatdırılma ünvanı yeniləndi",
    refund: "Geri ödəniş icra olundu",
    cancel: "Sifariş ləğv edildi",
    fallback: "Sifariş əməliyyatı",
  },
  actionLabels: {
    confirmOrder: "Sifarişi təsdiqlə",
    startPreparing: "Hazırlığa başla",
    readyForPickup: "Təhvilə hazırdır",
    readyForDispatch: "Göndərişə hazırdır",
    markOutForDelivery: "Çatdırılmaya ver",
    markDelivered: "Çatdırıldı qeyd et",
    enterHandoffMode: "Təhvil rejiminə keç",
    completeOrder: "Sifarişi tamamla",
  },
  actionDetails: {
    confirmOrder: "Sifariş təsdiqləndi və icra növbəsinə keçirildi.",
    startPreparing: "Sifarişin hazırlanmasına başlanıldı.",
    readyForPickup: "Sifariş götürmə üçün hazırdır.",
    readyForDispatch: "Sifariş qablaşdırıldı və göndərişə hazırdır.",
    markOutForDelivery: "Sifariş hazırda çatdırılmadadır.",
    markDelivered: "Sifariş çatdırıldı.",
    completeOrder: "Sifariş tamamlandı.",
  },
  waitMinutes: "{minutes} dəq",
  waitAgoMinutes: "{minutes} dəq əvvəl",
  waitAgoHours: "{hours} saat əvvəl",
  waitAgoHoursMinutes: "{hours} saat {minutes} dəq əvvəl",
} as const;

const STAFF_COPY = {
  az: STAFF_COPY_AZ,
  en: STAFF_COPY_EN,
  ru: STAFF_COPY_EN,
} as const;

type StaffCopy = (typeof STAFF_COPY)[Locale];
const LOCALE_CODE: Record<Locale, string> = {
  az: "az-AZ",
  en: "en-GB",
  ru: "ru-RU",
};

function getAudioContextCtor() {
  if (typeof window === "undefined") {
    return null;
  }

  const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext || webkitWindow.webkitAudioContext || null;
}

function canUseWindowAudio() {
  return Boolean(getAudioContextCtor());
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function toneClass(tone: StatusTone) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "error") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function getTypeBadgeClass(mode: OrderMode) {
  return mode === "delivery"
    ? "border-slate-200 bg-slate-100 text-slate-600"
    : "border-zinc-200 bg-zinc-100 text-zinc-600";
}

function normalizeOperationalStatus(raw: string): OperationalStatus {
  switch (raw.trim().toLowerCase()) {
    case "pending":
      return "new";
    case "processing":
      return "preparing";
    case "shipped":
      return "out_for_delivery";
    case "delivered":
      return "delivered";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "confirmed":
    case "preparing":
    case "ready_for_pickup":
    case "handed_over":
    case "ready_for_dispatch":
    case "out_for_delivery":
    case "new":
      return raw.trim().toLowerCase() as OperationalStatus;
    default:
      return "new";
  }
}

function getStatusLabel(status: OperationalStatus, copy: StaffCopy) {
  return copy.statusLabels[status];
}

function getStatusColor(status: OperationalStatus) {
  const classes: Record<OperationalStatus, string> = {
    new: "border-slate-200 bg-slate-100 text-slate-700",
    confirmed: "border-slate-200 bg-slate-100 text-slate-700",
    preparing: "border-amber-200 bg-amber-50 text-amber-800",
    ready_for_pickup: "border-emerald-200 bg-emerald-50 text-emerald-700",
    handed_over: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ready_for_dispatch: "border-emerald-200 bg-emerald-50 text-emerald-700",
    out_for_delivery: "border-violet-200 bg-violet-50 text-violet-700",
    delivered: "border-violet-200 bg-violet-50 text-violet-700",
    completed: "border-zinc-200 bg-zinc-100 text-zinc-700",
    cancelled: "border-rose-200 bg-rose-50 text-rose-700",
    refunded: "border-orange-200 bg-orange-50 text-orange-700",
  };

  return classes[status];
}

function parseItems(itemsJson: unknown): OrderItem[] {
  if (!Array.isArray(itemsJson)) {
    return [];
  }

  return itemsJson
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      return {
        perfume_slug: String(row.perfume_slug ?? ""),
        perfume_name: String(row.perfume_name ?? "Perfume"),
        size_ml: Number(row.size_ml ?? 0),
        quantity: Number(row.quantity ?? 0),
        unit_price: Number(row.unit_price ?? 0),
        total_price: Number(row.total_price ?? 0),
      } satisfies OrderItem;
    })
    .filter((item): item is OrderItem => item !== null);
}

function getAddressField(address: Record<string, unknown> | null, keys: string[]) {
  if (!address) return "";

  for (const key of keys) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getOrderMode(order: StaffOrder): OrderMode {
  return order.delivery_address_json ? "delivery" : "pickup";
}

function getCustomerName(order: StaffOrder, copy: StaffCopy) {
  return getAddressField(order.delivery_address_json, ["fullName", "full_name", "name"]) || copy.customerFallback;
}

function getCustomerPhone(order: StaffOrder, copy: StaffCopy) {
  return getAddressField(order.delivery_address_json, ["phone", "phoneNumber", "mobile"]) || copy.phoneFallback;
}

function getStreetLine(address: Record<string, unknown>) {
  const street = getAddressField(address, ["street", "streetName", "street_name", "street_address"]);
  const house = getAddressField(address, ["house", "houseNumber", "house_number", "building", "address1", "line1"]);
  const addressLine = getAddressField(address, ["address", "addressLine1", "address_line1"]);

  if (street && house && addressLine !== street && addressLine !== house) {
    return `${street} ${house}`.trim();
  }

  return addressLine || street || house || "";
}

function getSecondaryAddressLine(address: Record<string, unknown>) {
  return getAddressField(address, [
    "line2",
    "address2",
    "addressLine2",
    "address_line2",
    "apartment",
    "apartmentNumber",
    "apartment_number",
    "flat",
    "floor",
    "entrance",
    "unit",
    "block",
  ]);
}

function getPostalCode(address: Record<string, unknown>) {
  return getAddressField(address, ["postalCode", "postal_code", "zip", "zipcode", "postCode", "post_code"]);
}

function getCity(address: Record<string, unknown>) {
  return getAddressField(address, ["city", "town", "settlement", "locality"]);
}

function getAddressLines(order: StaffOrder, copy: StaffCopy) {
  const address = order.delivery_address_json;
  if (!address) {
    return [copy.storePickup];
  }

  const line1 = getStreetLine(address);
  const line2 = getSecondaryAddressLine(address);
  const postalCode = getPostalCode(address);
  const city = getCity(address);
  const country = getAddressField(address, ["country"]);
  const locality = [postalCode, city].filter(Boolean).join(", ");

  const parts = [
    line1,
    line2,
    locality,
    country,
  ].filter(Boolean);

  return parts.length ? parts : [copy.deliveryAddressAvailable];
}

function getAddressSummaryForList(order: StaffOrder, copy: StaffCopy) {
  const address = order.delivery_address_json;
  if (!address) {
    return copy.storePickup;
  }

  const parts = [
    getStreetLine(address),
    getSecondaryAddressLine(address),
    getPostalCode(address),
    getCity(address),
    getAddressField(address, ["country"]),
  ].filter(Boolean);

  return parts.join(", ") || copy.deliveryAddressAvailable;
}

function buildAddressFormFromOrder(order: StaffOrder | null, copy: StaffCopy): AddressFormState {
  if (!order?.delivery_address_json) {
    return { ...DEFAULT_ADDRESS_FORM, country: copy.countryDefault };
  }

  const address = order.delivery_address_json;
  const resolvedCity = resolveAzerbaijanCity(getCity(address));

  return {
    full_name: String(address.full_name ?? address.fullName ?? ""),
    phone: String(address.phone ?? address.phoneNumber ?? ""),
    line1: getStreetLine(address),
    line2: getSecondaryAddressLine(address),
    city: resolvedCity,
    postal_code: getPostalCode(address),
    country: String(address.country ?? copy.countryDefault),
  };
}

function normalizeAddressForm(address: AddressFormState, copy: StaffCopy): AddressFormState {
  const normalizedCity = resolveAzerbaijanCity(address.city);

  return {
    full_name: address.full_name.trim(),
    phone: address.phone.trim(),
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: normalizedCity,
    postal_code: address.postal_code.trim(),
    country: (address.country.trim() || copy.countryDefault),
  };
}

function getOrderModeLabel(mode: OrderMode, copy: StaffCopy) {
  return copy.modeLabels[mode];
}

function getPaymentLabel(status: string, copy: StaffCopy) {
  switch (status.trim().toLowerCase()) {
    case "completed":
      return copy.paymentLabels.completed;
    case "pending":
      return copy.paymentLabels.pending;
    case "failed":
      return copy.paymentLabels.failed;
    case "refunded":
      return copy.paymentLabels.refunded;
    default:
      return (
        status
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ") || copy.paymentUnknown
      );
  }
}

function getQueueGroup(status: OperationalStatus): QueueTab {
  if (status === "new" || status === "confirmed") return "new";
  if (status === "preparing") return "preparing";
  if (
    status === "ready_for_pickup" ||
    status === "ready_for_dispatch" ||
    status === "out_for_delivery" ||
    status === "handed_over" ||
    status === "delivered"
  ) {
    return "ready";
  }

  return "history";
}

function getQueueGroupLabel(group: QueueTab, copy: StaffCopy) {
  return copy.queueLabels[group];
}

function getOrderWaitMinutes(value: string) {
  try {
    const diffMs = Date.now() - new Date(value).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  } catch {
    return 0;
  }
}

function getWaitUrgency(minutes: number, copy: StaffCopy) {
  const label = formatMessage(copy.waitMinutes, { minutes });

  if (minutes >= 30) {
    return {
      label,
      className: "text-rose-600",
    };
  }

  if (minutes >= 10) {
    return {
      label,
      className: "text-amber-600",
    };
  }

  return {
    label,
    className: "text-zinc-500",
  };
}

function isCodOrder(order: StaffOrder) {
  const paymentMethod = (order.payment_method || "").trim().toLowerCase();
  return (
    paymentMethod.includes("cod") ||
    paymentMethod.includes("cash") ||
    paymentMethod.includes("nagd") ||
    paymentMethod.includes("na\u011fd")
  );
}

function formatDateTime(value: string, locale: Locale) {
  try {
    return new Date(value).toLocaleString(LOCALE_CODE[locale], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getLogActionLabel(action: string, copy: StaffCopy) {
  switch (action) {
    case "status_change":
      return copy.auditLabels.status_change;
    case "price_change":
      return copy.auditLabels.price_change;
    case "address_change":
      return copy.auditLabels.address_change;
    case "refund":
      return copy.auditLabels.refund;
    case "cancel":
      return copy.auditLabels.cancel;
    default:
      return copy.auditLabels.fallback;
  }
}

function formatWaitTime(value: string, copy: StaffCopy) {
  try {
    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    if (minutes < 60) return formatMessage(copy.waitAgoMinutes, { minutes });
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining
      ? formatMessage(copy.waitAgoHoursMinutes, { hours, minutes: remaining })
      : formatMessage(copy.waitAgoHours, { hours });
  } catch {
    return value;
  }
}

function derivePickupCode(order: StaffOrder) {
  const compact = order.order_number.replace(/[^0-9A-Z]/gi, "");
  return compact.slice(-6).toUpperCase().padStart(6, "0");
}

function isLocked(status: OperationalStatus) {
  return status === "completed" || status === "cancelled" || status === "refunded";
}

function getActions(order: StaffOrder, copy: StaffCopy): ActionConfig[] {
  const mode = getOrderMode(order);
  const status = normalizeOperationalStatus(order.status);

  if (isLocked(status)) {
    return [];
  }

  if (status === "new") {
    return [
      {
        label: copy.actionLabels.confirmOrder,
        nextStatus: "confirmed",
        tone: "primary",
        icon: "check",
        details: copy.actionDetails.confirmOrder,
      },
    ];
  }

  if (status === "confirmed") {
    return [
      {
        label: copy.actionLabels.startPreparing,
        nextStatus: "preparing",
        tone: "primary",
        icon: "package",
        details: copy.actionDetails.startPreparing,
      },
    ];
  }

  if (status === "preparing") {
    return [
      {
        label: mode === "pickup" ? copy.actionLabels.readyForPickup : copy.actionLabels.readyForDispatch,
        nextStatus: mode === "pickup" ? "ready_for_pickup" : "ready_for_dispatch",
        tone: "primary",
        icon: "check",
        details:
          mode === "pickup"
            ? copy.actionDetails.readyForPickup
            : copy.actionDetails.readyForDispatch,
      },
    ];
  }

  if (status === "ready_for_dispatch") {
    return [
      {
        label: copy.actionLabels.markOutForDelivery,
        nextStatus: "out_for_delivery",
        tone: "primary",
        icon: "truck",
        details: copy.actionDetails.markOutForDelivery,
      },
    ];
  }

  if (status === "out_for_delivery") {
    return [
      {
        label: copy.actionLabels.markDelivered,
        nextStatus: "delivered",
        tone: "primary",
        icon: "truck",
        details: copy.actionDetails.markDelivered,
      },
    ];
  }

  if (status === "ready_for_pickup") {
    return [
      {
        label: copy.actionLabels.enterHandoffMode,
        nextStatus: "ready_for_pickup",
        tone: "secondary",
        icon: "handoff",
      },
    ];
  }

  if (status === "handed_over" || status === "delivered") {
    return [
      {
        label: copy.actionLabels.completeOrder,
        nextStatus: "completed",
        tone: "secondary",
        icon: "check",
        details: copy.actionDetails.completeOrder,
      },
    ];
  }

  return [];
}

function getAuditAppearance(action: string) {
  switch (action) {
    case "status_change":
      return {
        icon: "check" as const,
        wrapperClass: "border-emerald-200 bg-emerald-50/80",
        badgeClass: "border-emerald-200 bg-white text-emerald-700",
      };
    case "address_change":
      return {
        icon: "map" as const,
        wrapperClass: "border-sky-200 bg-sky-50/80",
        badgeClass: "border-sky-200 bg-white text-sky-700",
      };
    case "refund":
      return {
        icon: "refund" as const,
        wrapperClass: "border-orange-200 bg-orange-50/80",
        badgeClass: "border-orange-200 bg-white text-orange-700",
      };
    case "cancel":
      return {
        icon: "cancel" as const,
        wrapperClass: "border-rose-200 bg-rose-50/80",
        badgeClass: "border-rose-200 bg-white text-rose-700",
      };
    case "price_change":
      return {
        icon: "money" as const,
        wrapperClass: "border-amber-200 bg-amber-50/80",
        badgeClass: "border-amber-200 bg-white text-amber-700",
      };
    default:
      return {
        icon: "package" as const,
        wrapperClass: "border-zinc-200 bg-zinc-50/80",
        badgeClass: "border-zinc-200 bg-white text-zinc-700",
      };
  }
}

function ActionIcon({ icon }: { icon: ActionConfig["icon"] }) {
  if (icon === "package") return <AppIcon name="package" size={16} />;
  if (icon === "truck") return <AppIcon name="truck" size={16} />;
  if (icon === "handoff") return <AppIcon name="handoff" size={16} />;
  return <AppIcon name="check" size={16} />;
}

function AppIcon({
  name,
  size = 16,
  className,
}: {
  name: AppIconName;
  size?: number;
  className?: string;
}) {
  return (
    <Lineicons
      aria-hidden="true"
      className={className}
      color="currentColor"
      icon={APP_ICONS[name]}
      size={size}
      strokeWidth={1.8}
    />
  );
}

export function StaffOrdersPanelClient({
  configured,
  initialAuthenticated,
  locale,
}: StaffOrdersPanelClientProps) {
  const copy = STAFF_COPY[locale];
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [username, setUsername] = useState("staff");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [queueTab, setQueueTab] = useState<QueueTab>("new");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentQuickFilter>("all");
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<StaffOrder | null>(null);
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionDetails, setActionDetails] = useState("");
  const [activeControl, setActiveControl] = useState<"cancel" | "refund" | "address_change" | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"cancel" | "refund" | null>(null);
  const [refundMode, setRefundMode] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [showPaymentFilters, setShowPaymentFilters] = useState(false);
  const [recentOrderIds, setRecentOrderIds] = useState<string[]>([]);
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [addressForm, setAddressForm] = useState<AddressFormState>({ ...DEFAULT_ADDRESS_FORM });
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const deliveryAddressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STAFF_SFX_STORAGE_KEY);
    if (stored === "false") {
      setSfxEnabled(false);
    } else if (stored === "true") {
      setSfxEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STAFF_SFX_STORAGE_KEY, String(sfxEnabled));
  }, [sfxEnabled]);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      audioUnlockedRef.current = false;

      if (context && context.state !== "closed") {
        void context.close().catch(() => {
          // Ignore close failures during teardown.
        });
      }
    };
  }, []);

  const ensureAudioContext = async () => {
    if (!canUseWindowAudio()) {
      return null;
    }

    try {
      const AudioCtor = getAudioContextCtor();
      if (!AudioCtor) {
        return null;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtor();
      }

      const context = audioContextRef.current;
      if (context.state === "suspended") {
        await context.resume();
      }

      audioUnlockedRef.current = context.state === "running";
      return audioUnlockedRef.current ? context : null;
    } catch {
      return null;
    }
  };

  const playEnableSound = async () => {
    await unlockAudio();
    await playSequence([
      { frequency: 392, durationMs: 125, gainValue: 0.08, type: "triangle" },
      { frequency: 493.88, durationMs: 145, gainValue: 0.095, delayMs: 40, type: "triangle" },
      { frequency: 587.33, durationMs: 190, gainValue: 0.11, delayMs: 45, type: "triangle" },
    ], true);
  };

  const handleToggleSfx = async () => {
    if (sfxEnabled) {
      setSfxEnabled(false);
      setStatus({ tone: "neutral", message: copy.sfxMuted });
      return;
    }

    setSfxEnabled(true);
    setStatus({ tone: "success", message: copy.sfxEnabled });
    await playEnableSound();
  };

  const testSfx = async () => {
    if (!sfxEnabled) {
      setStatus({ tone: "neutral", message: copy.enableSfxFirst });
      return;
    }

    await unlockAudio();
    await playSequence(
      [
        { frequency: 392, durationMs: 120, gainValue: 0.075, type: "triangle" },
        { frequency: 523.25, durationMs: 145, gainValue: 0.09, delayMs: 35, type: "triangle" },
        { frequency: 659.25, durationMs: 175, gainValue: 0.1, delayMs: 40, type: "triangle" },
        { frequency: 783.99, durationMs: 220, gainValue: 0.105, delayMs: 45, type: "sine" },
      ],
      true,
    );
    setStatus({ tone: "success", message: copy.soundTestPlayed });
  };

  const unlockAudio = async () => {
    await ensureAudioContext();
  };

  const scheduleTone = (context: AudioContext, note: SynthNote, startAt: number) => {
    const durationSeconds = Math.max(0.08, note.durationMs / 1000);
    const releaseSeconds = Math.min(0.24, Math.max(0.08, durationSeconds * 0.55));
    const endAt = startAt + durationSeconds + releaseSeconds;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const safeGain = Math.min(0.18, Math.max(0.045, note.gainValue));

    oscillator.type = note.type ?? "triangle";
    oscillator.frequency.setValueAtTime(note.frequency, startAt);
    oscillator.detune.setValueAtTime(note.detune ?? 0, startAt);

    if (note.glideToFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(note.glideToFrequency, startAt + durationSeconds);
    }

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      oscillator.type === "sawtooth" ? 1800 : oscillator.type === "square" ? 2100 : 2600,
      startAt,
    );
    filter.Q.setValueAtTime(0.6, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(safeGain, startAt + 0.014);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, safeGain * 0.62),
      startAt + Math.max(0.05, durationSeconds * 0.45),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(endAt);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  };

  const playSequence = async (notes: SynthNote[], force = false) => {
    if (!force && !sfxEnabled) {
      return;
    }

    const context = await ensureAudioContext();
    if (!context) {
      return;
    }

    let cursorMs = 0;
    for (const note of notes) {
      cursorMs += note.delayMs ?? 0;
      scheduleTone(context, note, context.currentTime + cursorMs / 1000);
      cursorMs += note.durationMs;
    }

    await sleep(cursorMs + 180);
  };

  const playNewOrderSound = async (mode: OrderMode) => {
    if (!sfxEnabled) {
      return;
    }

    await unlockAudio();
    if (mode === "delivery") {
      await playSequence([
        { frequency: 783.99, durationMs: 105, gainValue: 0.085, type: "triangle" },
        { frequency: 987.77, durationMs: 120, gainValue: 0.095, delayMs: 30, type: "triangle" },
        { frequency: 1174.66, durationMs: 155, gainValue: 0.11, delayMs: 35, type: "sine" },
      ]);
      return;
    }

    await playSequence([
      { frequency: 587.33, durationMs: 110, gainValue: 0.08, type: "square" },
      { frequency: 739.99, durationMs: 125, gainValue: 0.09, delayMs: 30, type: "square" },
      { frequency: 880, durationMs: 160, gainValue: 0.095, delayMs: 35, type: "triangle" },
    ]);
  };

  const playSuccessSound = async (kind: "status" | "handoff" | "address_change" | "refund" | "cancel" = "status") => {
    if (!sfxEnabled) {
      return;
    }

    await unlockAudio();
    if (kind === "handoff") {
      await playSequence([
        { frequency: 440, durationMs: 95, gainValue: 0.075, type: "triangle" },
        { frequency: 554.37, durationMs: 110, gainValue: 0.085, delayMs: 25, type: "triangle" },
        { frequency: 659.25, durationMs: 135, gainValue: 0.095, delayMs: 30, type: "triangle" },
        { frequency: 880, durationMs: 180, gainValue: 0.105, delayMs: 35, type: "sine" },
      ]);
      return;
    }

    if (kind === "address_change") {
      await playSequence([
        { frequency: 349.23, durationMs: 90, gainValue: 0.065, type: "sine" },
        { frequency: 440, durationMs: 105, gainValue: 0.075, delayMs: 25, type: "triangle" },
        { frequency: 523.25, durationMs: 130, gainValue: 0.082, delayMs: 30, type: "triangle" },
      ]);
      return;
    }

    if (kind === "refund") {
      await playSequence([
        { frequency: 392, durationMs: 105, gainValue: 0.07, type: "sawtooth", glideToFrequency: 369.99 },
        { frequency: 329.63, durationMs: 145, gainValue: 0.075, delayMs: 25, type: "triangle", glideToFrequency: 293.66 },
      ]);
      return;
    }

    if (kind === "cancel") {
      await playSequence([
        { frequency: 349.23, durationMs: 120, gainValue: 0.068, type: "triangle", glideToFrequency: 311.13 },
        { frequency: 261.63, durationMs: 165, gainValue: 0.075, delayMs: 35, type: "sawtooth", glideToFrequency: 233.08 },
      ]);
      return;
    }

    await playSequence([
      { frequency: 523.25, durationMs: 90, gainValue: 0.075, type: "triangle" },
      { frequency: 659.25, durationMs: 110, gainValue: 0.085, delayMs: 25, type: "triangle" },
      { frequency: 783.99, durationMs: 145, gainValue: 0.09, delayMs: 30, type: "sine" },
    ]);
  };

  const playErrorSound = async () => {
    if (!sfxEnabled) {
      return;
    }

    await unlockAudio();
    await playSequence([
      { frequency: 220, durationMs: 120, gainValue: 0.075, type: "sawtooth", glideToFrequency: 207.65 },
      { frequency: 196, durationMs: 130, gainValue: 0.078, delayMs: 25, type: "sawtooth", glideToFrequency: 185 },
      { frequency: 174.61, durationMs: 170, gainValue: 0.082, delayMs: 30, type: "triangle", glideToFrequency: 164.81 },
    ]);
  };

  const deferredSearch = useDeferredValue(search);

  const fetchOrders = async () => {
    if (!authenticated) return false;

    setBusy(true);
    try {
      const response = await fetch("/api/staff/orders", { method: "GET" });
      const payload = (await response.json()) as { error?: string; orders?: StaffOrder[] };

      if (!response.ok) {
        throw new Error(payload.error || copy.failedLoadOrders);
      }

      const nextOrders = payload.orders || [];
      const nextOrderIds = new Set(nextOrders.map((order) => order.id));
      const previousOrderIds = previousOrderIdsRef.current;
      const newlyArrivedOrderIds = nextOrders
        .filter((order) => !previousOrderIds.has(order.id))
        .map((order) => order.id);
      const firstNewOrder = nextOrders.find((order) => newlyArrivedOrderIds.includes(order.id));

      setOrders(nextOrders);
      previousOrderIdsRef.current = nextOrderIds;

      if (newlyArrivedOrderIds.length && previousOrderIds.size > 0) {
        setRecentOrderIds(newlyArrivedOrderIds);
        void playNewOrderSound(firstNewOrder ? getOrderMode(firstNewOrder) : "pickup");
      }

      if (nextOrders.length && !selectedOrderId) {
        setSelectedOrderId(nextOrders[0].id);
      }

      if (selectedOrderId && !nextOrders.some((order) => order.id === selectedOrderId)) {
        setSelectedOrderId(nextOrders[0]?.id || "");
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.failedLoadOrders;
      setStatus({ tone: "error", message });
      void playErrorSound();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    if (!orderId) {
      setSelectedOrder(null);
      setLogs([]);
      return true;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/staff/orders/${orderId}`, { method: "GET" });
      const payload = (await response.json()) as {
        error?: string;
        order?: StaffOrder;
        logs?: OrderLog[];
      };

      if (!response.ok) {
        throw new Error(payload.error || copy.failedLoadOrderDetail);
      }

      setSelectedOrder(payload.order || null);
      setLogs(payload.logs || []);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.failedLoadOrderDetail;
      setStatus({ tone: "error", message });
      void playErrorSound();
      return false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      void fetchOrders();
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated && selectedOrderId) {
      void fetchOrderDetail(selectedOrderId);
    }
  }, [authenticated, selectedOrderId]);

  useEffect(() => {
    if (!authenticated) return;

    const timer = window.setInterval(() => {
      void fetchOrders();
      if (selectedOrderId) {
        void fetchOrderDetail(selectedOrderId);
      }
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [authenticated, selectedOrderId]);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const mode = getOrderMode(order);
      const statusName = normalizeOperationalStatus(order.status);
      const queueGroup = getQueueGroup(statusName);
      const items = parseItems(order.items_json);
      const name = getCustomerName(order, copy).toLowerCase();
      const phone = getCustomerPhone(order, copy).toLowerCase();
      const itemPreview = items.map((item) => item.perfume_name).join(" ").toLowerCase();

      if (queueGroup !== queueTab) {
        return false;
      }

      if (deliveryFilter !== "all" && deliveryFilter !== mode) {
        return false;
      }

      if (paymentFilter === "paid" && order.payment_status.trim().toLowerCase() !== "completed") {
        return false;
      }

      if (paymentFilter === "cod" && !isCodOrder(order)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        order.order_number.toLowerCase().includes(normalizedQuery) ||
        getStatusLabel(statusName, copy).toLowerCase().includes(normalizedQuery) ||
        order.payment_status.toLowerCase().includes(normalizedQuery) ||
        name.includes(normalizedQuery) ||
        phone.includes(normalizedQuery) ||
        itemPreview.includes(normalizedQuery)
      );
    });
  }, [copy, deferredSearch, deliveryFilter, orders, paymentFilter, queueTab]);

  const selectedStatus = selectedOrder
    ? normalizeOperationalStatus(selectedOrder.status)
    : null;
  const selectedMode = selectedOrder ? getOrderMode(selectedOrder) : null;
  const selectedItems = selectedOrder ? parseItems(selectedOrder.items_json) : [];
  const selectedActions = selectedOrder ? getActions(selectedOrder, copy) : [];
  const pickupCode = selectedOrder ? derivePickupCode(selectedOrder) : "";
  const orderIsLocked = selectedStatus ? isLocked(selectedStatus) : false;
  const selectedIsHistory = getQueueGroup(selectedStatus || "new") === "history";
  const selectedWaitMinutes = selectedOrder ? getOrderWaitMinutes(selectedOrder.created_at) : 0;
  const selectedUrgency = getWaitUrgency(selectedWaitMinutes, copy);
  const maxRefundAmount = Number(selectedOrder?.total_amount ?? 0);
  const refundPreviewAmount = useMemo(() => {
    if (pendingAction !== "refund") {
      return null;
    }

    if (refundMode === "full") {
      return Number.isFinite(maxRefundAmount) && maxRefundAmount > 0 ? maxRefundAmount : null;
    }

    const parsed = Number(refundAmount.trim());
    return Number.isFinite(parsed) && parsed > 0 && parsed <= maxRefundAmount ? parsed : null;
  }, [maxRefundAmount, pendingAction, refundAmount, refundMode]);
  const isPartialRefundInvalid = useMemo(() => {
    if (pendingAction !== "refund" || refundMode !== "partial") {
      return false;
    }

    const parsed = Number(refundAmount.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return true;
    }

    return parsed > maxRefundAmount;
  }, [maxRefundAmount, pendingAction, refundAmount, refundMode]);
  const addressHasChanges = useMemo(() => {
    if (selectedMode !== "delivery") {
      return false;
    }

    const current = normalizeAddressForm(addressForm, copy);
    const original = normalizeAddressForm(buildAddressFormFromOrder(selectedOrder, copy), copy);

    return (
      current.full_name !== original.full_name ||
      current.phone !== original.phone ||
      current.line1 !== original.line1 ||
      current.line2 !== original.line2 ||
      current.city !== original.city ||
      current.postal_code !== original.postal_code ||
      current.country !== original.country
    );
  }, [addressForm, copy, selectedMode, selectedOrder]);

  useEffect(() => {
    setAddressForm(buildAddressFormFromOrder(selectedOrder, copy));
    setIsAddressEditing(false);
  }, [copy, selectedOrder?.id]);

  useEffect(() => {
    if (!recentOrderIds.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRecentOrderIds([]);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [recentOrderIds]);

  useEffect(() => {
    if (!canUseWindowAudio()) {
      return;
    }

    const primeAudio = () => {
      if (audioUnlockedRef.current) {
        return;
      }
      void unlockAudio();
    };

    void unlockAudio();
    window.addEventListener("pointerdown", primeAudio, { passive: true });
    window.addEventListener("touchstart", primeAudio, { passive: true });
    window.addEventListener("click", primeAudio, { passive: true });
    window.addEventListener("keydown", primeAudio);

    return () => {
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("touchstart", primeAudio);
      window.removeEventListener("click", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
  }, []);

  useEffect(() => {
    if (!showActionModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showActionModal]);

  const refreshAll = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    setStatus({ tone: "neutral", message: copy.refreshingLatestOrders });

    const ordersOk = await fetchOrders();
    const detailOk = selectedOrderId ? await fetchOrderDetail(selectedOrderId) : true;

    if (ordersOk && detailOk) {
      setStatus({ tone: "success", message: copy.ordersRefreshed });
    }

    setIsRefreshing(false);
  };

  const openAddressEditor = () => {
    setIsAddressEditing(true);
    setStatus({ tone: "neutral", message: copy.addressEditorOpened });
    window.requestAnimationFrame(() => {
      deliveryAddressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const cancelAddressEdit = () => {
    if (busy) {
      return;
    }

    if (addressHasChanges) {
      const shouldDiscard = window.confirm(copy.discardUnsavedAddress);
      if (!shouldDiscard) {
        return;
      }
    }

    setAddressForm(buildAddressFormFromOrder(selectedOrder, copy));
    setIsAddressEditing(false);
    setStatus({ tone: "neutral", message: copy.addressEditCancelled });
  };

  const openActionModal = (action: "cancel" | "refund") => {
    setPendingAction(action);
    setActionReason("");
    setActionDetails("");
    setRefundMode(action === "refund" ? "full" : "full");
    setRefundAmount("");
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    if (busy) return;

    setShowActionModal(false);
    setPendingAction(null);
    setActionReason("");
    setActionDetails("");
    setRefundMode("full");
    setRefundAmount("");
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || copy.loginFailed);
      }

      setAuthenticated(true);
      setPassword("");
      void unlockAudio();
      setStatus({ tone: "success", message: copy.staffSessionStarted });
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.loginFailed;
      setStatus({ tone: "error", message });
      void playErrorSound();
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await fetch("/api/staff/logout", { method: "POST" });
      setAuthenticated(false);
      setSelectedOrderId("");
      setSelectedOrder(null);
      setLogs([]);
      setOrders([]);
      setShowHandoff(false);
      setStatus({ tone: "success", message: copy.loggedOut });
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (nextStatus: OperationalStatus, details?: string) => {
    if (!selectedOrder) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/staff/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status_change",
          status: nextStatus,
          details,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        order?: StaffOrder;
        logs?: OrderLog[];
      };

      if (!response.ok) {
        throw new Error(result.error || copy.statusUpdateFailed);
      }

      setSelectedOrder(result.order || null);
      setLogs(result.logs || []);
      setStatus({
        tone: "success",
        message: formatMessage(copy.orderMovedToStatus, { status: getStatusLabel(nextStatus, copy) }),
      });
      void playSuccessSound(nextStatus === "handed_over" || nextStatus === "delivered" ? "handoff" : "status");
      if (nextStatus === "handed_over") {
        setShowHandoff(false);
      }
      await fetchOrders();

      if (nextStatus === "handed_over") {
        window.setTimeout(() => {
          void updateStatus("completed", copy.pickupCompletedDetails);
        }, 400);
      }

      if (nextStatus === "delivered") {
        window.setTimeout(() => {
          void updateStatus("completed", copy.deliveryCompletedDetails);
        }, 400);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.statusUpdateFailed;
      setStatus({ tone: "error", message });
      void playErrorSound();
    } finally {
      setBusy(false);
    }
  };

  const runOrderAction = async (
    action: "refund" | "cancel" | "address_change",
    options?: { reason?: string; details?: string; refundMode?: "full" | "partial"; refundAmount?: string },
  ) => {
    if (!selectedOrder) {
      return;
    }

    const reason = (options?.reason ?? actionReason).trim();
    const details = (options?.details ?? actionDetails).trim();

    let deliveryAddressPayload: Record<string, unknown> | undefined;
    if (action === "address_change") {
      if (!addressHasChanges) {
        setStatus({ tone: "neutral", message: copy.noAddressChanges });
        return;
      }

      if (!addressForm.full_name.trim() || !addressForm.phone.trim() || !addressForm.line1.trim() || !resolveAzerbaijanCity(addressForm.city)) {
        setStatus({ tone: "error", message: copy.fillRequiredFields });
        return;
      }

      deliveryAddressPayload = {
        full_name: addressForm.full_name.trim(),
        phone: addressForm.phone.trim(),
        line1: addressForm.line1.trim(),
        line2: addressForm.line2.trim(),
        city: addressForm.city.trim(),
        postal_code: addressForm.postal_code.trim(),
        country: addressForm.country.trim() || copy.countryDefault,
      };
    }

    const refundModeValue = options?.refundMode ?? refundMode;
    const parsedRefundAmount = Number((options?.refundAmount ?? refundAmount).trim());

    if (action === "refund") {
      if (!reason) {
        setStatus({ tone: "error", message: copy.refundReasonMissing });
        return;
      }

      if (refundModeValue === "partial") {
        if (!Number.isFinite(parsedRefundAmount) || parsedRefundAmount <= 0) {
          setStatus({ tone: "error", message: copy.partialRefundInvalid });
          return;
        }

        if (parsedRefundAmount > Number(selectedOrder.total_amount)) {
          setStatus({ tone: "error", message: copy.partialRefundTooHigh });
          return;
        }
      }
    }

    if (action === "cancel" && !reason) {
      setStatus({ tone: "error", message: copy.actionReasonMissing });
      return;
    }

    setBusy(true);
    setActiveControl(action);
    try {
      const response = await fetch(`/api/staff/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason,
          details,
          delivery_address_json: deliveryAddressPayload,
          refund_kind: action === "refund" ? refundModeValue : undefined,
          refund_amount: action === "refund" && refundModeValue === "partial" ? parsedRefundAmount : undefined,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        order?: StaffOrder;
        logs?: OrderLog[];
      };

      if (!response.ok) {
        throw new Error(result.error || copy.orderUpdateFailed);
      }

      setSelectedOrder(result.order || null);
      setLogs(result.logs || []);
      setActionReason("");
      setActionDetails("");
      setRefundAmount("");
      setRefundMode("full");
      setIsAddressEditing(false);
      void playSuccessSound(action === "refund" ? "refund" : action);
      setStatus({
        tone: "success",
        message:
          action === "refund"
            ? refundModeValue === "partial"
              ? copy.partialRefundSuccess
              : copy.refundSuccess
            : action === "cancel"
              ? copy.cancelSuccess
              : copy.addressUpdated,
      });

      await fetchOrders();

      if (action === "refund" || action === "cancel") {
        setShowActionModal(false);
        setPendingAction(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.orderUpdateFailed;
      setStatus({ tone: "error", message });
      void playErrorSound();
    } finally {
      setActiveControl(null);
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{copy.configuredTitle}</h1>
        <p className="mt-2 text-sm text-zinc-600">{copy.configuredDescription}</p>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_48px_rgba(17,24,39,0.08)]">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-900">{copy.loginTitle}</h1>
        <p className="mt-2 text-sm text-zinc-600">{copy.loginDescription}</p>
        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <input
            className="h-11 w-full rounded-2xl border border-zinc-300 px-4"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={copy.usernamePlaceholder}
          />
          <input
            type="password"
            className="h-11 w-full rounded-2xl border border-zinc-300 px-4"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white"
            disabled={busy}
          >
            {copy.signIn}
          </button>
        </form>
        {status ? (
          <p className={`mt-4 rounded-full border px-3 py-2 text-sm ${toneClass(status.tone)}`}>
            {status.message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_20px_48px_rgba(17,24,39,0.08)] motion-safe:[animation:fadeInSoft_420ms_cubic-bezier(0.22,1,0.36,1)_both]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <AppIcon name="workspace" size={14} />
              {copy.queueEyebrow}
            </div>
            <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] text-zinc-950">
              {copy.queueTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.queueDescription}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cx(
                "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200",
                sfxEnabled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50",
              )}
              onClick={() => {
                void handleToggleSfx();
              }}
            >
              <AppIcon name={sfxEnabled ? "sfxOn" : "sfxOff"} size={15} />
              {sfxEnabled ? copy.muteSfx : copy.unmuteSfx}
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-all duration-200 hover:border-zinc-400 hover:bg-zinc-50"
              onClick={() => {
                void testSfx();
              }}
              disabled={!sfxEnabled}
            >
              <AppIcon name="test" size={15} />
              {copy.testSfx}
            </button>
            <button
              type="button"
              className={cx(
                "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200",
                isRefreshing
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_10px_22px_rgba(17,24,39,0.2)]"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50",
              )}
              onClick={() => void refreshAll()}
              disabled={busy || isRefreshing}
              aria-busy={isRefreshing}
            >
              <AppIcon name="refresh" size={15} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? copy.refreshing : copy.refresh}
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700"
              onClick={handleLogout}
              disabled={busy}
            >
              <AppIcon name="logout" size={15} />
              {copy.logout}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-[0_14px_36px_rgba(17,24,39,0.06)] xl:sticky xl:top-20 xl:h-[calc(100dvh-6.25rem)]">
          <div className="flex h-full min-h-0 flex-col">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950">{copy.orderQueue}</h2>
              <p className="mt-1 text-sm text-zinc-500">{copy.queueOnlyNeededNow}</p>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{copy.status}</p>
              <div className="mt-2 flex flex-wrap gap-2">
              {([
                ["new", copy.queueLabels.new],
                ["preparing", copy.queueLabels.preparing],
                ["ready", copy.queueLabels.ready],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cx(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5",
                    queueTab === value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50",
                  )}
                  onClick={() => startTransition(() => setQueueTab(value))}
                >
                  {label}
                </button>
              ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{copy.type}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  ["all", copy.allFilter],
                  ["pickup", copy.modeLabels.pickup],
                  ["delivery", copy.modeLabels.delivery],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={cx(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50",
                      deliveryFilter === value
                        ? "border-zinc-400 bg-zinc-100 text-zinc-800"
                        : "border-zinc-200 bg-white text-zinc-500",
                    )}
                    onClick={() => setDeliveryFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="relative mt-6 block">
              <AppIcon name="search" size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="h-11 w-full rounded-2xl border border-zinc-300 px-4 pl-11 text-sm"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
              />
            </label>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-medium text-zinc-600 underline-offset-4 transition-colors duration-200 hover:text-zinc-900 hover:underline"
                onClick={() => startTransition(() => setQueueTab(queueTab === "history" ? "new" : "history"))}
              >
                {queueTab === "history" ? copy.backToActiveQueue : copy.viewHistory}
              </button>

              <button
                type="button"
                className="text-xs font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-800"
                onClick={() => setShowPaymentFilters((prev) => !prev)}
              >
                {showPaymentFilters ? copy.hidePayment : copy.paymentAdvanced}
              </button>
            </div>

            {showPaymentFilters ? (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{copy.payment}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([
                    ["all", copy.allFilter],
                    ["paid", copy.paymentLabels.completed],
                    ["cod", copy.cashOnDelivery],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={cx(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50",
                        paymentFilter === value
                          ? "border-zinc-400 bg-zinc-100 text-zinc-800"
                          : "border-zinc-200 bg-white text-zinc-500",
                      )}
                      onClick={() => setPaymentFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-2">
              <div className="flex items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                <span>{queueTab === "history" ? copy.historyQueue : copy.activeQueue}</span>
                <span>{visibleOrders.length}</span>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {visibleOrders.length ? (
                  visibleOrders.map((order) => {
                    const mode = getOrderMode(order);
                    const statusName = normalizeOperationalStatus(order.status);
                    const items = parseItems(order.items_json);
                    const waitMinutes = getOrderWaitMinutes(order.created_at);
                    const urgency = getWaitUrgency(waitMinutes, copy);
                    const itemsPreview = items.slice(0, 2).map((item) => item.perfume_name).join(", ");

                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          startTransition(() => {
                            setSelectedOrderId(order.id);
                            setShowHandoff(false);
                          });
                        }}
                        className={cx(
                          "w-full rounded-[1.35rem] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
                          selectedOrderId === order.id
                            ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_14px_26px_rgba(17,24,39,0.18)]"
                            : recentOrderIds.includes(order.id)
                              ? "border-emerald-300 bg-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.18)] hover:border-emerald-400 hover:bg-emerald-50 motion-safe:[animation:orderArrival_520ms_cubic-bezier(0.22,1,0.36,1)_both]"
                              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cx(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em]",
                                getTypeBadgeClass(mode),
                              )}>
                                {getOrderModeLabel(mode, copy)}
                              </span>
                              <p className="truncate text-sm font-semibold">{order.order_number}</p>
                            </div>
                            <p className={cx("mt-1 truncate text-xs", selectedOrderId === order.id ? "text-zinc-300" : "text-zinc-500")}>
                              {getCustomerName(order, copy)}
                            </p>
                          </div>
                          <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em]", selectedOrderId === order.id ? "border-white/15 bg-white/10 text-white" : getStatusColor(statusName))}>
                            {getStatusLabel(statusName, copy)}
                          </span>
                        </div>

                        <p className={cx("mt-3 line-clamp-2 text-xs", selectedOrderId === order.id ? "text-zinc-300" : "text-zinc-500")}>
                          {itemsPreview || copy.noItemPreview}
                        </p>

                        <div className={cx("mt-3 flex items-center justify-between text-xs", selectedOrderId === order.id ? "text-zinc-300" : "text-zinc-500")}>
                          <span>{getPaymentLabel(order.payment_status, copy)}</span>
                          {queueTab === "history" ? null : (
                            <span className={selectedOrderId === order.id ? "text-zinc-300" : urgency.className}>{urgency.label}</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[1.3rem] border border-dashed border-zinc-300 bg-white px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-zinc-800">{copy.noOrdersTitle}</p>
                    <p className="mt-2 text-sm text-zinc-500">{copy.noOrdersDescription}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_14px_36px_rgba(17,24,39,0.06)] motion-safe:[animation:fadeUp_360ms_cubic-bezier(0.22,1,0.36,1)_both]">
            <h2 className="text-lg font-semibold text-zinc-900">{copy.orderDetail}</h2>
            {selectedOrder ? (
              <>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-4">
                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.orderLabel}</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-950">{selectedOrder.order_number}</h3>
                          <p className="mt-2 text-sm text-zinc-500">
                            {formatDateTime(selectedOrder.created_at, locale)} • {formatWaitTime(selectedOrder.created_at, copy)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusColor(selectedStatus || "new")}`}>
                            {selectedStatus ? getStatusLabel(selectedStatus, copy) : copy.paymentUnknown}
                          </span>
                          <span className={cx(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em]",
                            selectedMode ? getTypeBadgeClass(selectedMode) : "border-zinc-200 bg-zinc-100 text-zinc-600",
                          )}>
                            {selectedMode ? getOrderModeLabel(selectedMode, copy) : copy.modeLabels.pickup}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                            {getPaymentLabel(selectedOrder.payment_status, copy)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.customerLabel}</p>
                        <p className="mt-3 text-base font-semibold text-zinc-900">{getCustomerName(selectedOrder, copy)}</p>
                        <p className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-600">
                          <AppIcon name="phone" size={15} />
                          {getCustomerPhone(selectedOrder, copy)}
                        </p>
                      </div>

                      <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                          {selectedMode === "pickup" ? copy.pickupLocation : copy.deliveryAddress}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-zinc-700">
                          {selectedMode === "pickup"
                            ? copy.pickupLocationValue
                            : getAddressSummaryForList(selectedOrder, copy)}
                        </p>
                      </div>
                    </div>

                    {selectedMode === "delivery" ? (
                      <div
                        ref={deliveryAddressRef}
                        className={cx(
                          "rounded-[1.4rem] border p-4 transition-all duration-200",
                          isAddressEditing
                            ? "border-sky-300 bg-sky-50/60 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
                            : "border-zinc-200 bg-zinc-50/80",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.deliveryAddress}</p>
                          <span
                            className={cx(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                              isAddressEditing
                                ? "border-sky-300 bg-sky-100 text-sky-700"
                                : "border-zinc-200 bg-zinc-100 text-zinc-500",
                            )}
                          >
                            {isAddressEditing ? copy.editingAddress : copy.viewOnly}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                          {isAddressEditing
                            ? copy.addressEditingHint
                            : copy.addressViewHint}
                        </p>
                        {isAddressEditing ? (
                          <div className="mt-4 space-y-3.5 rounded-2xl border border-zinc-200 bg-white p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                                {copy.customerNameRequired}
                                <input
                                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm normal-case tracking-normal text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                                  value={addressForm.full_name}
                                  onChange={(event) => setAddressForm((prev) => ({ ...prev, full_name: event.target.value }))}
                                  placeholder={copy.fullNamePlaceholder}
                                />
                              </label>
                              <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                                {copy.phoneRequired}
                                <input
                                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm normal-case tracking-normal text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                                  value={addressForm.phone}
                                  onChange={(event) => setAddressForm((prev) => ({ ...prev, phone: event.target.value }))}
                                  placeholder="+994..."
                                />
                                <span className="mt-1 block text-[11px] normal-case tracking-normal text-zinc-500">{copy.phoneFormatHint}</span>
                              </label>
                            </div>
                            <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                              {copy.addressLine1Required}
                              <input
                                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm normal-case tracking-normal text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                                value={addressForm.line1}
                                onChange={(event) => setAddressForm((prev) => ({ ...prev, line1: event.target.value }))}
                                placeholder={copy.addressLine1Placeholder}
                              />
                            </label>
                            <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                              {copy.addressLine2}
                              <input
                                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm normal-case tracking-normal text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                                value={addressForm.line2}
                                onChange={(event) => setAddressForm((prev) => ({ ...prev, line2: event.target.value }))}
                                placeholder={copy.addressLine2Placeholder}
                              />
                            </label>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                                {copy.cityRequired}
                                <select
                                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm normal-case tracking-normal text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                                  value={addressForm.city}
                                  onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))}
                                >
                                  <option value="">{copy.selectCityPlaceholder}</option>
                                  {AZERBAIJAN_CITIES.map((cityName) => (
                                    <option key={cityName} value={cityName}>{cityName}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                                {copy.postalCode}
                                <input
                                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm normal-case tracking-normal text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                                  value={addressForm.postal_code}
                                  onChange={(event) => setAddressForm((prev) => ({ ...prev, postal_code: event.target.value }))}
                                  placeholder={copy.postalCodePlaceholder}
                                />
                              </label>
                              <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                                {copy.country}
                                <input
                                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm normal-case tracking-normal text-zinc-800 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                                  value={addressForm.country}
                                  onChange={(event) => setAddressForm((prev) => ({ ...prev, country: event.target.value }))}
                                  placeholder={copy.countryPlaceholder}
                                />
                              </label>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3">
                              <span className={cx("text-xs", addressHasChanges ? "font-medium text-amber-700" : "text-zinc-500")}>
                                {addressHasChanges ? copy.unsavedChanges : copy.noUnsavedChanges}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-50"
                                  disabled={busy}
                                  onClick={cancelAddressEdit}
                                >
                                  {copy.cancel}
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                                  disabled={busy || !addressHasChanges}
                                  onClick={() => {
                                    void runOrderAction("address_change");
                                  }}
                                >
                                  {activeControl === "address_change" ? copy.saving : copy.saveChanges}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl bg-white p-4">
                            <div className="space-y-1.5 text-sm leading-6 text-zinc-700">
                              {getAddressLines(selectedOrder, copy).map((line) => (
                                <p key={line}>{line}</p>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-100"
                              disabled={busy}
                              onClick={openAddressEditor}
                            >
                              <AppIcon name="map" size={15} />
                              {copy.changeDeliveryAddress}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.items}</p>
                      <div className="mt-4 space-y-3">
                        {selectedItems.map((item, index) => (
                          <div key={`${item.perfume_slug}-${item.size_ml}-${index}`} className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">{item.perfume_name}</p>
                              <p className="mt-1 text-sm text-zinc-500">
                                {item.size_ml}ML × {item.quantity}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {item.total_price.toFixed(2)} {selectedOrder.currency}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <span className="text-sm text-zinc-500">{copy.total}</span>
                        <span className="text-base font-semibold text-zinc-950">
                          {selectedOrder.total_amount} {selectedOrder.currency}
                        </span>
                      </div>
                    </div>

                    {selectedOrder.notes ? (
                      <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.notes}</p>
                        <p className="mt-3 text-sm leading-6 text-zinc-700">{selectedOrder.notes}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.actionPanel}</p>
                      {orderIsLocked ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-100 p-4 text-sm text-zinc-600">
                          <span className="inline-flex items-center gap-2 font-semibold text-zinc-700"><AppIcon name="lock" size={14} />{copy.orderCompleted}</span>
                          <p className="mt-2">{copy.orderLockedDescription}</p>
                        </div>
                      ) : selectedActions.length ? (
                        <div className="mt-4 space-y-3">
                          {selectedActions.map((action) => (
                            <button
                              key={`${selectedOrder.id}-${action.label}`}
                              type="button"
                              className={cx(
                                "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                                action.tone === "primary"
                                  ? "bg-zinc-900 text-white hover:bg-zinc-800"
                                  : "border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50",
                              )}
                              disabled={busy}
                              onClick={() => {
                                if (action.icon === "handoff") {
                                  setShowHandoff(true);
                                  return;
                                }

                                void updateStatus(action.nextStatus, action.details);
                              }}
                            >
                              <ActionIcon icon={action.icon} />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                          {copy.noManualAction}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.operationalSummary}</p>
                      <div className="mt-4 space-y-3 text-sm text-zinc-600">
                        {!selectedIsHistory ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-2"><AppIcon name="wait" size={15} /> {copy.waiting}</span>
                            <span className={cx("font-semibold", selectedUrgency.className)}>{selectedUrgency.label}</span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between gap-3">
                          <span>{copy.orderType}</span>
                          <span className="font-medium text-zinc-900">{selectedMode ? getOrderModeLabel(selectedMode, copy) : copy.modeLabels.pickup}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>{copy.payment}</span>
                          <span className="font-medium text-zinc-900">{getPaymentLabel(selectedOrder.payment_status, copy)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>{copy.orderQueue}</span>
                          <span className="font-medium text-zinc-900">{getQueueGroupLabel(getQueueGroup(selectedStatus || "new"), copy)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.orderControls}</p>
                      {orderIsLocked ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                          {copy.noMoreActions}
                        </div>
                      ) : isAddressEditing ? (
                        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                          {copy.addressEditingActive}
                        </div>
                      ) : (
                        <>
                          <p className="mt-2 text-sm text-zinc-600">{copy.supportActionsHint}</p>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                              disabled={busy}
                              onClick={() => openActionModal("cancel")}
                            >
                              <AppIcon name="cancel" size={16} />
                              {activeControl === "cancel" ? copy.cancelling : copy.cancelOrder}
                            </button>
                            <button
                              type="button"
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-4 text-sm font-semibold text-orange-700 hover:bg-orange-100"
                              disabled={busy}
                              onClick={() => openActionModal("refund")}
                            >
                              <AppIcon name="refund" size={16} />
                              {activeControl === "refund" ? copy.refunding : copy.refundOrder}
                            </button>
                          </div>
                        </>
                      )}

                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">{copy.selectOrder}</p>
            )}
          </div>

          {showActionModal && pendingAction && typeof document !== "undefined"
            ? createPortal(
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[6px] motion-safe:[animation:modalBackdropIn_180ms_ease-out_both]">
                  <div className="w-full max-w-2xl rounded-[2rem] border border-zinc-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,250,249,0.96))] p-5 shadow-[0_30px_80px_rgba(17,24,39,0.22)] ring-1 ring-white/70 motion-safe:[animation:modalPanelIn_240ms_cubic-bezier(0.22,1,0.36,1)_both]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-zinc-950">
                      {pendingAction === "refund" ? copy.refundOrderTitle : copy.cancelOrderTitle}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-600">{copy.modalDescription}</p>
                    {pendingAction === "refund" ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-orange-700">
                        <AppIcon name="warning" size={14} />
                        {copy.actionCannotUndo}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 active:translate-y-0"
                    disabled={busy}
                    onClick={closeActionModal}
                  >
                    {copy.close}
                  </button>
                </div>

                {pendingAction === "refund" ? (
                  <div className="mt-6 rounded-2xl bg-zinc-50/70 px-3 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">{copy.refundType}</p>
                    <div className="mt-2 relative grid grid-cols-2 rounded-2xl bg-zinc-100 p-1">
                      <span
                        aria-hidden
                        className={cx(
                          "pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-zinc-900 shadow-[0_8px_20px_rgba(17,24,39,0.22)] transition-transform duration-300 ease-out motion-reduce:transition-none",
                          refundMode === "partial" ? "translate-x-[calc(100%+0.25rem)]" : "translate-x-0",
                        )}
                        style={{ width: "calc(50% - 0.25rem)" }}
                      />

                      <button
                        type="button"
                        className={cx(
                          "relative z-10 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors duration-300",
                          refundMode === "full" ? "text-white" : "text-zinc-700 hover:text-zinc-900",
                        )}
                        onClick={() => setRefundMode("full")}
                      >
                        <AppIcon name="refund" size={14} />
                        {copy.refundFull}
                      </button>
                      <button
                        type="button"
                        className={cx(
                          "relative z-10 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors duration-300",
                          refundMode === "partial" ? "text-white" : "text-zinc-700 hover:text-zinc-900",
                        )}
                        onClick={() => setRefundMode("partial")}
                      >
                        <AppIcon name="warning" size={14} />
                        {copy.refundPartial}
                      </button>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {refundMode === "full" ? copy.refundFullHint : copy.refundPartialHint}
                    </p>

                    <div
                      className={cx(
                        "grid overflow-hidden transition-all duration-300 ease-out",
                        refundMode === "partial"
                          ? "mt-4 max-h-40 translate-y-0 opacity-100"
                          : "max-h-0 -translate-y-1 opacity-0 pointer-events-none",
                      )}
                    >
                      <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                        {copy.refundAmount}
                        <input
                          type="number"
                          min="0"
                          max={Number.isFinite(maxRefundAmount) ? maxRefundAmount : undefined}
                          step="0.01"
                          aria-invalid={isPartialRefundInvalid}
                          className={cx(
                            "mt-2 h-11 w-full rounded-xl border bg-white/95 px-4 text-sm font-medium text-zinc-900 outline-none transition-all duration-200 focus:ring-2",
                            isPartialRefundInvalid
                              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                              : "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200/70",
                          )}
                          value={refundAmount}
                          onChange={(event) => setRefundAmount(event.target.value)}
                          placeholder={String(selectedOrder?.total_amount ?? 0)}
                        />
                        <span className="mt-2 block text-[11px] leading-5 text-zinc-500">
                          {formatMessage(copy.maxAllowed, {
                            amount: selectedOrder?.total_amount ?? 0,
                            currency: selectedOrder?.currency ?? "AZN",
                          })}
                        </span>
                        <div
                          aria-live="polite"
                          className={cx(
                            "grid overflow-hidden transition-all duration-250 ease-out",
                            isPartialRefundInvalid
                              ? "mt-1 max-h-10 translate-y-0 opacity-100"
                              : "max-h-0 -translate-y-1 opacity-0",
                          )}
                        >
                          <span className="text-[11px] leading-5 text-rose-600">
                            {formatMessage(copy.refundAmountInvalid, {
                              amount: selectedOrder?.total_amount ?? 0,
                              currency: selectedOrder?.currency ?? "AZN",
                            })}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4">
                  <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                    {pendingAction === "refund" ? copy.refundReasonRequired : copy.cancelReasonRequired}
                    <textarea
                      className="mt-2 min-h-24 w-full resize-none rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                      value={actionReason}
                      onChange={(event) => setActionReason(event.target.value)}
                      placeholder={pendingAction === "refund" ? copy.refundReasonPlaceholder : copy.cancelReasonPlaceholder}
                    />
                  </label>

                  <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                    {copy.optionalNote}
                    <textarea
                      className="mt-2 min-h-24 w-full resize-none rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200/70"
                      value={actionDetails}
                      onChange={(event) => setActionDetails(event.target.value)}
                      placeholder={copy.optionalNotePlaceholder}
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-transparent bg-transparent px-4 text-sm font-medium text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-700"
                    disabled={busy}
                    onClick={closeActionModal}
                  >
                    {copy.back}
                  </button>
                  <button
                    type="button"
                    className={cx(
                      "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                      pendingAction === "refund"
                        ? "bg-orange-600 shadow-[0_10px_24px_rgba(249,115,22,0.24)] hover:bg-orange-700 hover:shadow-[0_14px_30px_rgba(249,115,22,0.28)]"
                        : "bg-rose-600 shadow-[0_10px_24px_rgba(244,63,94,0.22)] hover:bg-rose-700 hover:shadow-[0_14px_30px_rgba(244,63,94,0.26)]",
                    )}
                    disabled={
                      busy ||
                      !actionReason.trim() ||
                      (pendingAction === "refund" && refundMode === "partial" && isPartialRefundInvalid)
                    }
                    onClick={() =>
                      void runOrderAction(pendingAction, {
                        reason: actionReason,
                        details: actionDetails,
                        refundMode,
                        refundAmount,
                      })
                    }
                  >
                    <AppIcon name={pendingAction === "refund" ? "refund" : "cancel"} size={14} />
                    {pendingAction === "refund"
                      ? activeControl === "refund"
                        ? refundMode === "partial"
                          ? copy.processingPartialRefund
                          : copy.processingRefund
                        : refundPreviewAmount
                          ? formatMessage(copy.confirmRefundAmount, {
                              amount: refundPreviewAmount.toFixed(2),
                              currency: selectedOrder?.currency ?? "AZN",
                            })
                          : refundMode === "partial"
                            ? copy.confirmPartialRefund
                            : copy.confirmFullRefund
                      : activeControl === "cancel"
                        ? copy.cancelling
                        : copy.confirmCancel}
                  </button>
                </div>
                  </div>
                </div>,
                document.body,
              )
            : null}

          {selectedOrder && selectedMode === "pickup" && showHandoff ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
              <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] p-5 shadow-[0_24px_60px_rgba(16,185,129,0.14)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">{copy.handoffEyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-zinc-950">{copy.handoffTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.handoffDescription}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700"
                  onClick={() => setShowHandoff(false)}
                >
                  <AppIcon name="wait" size={15} />
                  {copy.close}
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.3rem] border border-white/70 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.customerCard}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">{getCustomerName(selectedOrder, copy)}</p>
                </div>
                <div className="rounded-[1.3rem] border border-white/70 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.orderId}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">{selectedOrder.order_number}</p>
                </div>
                <div className="rounded-[1.3rem] border border-white/70 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.phone}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">{getCustomerPhone(selectedOrder, copy)}</p>
                </div>
                <div className="rounded-[1.3rem] border border-white/70 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.pickupCode}</p>
                  <p className="mt-2 text-xl font-semibold tracking-[0.12em] text-zinc-950">{pickupCode}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-white/70 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{copy.itemsInHandoff}</p>
                <div className="mt-3 space-y-2">
                  {selectedItems.map((item, index) => (
                    <div key={`${item.perfume_slug}-${index}`} className="flex items-center justify-between gap-3 text-sm text-zinc-700">
                      <span>{item.perfume_name} ({item.size_ml}ML) × {item.quantity}</span>
                      <span className="font-medium text-zinc-900">{item.total_price.toFixed(2)} {selectedOrder.currency}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-500"
                  disabled={busy || selectedStatus !== "ready_for_pickup"}
                  onClick={() => void updateStatus("handed_over", copy.pickupCompletedDetails)}
                >
                  <AppIcon name="check" size={16} />
                  {copy.confirmHandover}
                </button>
                <div className="inline-flex min-h-14 items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm text-emerald-700">
                  {copy.handoffLockHint}
                </div>
              </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_14px_36px_rgba(17,24,39,0.06)]">
            <h3 className="text-lg font-semibold text-zinc-900">{copy.auditTitle}</h3>
            <p className="mt-1 text-sm text-zinc-500">{copy.auditDescription}</p>
            <div className="mt-4 space-y-2">
              {logs.length ? (
                logs.map((entry) => {
                  const auditAppearance = getAuditAppearance(entry.action);

                  return (
                  <div key={entry.id} className={cx("rounded-[1.3rem] border p-4", auditAppearance.wrapperClass)}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={cx("inline-flex h-10 w-10 items-center justify-center rounded-2xl border", auditAppearance.badgeClass)}>
                          <AppIcon name={auditAppearance.icon} size={18} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{getLogActionLabel(entry.action, copy)}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatMessage(copy.auditUpdatedBy, {
                              username: entry.actor_username,
                              role: entry.actor_role,
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">{formatDateTime(entry.created_at, locale)}</p>
                    </div>
                    {entry.reason ? <p className="mt-3 text-sm text-zinc-700"><span className="font-semibold text-zinc-900">{copy.auditReason}:</span> {entry.reason}</p> : null}
                    {entry.details ? <p className="mt-1 text-sm text-zinc-700"><span className="font-semibold text-zinc-900">{copy.auditUpdate}:</span> {entry.details}</p> : null}
                  </div>
                )})
              ) : (
                <p className="text-sm text-zinc-500">{copy.auditEmpty}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {status ? (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[120] sm:bottom-5 sm:left-5">
          <div className={`pointer-events-auto inline-flex max-w-[min(92vw,34rem)] items-center gap-2 rounded-2xl border px-3 py-2 text-sm shadow-[0_12px_28px_rgba(17,24,39,0.18)] backdrop-blur ${toneClass(status.tone)}`}>
            <AppIcon name={status.tone === "success" ? "check" : "warning"} size={15} />
            <span>{status.message}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
