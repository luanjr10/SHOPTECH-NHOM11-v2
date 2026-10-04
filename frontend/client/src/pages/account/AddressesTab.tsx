import { useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from "../../services/account";
import { type Address, type AddressPayload } from "../../types/auth";
import { type ApiError } from "../../libs/api";
import {
  LocationPicker,
  type LocationPickerValue,
} from "../../components/address/LocationPicker";

const emptyLocation: LocationPickerValue = {
  province: null,
  district: null,
  ward: null,
  addressLine: "",
};

type FieldErrors = Record<string, string[]>;

function AddressesTab() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<LocationPickerValue>(emptyLocation);
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setAddresses(await fetchAddresses());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setRecipientName("");
    setPhone("");
    setLocation(emptyLocation);
    setIsDefault(addresses.length === 0);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (addr: Address) => {
    setEditing(addr);
    setRecipientName(addr.recipient_name);
    setPhone(addr.phone);
    setLocation({
      province: { code: addr.province_id_ghn, name: addr.province_name_ghn },
      district: { code: addr.district_id, name: addr.district_name },
      ward: { code: addr.ward_code_ghn, name: addr.ward_name_ghn },
      addressLine: addr.address_line,
    });
    setIsDefault(addr.is_default);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    const payload: AddressPayload = {
      recipient_name: recipientName,
      phone,
      province_id: location.province ? Number(location.province.code) : null,
      district_id: location.district ? Number(location.district.code) : null,
      ward_code: location.ward ? String(location.ward.code) : null,
      address_line: location.addressLine,
      is_default: isDefault,
    };

    try {
      if (editing) await updateAddress(editing.id, payload);
      else await createAddress(payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      const payload = (err as ApiError)?.payload as
        | { errors?: FieldErrors }
        | undefined;
      if (payload?.errors) setErrors(payload.errors);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá địa chỉ này?")) return;
    setBusyId(id);
    try {
      await deleteAddress(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (id: number) => {
    setBusyId(id);
    try {
      await setDefaultAddress(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-sans text-[18px] font-bold text-gray-800">
            Địa chỉ giao hàng
          </h2>
          <p className="font-sans text-[13px] text-gray-500">
            Quản lý địa chỉ nhận hàng của bạn
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-primary500 px-3.5 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-primary300 cursor-pointer"
        >
          <Plus className="size-4" />
          Thêm địa chỉ
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-7 animate-spin text-primary500" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <MapPin className="size-10 text-gray-300" />
          <p className="font-sans text-[14px] text-gray-500">
            Bạn chưa có địa chỉ nào
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-xl border p-4 transition-colors ${
                addr.is_default
                  ? "border-primary500/40 bg-primary500/5"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-[14px] font-semibold text-gray-800">
                      {addr.recipient_name}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="font-sans text-[13px] text-gray-500">
                      {addr.phone}
                    </span>
                    {addr.is_default && (
                      <span className="rounded-full bg-primary500/10 px-2 py-0.5 font-sans text-[11px] font-semibold text-primary500">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-sans text-[13px] text-gray-600">
                    {addr.address_line}, {addr.ward_name_ghn}, {addr.district_name}, {addr.province_name_ghn}
                  </p>
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      disabled={busyId === addr.id}
                      className="mt-2 flex items-center gap-1 font-sans text-[12px] font-medium text-gray-500 hover:text-primary500 disabled:opacity-60 cursor-pointer"
                    >
                      <Star className="size-3.5" /> Đặt làm mặc định
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(addr)}
                    className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary500 cursor-pointer"
                    title="Sửa"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={busyId === addr.id}
                    className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-60 cursor-pointer"
                    title="Xoá"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-1100 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-sans text-[16px] font-bold text-gray-800">
                {editing ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
                    Tên người nhận
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500 ${
                      errors.recipient_name ? "border-primary500" : "border-gray-200"
                    }`}
                  />
                  {errors.recipient_name && (
                    <p className="mt-1 font-sans text-[12px] text-primary500">
                      {errors.recipient_name[0]}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block font-sans text-[13px] font-medium text-gray-700">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="09xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className={`w-full rounded-lg border px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500 ${
                      errors.phone ? "border-primary500" : "border-gray-200"
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1 font-sans text-[12px] text-primary500">
                      {errors.phone[0]}
                    </p>
                  )}
                </div>
              </div>

              <LocationPicker
                value={location}
                onChange={setLocation}
                errors={{
                  province_id: errors.province_id?.[0],
                  district_id: errors.district_id?.[0],
                  ward_code: errors.ward_code?.[0],
                  address_line: errors.address_line?.[0],
                }}
              />

              <label className="flex items-center gap-2 font-sans text-[13px] text-gray-600">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="size-4 accent-primary500"
                />
                Đặt làm địa chỉ mặc định
              </label>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 font-sans text-[14px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary500 px-5 py-2.5 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-primary300 disabled:opacity-60 cursor-pointer"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {editing ? "Lưu" : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddressesTab;
