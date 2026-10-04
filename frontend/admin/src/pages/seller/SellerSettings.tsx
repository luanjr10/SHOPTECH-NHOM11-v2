import { useEffect, useState } from "react";
import { Label, Select, Textarea, TextInput } from "flowbite-react";
import { CheckCircle2, Clock3, MapPin, Store as StoreIcon, XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { updateStore, updateStorePickupAddress } from "../../services/seller.services";
import { getDistricts, getProvinces, getWards, type LocationOption } from "../../services/locations.services";
import { notifyError, notifySuccess } from "../../helpers/notify";
import type { SellerStore } from "../../types/seller.types";

const STATUS_BADGE: Record<SellerStore["status"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  active: {
    label: "Đang hoạt động",
    className: "bg-emerald-500/15 text-emerald-500",
    icon: CheckCircle2,
  },
  pending: {
    label: "Chờ duyệt",
    className: "bg-amber-500/15 text-amber-500",
    icon: Clock3,
  },
  inactive: {
    label: "Đã khoá",
    className: "bg-rose-500/15 text-rose-500",
    icon: XCircle,
  },
};

export default function SellerSettings() {
  const { activeStore, refreshStores } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [wards, setWards] = useState<LocationOption[]>([]);
  const [provinceId, setProvinceId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");
  const [wardCode, setWardCode] = useState<string>("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    getProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    if (!activeStore) return;
    setPickupContactName(activeStore.pickup_contact_name ?? "");
    setPickupPhone(activeStore.pickup_phone ?? "");
    setAddressLine(activeStore.address_line ?? "");
    setProvinceId(activeStore.province_id ? String(activeStore.province_id) : "");
    setDistrictId(activeStore.district_id ? String(activeStore.district_id) : "");
    setWardCode(activeStore.ward_code ?? "");
  }, [activeStore]);

  useEffect(() => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    getDistricts(Number(provinceId)).then(setDistricts);
  }, [provinceId]);

  useEffect(() => {
    if (!districtId) {
      setWards([]);
      return;
    }
    getWards(Number(districtId)).then(setWards);
  }, [districtId]);

  if (!activeStore) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
        Bạn chưa có gian hàng nào để chỉnh sửa.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await updateStore(activeStore.id, form);
      notifySuccess("Cập nhật gian hàng thành công");
      refreshStores();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!provinceId || !districtId || !wardCode) {
      notifyError("Vui lòng chọn đủ Tỉnh/Thành phố, Quận/Huyện, Phường/Xã");
      return;
    }
    setSavingAddress(true);
    try {
      await updateStorePickupAddress(activeStore.id, {
        pickup_contact_name: pickupContactName,
        pickup_phone: pickupPhone,
        province_id: Number(provinceId),
        district_id: Number(districtId),
        ward_code: wardCode,
        address_line: addressLine,
      });
      notifySuccess("Đã cập nhật địa chỉ lấy hàng");
      refreshStores();
    } catch (err: any) {
      notifyError(err?.response?.data?.message ?? "Cập nhật địa chỉ lấy hàng thất bại");
    } finally {
      setSavingAddress(false);
    }
  };

  const status = STATUS_BADGE[activeStore.status];
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-4">
          {activeStore.logo ? (
            <img
              src={activeStore.logo}
              alt={activeStore.name}
              className="size-14 shrink-0 rounded-full object-cover ring-4 ring-violet-500/10"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
              <StoreIcon className="size-7" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{activeStore.name}</h2>
            <p className="text-xs text-gray-400">/{activeStore.slug}</p>
          </div>
        </div>
        <span
          className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
        >
          <StatusIcon className="size-3.5" /> {status.label}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
            <StoreIcon className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">Thông tin gian hàng</h3>
            <p className="text-xs text-gray-400">Tên và mô tả hiển thị công khai trên storefront.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Tên gian hàng</Label>
            <TextInput id="name" name="name" required defaultValue={activeStore.name} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" name="description" rows={4} defaultValue={activeStore.description ?? ""} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Trạng thái duyệt gian hàng chỉ do admin thay đổi, không thể tự chỉnh ở đây.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {submitting ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>

      <form
        onSubmit={handleSaveAddress}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
            <MapPin className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">Địa chỉ lấy hàng (GHN)</h3>
            <p className="text-xs text-gray-400">
              Bắt buộc trước khi có thể "Bàn giao vận chuyển" — Giao Hàng Nhanh sẽ đến lấy hàng tại đây.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pickup_contact_name">Tên liên hệ</Label>
            <TextInput
              id="pickup_contact_name"
              required
              value={pickupContactName}
              onChange={(e) => setPickupContactName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pickup_phone">Số điện thoại</Label>
            <TextInput
              id="pickup_phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="09xxxxxxxx"
              required
              value={pickupPhone}
              onChange={(e) => setPickupPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="province">Tỉnh/Thành phố</Label>
            <Select
              id="province"
              required
              value={provinceId}
              onChange={(e) => {
                setProvinceId(e.target.value);
                setDistrictId("");
                setWardCode("");
              }}
            >
              <option value="">-- Chọn --</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="district">Quận/Huyện</Label>
            <Select
              id="district"
              required
              disabled={!provinceId}
              value={districtId}
              onChange={(e) => {
                setDistrictId(e.target.value);
                setWardCode("");
              }}
            >
              <option value="">-- Chọn --</option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ward">Phường/Xã</Label>
            <Select
              id="ward"
              required
              disabled={!districtId}
              value={wardCode}
              onChange={(e) => setWardCode(e.target.value)}
            >
              <option value="">-- Chọn --</option>
              {wards.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="address_line">Địa chỉ cụ thể</Label>
          <TextInput
            id="address_line"
            required
            placeholder="Số nhà, đường..."
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={savingAddress}
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {savingAddress ? "Đang lưu..." : "Lưu địa chỉ lấy hàng"}
        </button>
      </form>
    </div>
  );
}
