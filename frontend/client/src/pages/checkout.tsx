import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgePercent,
  Check,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatExpectedDate, formatPrice } from "../libs/format";
import { placeOrder } from "../services/orders";
import { fetchAddresses } from "../services/account";
import { calculateShippingFee } from "../services/shipping";
import { applyCoupon, type CouponResult } from "../services/coupons";
import { getMyVouchers } from "../services/loyalty";
import type { MyVoucher } from "../types/loyalty";
import {
  createMomoPayment,
  createOnepayPayment,
  createSepayPayment,
  createVnpayPayment,
} from "../services/payments";
import { type ApiError } from "../libs/api";
import { type Address } from "../types/auth";
import { type PaymentMethod } from "../types/order";
import { type ShippingQuote } from "../types/shipping";
import {
  LocationPicker,
  type LocationPickerValue,
} from "../components/address/LocationPicker";

const emptyLocation: LocationPickerValue = {
  province: null,
  district: null,
  ward: null,
  addressLine: "",
};

interface PaymentMethodDef {
  id: PaymentMethod;
  name: string;
  description: string;
  monogram: string;
  from: string;
  to: string;
}

const PAYMENT_METHODS: PaymentMethodDef[] = [
  {
    id: "cod",
    name: "Thanh toán khi nhận hàng",
    description: "Trả tiền mặt cho shipper khi nhận được hàng (COD)",
    monogram: "₫",
    from: "#b45309",
    to: "#f59e0b",
  },
  {
    id: "momo",
    name: "Ví MoMo",
    description: "Thanh toán nhanh bằng ví điện tử MoMo",
    monogram: "M",
    from: "#a50064",
    to: "#d82d8b",
  },
  {
    id: "vnpay",
    name: "VNPay",
    description: "Quét QR hoặc thẻ ATM/Napas qua cổng VNPay",
    monogram: "V",
    from: "#00519a",
    to: "#0091da",
  },
  {
    id: "onepay",
    name: "OnePay",
    description: "Thẻ ATM nội địa qua cổng OnePay",
    monogram: "1",
    from: "#124b8f",
    to: "#1e88c7",
  },
  {
    id: "sepay",
    name: "SePay",
    description: "Chuyển khoản ngân hàng tự động qua SePay",
    monogram: "S",
    from: "#0f8a5f",
    to: "#33c481",
  },
];

/** Các phương thức chuyển sang cổng thanh toán bên ngoài sau khi đặt hàng. */
const GATEWAY_METHODS: PaymentMethod[] = ["momo", "vnpay", "onepay", "sepay"];

const createPaymentUrl: Partial<Record<PaymentMethod, (orderId: number) => Promise<string>>> = {
  momo: createMomoPayment,
  vnpay: createVnpayPayment,
  onepay: createOnepayPayment,
  sepay: createSepayPayment,
};

export default function CheckoutPage() {
  const { cart, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("new");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [receiverName, setReceiverName] = useState(user?.name ?? "");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [location, setLocation] = useState<LocationPickerValue>(emptyLocation);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [myVouchers, setMyVouchers] = useState<MyVoucher[]>([]);

  useEffect(() => {
    getMyVouchers()
      .then(setMyVouchers)
      .catch(() => setMyVouchers([]));
  }, []);

  useEffect(() => {
    fetchAddresses()
      .then((list) => {
        setAddresses(list);
        const defaultAddress = list.find((a) => a.is_default) ?? list[0];
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setAddressMode("saved");
        } else {
          setAddressMode("new");
        }
      })
      .finally(() => setLoadingAddresses(false));
  }, []);

  const items = (cart?.items ?? []).filter((i) => !i.unavailable && !i.stock_insufficient);
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  const toLocation =
    addressMode === "saved" && selectedAddress
      ? {
          districtId: selectedAddress.district_id,
          wardCode: selectedAddress.ward_code_ghn,
          provinceId: selectedAddress.province_id_ghn,
          provinceName: selectedAddress.province_name_ghn,
          districtName: selectedAddress.district_name,
          wardName: selectedAddress.ward_name_ghn,
        }
      : location.province && location.district && location.ward
        ? {
            districtId: Number(location.district.code),
            wardCode: String(location.ward.code),
            provinceId: Number(location.province.code),
            provinceName: location.province.name,
            districtName: location.district.name,
            wardName: location.ward.name,
          }
        : null;

  const cartItemsForFee = useMemo(
    () => items.map((i) => ({ product_id: i.product!.id, quantity: i.quantity })),
    [items],
  );

  useEffect(() => {
    if (!toLocation || cartItemsForFee.length === 0) {
      setShippingQuote(null);
      setShippingError(null);
      return;
    }
    setLoadingShipping(true);
    setShippingError(null);
    calculateShippingFee(toLocation.districtId, toLocation.wardCode, cartItemsForFee, toLocation.provinceId)
      .then((quote) => {
        setShippingQuote(quote);
        setShippingError(null);
      })
      .catch((err) => {
        setShippingQuote(null);
        setShippingError((err as ApiError)?.message ?? "Không thể tính phí vận chuyển. Vui lòng thử lại.");
      })
      .finally(() => setLoadingShipping(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toLocation?.districtId, toLocation?.wardCode, toLocation?.provinceId, JSON.stringify(cartItemsForFee)]);

  const shippingFee = shippingQuote?.total_fee ?? 0;
  const discountAmount = appliedCoupon?.discount_amount ?? 0;
  const grandTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  useEffect(() => {
    setAppliedCoupon(null);
  }, [subtotal]);

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const result = await applyCoupon(code, subtotal, shippingFee);
      setAppliedCoupon(result);
      setCouponInput(code);
    } catch (err) {
      const apiErr = err as ApiError;
      setCouponError(apiErr?.message ?? "Mã giảm giá không hợp lệ.");
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const isAddressValid =
    addressMode === "saved"
      ? Boolean(selectedAddress)
      : Boolean(
          receiverName.trim() &&
            /^0\d{9}$/.test(receiverPhone) &&
            location.province &&
            location.district &&
            location.ward &&
            location.addressLine.trim(),
        );

  const canSubmit = isAddressValid && Boolean(shippingQuote) && !loadingShipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Giỏ hàng không có sản phẩm hợp lệ để đặt hàng.");
      return;
    }
    if (!isAddressValid || !toLocation) {
      setError("Vui lòng chọn hoặc nhập đầy đủ địa chỉ giao hàng.");
      return;
    }
    if (!shippingQuote) {
      setError(shippingError ?? "Chưa tính được phí vận chuyển, vui lòng thử lại.");
      return;
    }

    const shippingInfo =
      addressMode === "saved" && selectedAddress
        ? {
            receiver_name: selectedAddress.recipient_name,
            receiver_phone: selectedAddress.phone,
            shipping_address: `${selectedAddress.address_line}, ${selectedAddress.ward_name_ghn}, ${selectedAddress.district_name}, ${selectedAddress.province_name_ghn}`,
          }
        : {
            receiver_name: receiverName,
            receiver_phone: receiverPhone,
            shipping_address: `${location.addressLine}, ${location.ward!.name}, ${location.district!.name}, ${location.province!.name}`,
          };

    setSubmitting(true);
    setError(null);
    try {
      const order = await placeOrder({
        items: items.map((i) => ({
          product_id: i.product!.id,
          sku: i.variant?.sku ?? null,
          quantity: i.quantity,
        })),
        ...shippingInfo,
        province_id: toLocation.provinceId,
        province_name: toLocation.provinceName,
        district_id: toLocation.districtId,
        district_name: toLocation.districtName,
        ward_code: toLocation.wardCode,
        ward_name: toLocation.wardName,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code ?? null,
      });
      await clear();

      const createUrl = createPaymentUrl[paymentMethod];
      if (createUrl) {
        window.location.href = await createUrl(order.id);
        return;
      }

      navigate("/dat-hang-thanh-cong", { state: { orderId: order.id, paymentMethod } });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Đặt hàng thất bại, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-16 text-center text-gray-500">
        Không có sản phẩm hợp lệ để thanh toán.{" "}
        <button
          onClick={() => navigate("/gio-hang")}
          className="font-semibold text-primary500 underline"
        >
          Quay lại giỏ hàng
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-3 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-6 font-sans text-[19px] sm:text-[22px] font-bold text-gray-900">
        Thanh toán
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-sans text-[15px] font-bold text-gray-800">
              <MapPin className="size-4 text-primary500" /> Thông tin giao hàng
            </h2>

            {loadingAddresses ? (
              <p className="font-sans text-[13px] text-gray-400">Đang tải địa chỉ...</p>
            ) : (
              <div className="flex flex-col gap-4">
                {addresses.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAddressMode("saved")}
                      className={`rounded-full px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors ${
                        addressMode === "saved"
                          ? "bg-primary500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Địa chỉ đã lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressMode("new")}
                      className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors ${
                        addressMode === "new"
                          ? "bg-primary500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Plus className="size-3.5" /> Nhập địa chỉ mới
                    </button>
                  </div>
                )}

                {addressMode === "saved" && addresses.length > 0 ? (
                  <select
                    value={selectedAddressId ?? ""}
                    onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500"
                  >
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.recipient_name} - {addr.phone} - {addr.address_line}, {addr.ward_name_ghn}, {addr.district_name}, {addr.province_name_ghn}
                        {addr.is_default ? " (mặc định)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block font-sans text-[13px] font-medium text-gray-600">
                          Họ và tên người nhận
                        </label>
                        <input
                          value={receiverName}
                          onChange={(e) => setReceiverName(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[14px] outline-none focus:border-primary500"
                          placeholder="Nguyễn Văn A"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-sans text-[13px] font-medium text-gray-600">
                          Số điện thoại
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={receiverPhone}
                          onChange={(e) =>
                            setReceiverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                          }
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[14px] outline-none focus:border-primary500"
                          placeholder="09xxxxxxxx"
                        />
                      </div>
                    </div>
                    <LocationPicker value={location} onChange={setLocation} />
                  </div>
                )}

                {toLocation && (
                  <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 font-sans text-[13px] ${
                      shippingError
                        ? "bg-rose-50 text-rose-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {shippingError ? (
                      <AlertTriangle className="size-4 shrink-0" />
                    ) : (
                      <Truck className="size-4 shrink-0" />
                    )}
                    {loadingShipping ? (
                      <span>Đang tính phí ship qua GHN...</span>
                    ) : shippingError ? (
                      <span>{shippingError}</span>
                    ) : shippingQuote ? (
                      <span>
                        Phí ship <strong>{formatPrice(shippingQuote.total_fee)}</strong>
                        {shippingQuote.by_store.length > 1 && (
                          <> (gộp {shippingQuote.by_store.length} gian hàng)</>
                        )}
                        {formatExpectedDate(shippingQuote.expected_delivery_time) && (
                          <>
                            {" "}
                            · Dự kiến nhận hàng{" "}
                            <strong>{formatExpectedDate(shippingQuote.expected_delivery_time)}</strong>
                          </>
                        )}
                        {shippingQuote.by_store.some((s) => s.same_province_express) && (
                          <>
                            {" "}
                            <span className="font-semibold text-primary500">
                              ⚡ Cùng tỉnh với gian hàng — giao nhanh trong 2 giờ
                            </span>
                          </>
                        )}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-sans text-[15px] font-bold text-gray-800">
              <ShieldCheck className="size-4 text-primary500" /> Phương thức thanh toán
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => {
                const active = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`relative flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                      active
                        ? "border-primary500 bg-primary500/5 shadow-[0_0_0_3px_rgba(215,0,24,0.08)]"
                        : "border-gray-150 hover:border-gray-300"
                    }`}
                  >
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl font-sans text-[18px] font-black text-white shadow-sm"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${method.from}, ${method.to})`,
                      }}
                    >
                      {method.monogram}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[14px] font-bold text-gray-800">
                        {method.name}
                      </span>
                      <span className="block font-sans text-[12px] text-gray-500">
                        {method.description}
                      </span>
                    </span>
                    {active && (
                      <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary500 text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-1.5 font-sans text-[12px] text-gray-400">
              <Truck className="size-3.5" /> Đơn hàng sẽ được xác nhận sau khi bạn nhấn "Đặt hàng".
            </p>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-sans text-[15px] font-bold text-gray-800">
            Đơn hàng ({items.length} sản phẩm)
          </h2>
          <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                  {item.product?.thumbnail && (
                    <img
                      src={item.product.thumbnail}
                      alt={item.product?.name}
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-sans text-[13px] font-medium text-gray-700">
                    {item.product?.name}
                  </p>
                  <p className="font-sans text-[12px] text-gray-400">
                    {formatPrice(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-sans text-[13px] font-semibold text-gray-800">
                  {formatPrice(item.subtotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3">
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
                <span className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-emerald-700">
                  <BadgePercent className="size-4" />
                  {appliedCoupon.code} — giảm {formatPrice(appliedCoupon.discount_amount)}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-emerald-600 hover:text-emerald-800"
                  aria-label="Bỏ mã giảm giá"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {myVouchers.filter(
                  (v) => v.claimed && (v.remaining_for_me === null || v.remaining_for_me > 0),
                ).length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="font-sans text-[12px] font-semibold text-gray-500">
                      Voucher của bạn (hạng {myVouchers[0]?.target_tier_label ?? ""})
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {myVouchers
                        .filter((v) => v.claimed && (v.remaining_for_me === null || v.remaining_for_me > 0))
                        .map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={applyingCoupon}
                            onClick={() => handleApplyCoupon(v.code)}
                            className="flex items-center justify-between gap-2 rounded-xl border border-primary500/30 bg-primary500/5 px-3 py-2 text-left transition-colors hover:bg-primary500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-sans text-[13px] font-semibold text-gray-800">
                                {v.title ?? v.code}
                              </span>
                              <span className="block font-sans text-[11px] text-gray-500">
                                {v.is_free_ship
                                  ? `Miễn phí vận chuyển${v.remaining_for_me !== null ? ` — còn ${v.remaining_for_me} lượt` : ""}`
                                  : v.description}
                              </span>
                            </span>
                            <span className="shrink-0 font-sans text-[12px] font-semibold text-primary500">
                              Dùng ngay
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Nhập mã giảm giá"
                      className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 font-sans text-[13px] outline-none focus:border-primary500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={applyingCoupon || !couponInput.trim()}
                    className="shrink-0 rounded-lg bg-gray-800 px-4 py-2.5 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {applyingCoupon ? <Loader2 className="size-4 animate-spin" /> : "Áp dụng"}
                  </button>
                </div>
                {couponError && (
                  <p className="font-sans text-[12px] text-rose-500">{couponError}</p>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between font-sans text-[14px] text-gray-600">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between font-sans text-[14px] text-gray-600">
              <span>Phí vận chuyển</span>
              {!toLocation ? (
                <span className="text-gray-400">Chọn địa chỉ để tính phí</span>
              ) : loadingShipping ? (
                <span className="text-gray-400">Đang tính...</span>
              ) : shippingError ? (
                <span className="text-rose-500">Lỗi tính phí</span>
              ) : (
                <span>{formatPrice(shippingFee)}</span>
              )}
            </div>
            {discountAmount > 0 && (
              <div className="mt-1 flex items-center justify-between font-sans text-[14px] text-emerald-600">
                <span>{appliedCoupon?.is_free_ship ? "Miễn phí vận chuyển" : "Giảm giá"}</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 font-sans text-[16px] font-bold text-gray-900">
              <span>Tổng cộng</span>
              <span className="text-primary500">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 font-sans text-[13px] font-medium text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="w-full rounded-xl bg-primary500 py-3 font-sans text-[15px] font-bold text-white transition-colors hover:bg-primary500/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? GATEWAY_METHODS.includes(paymentMethod)
                ? "Đang chuyển đến cổng thanh toán..."
                : "Đang xử lý..."
              : GATEWAY_METHODS.includes(paymentMethod)
                ? "Tiếp tục thanh toán"
                : "Đặt hàng"}
          </button>
        </aside>
      </form>
    </div>
  );
}
