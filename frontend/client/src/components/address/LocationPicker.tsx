import { useEffect, useRef, useState } from "react";
import { getDistricts, getProvinces, getWards } from "../../services/locations";
import { type District, type Province, type Ward } from "../../types/location";
import { SearchableSelect, type SearchableOption } from "./SearchableSelect";

export interface LocationPickerValue {
  province: SearchableOption | null;
  district: SearchableOption | null;
  ward: SearchableOption | null;
  addressLine: string;
}

interface LocationPickerProps {
  value: LocationPickerValue;
  onChange: (next: LocationPickerValue) => void;
  errors?: { province_id?: string; district_id?: string; ward_code?: string; address_line?: string };
}

export function LocationPicker({ value, onChange, errors }: LocationPickerProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const previousProvinceCode = useRef<number | string | null>(value.province?.code ?? null);
  const previousDistrictCode = useRef<number | string | null>(value.district?.code ?? null);

  useEffect(() => {
    getProvinces()
      .then(setProvinces)
      .finally(() => setLoadingProvinces(false));
  }, []);

  useEffect(() => {
    const provinceCode = value.province?.code ?? null;

    if (previousProvinceCode.current !== provinceCode) {
      previousProvinceCode.current = provinceCode;
      if (value.district || value.ward) {
        onChange({ ...value, district: null, ward: null });
      }
      setDistricts([]);
      setWards([]);
    }

    if (!provinceCode) return;

    setLoadingDistricts(true);
    getDistricts(Number(provinceCode))
      .then(setDistricts)
      .finally(() => setLoadingDistricts(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.province?.code]);

  useEffect(() => {
    const districtCode = value.district?.code ?? null;

    if (previousDistrictCode.current !== districtCode) {
      previousDistrictCode.current = districtCode;
      if (value.ward) {
        onChange({ ...value, ward: null });
      }
      setWards([]);
    }

    if (!districtCode) return;

    setLoadingWards(true);
    getWards(Number(districtCode))
      .then(setWards)
      .finally(() => setLoadingWards(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.district?.code]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SearchableSelect
        label="Tỉnh/Thành phố"
        placeholder="Chọn Tỉnh/Thành phố"
        options={provinces}
        value={value.province}
        loading={loadingProvinces}
        error={errors?.province_id}
        onChange={(province) => onChange({ ...value, province, district: null, ward: null })}
      />
      <SearchableSelect
        label="Quận/Huyện"
        placeholder={value.province ? "Chọn Quận/Huyện" : "Chọn Tỉnh/Thành phố trước"}
        options={districts}
        value={value.district}
        disabled={!value.province}
        loading={loadingDistricts}
        error={errors?.district_id}
        onChange={(district) => onChange({ ...value, district, ward: null })}
      />
      <SearchableSelect
        label="Phường/Xã"
        placeholder={value.district ? "Chọn Phường/Xã" : "Chọn Quận/Huyện trước"}
        options={wards}
        value={value.ward}
        disabled={!value.district}
        loading={loadingWards}
        error={errors?.ward_code}
        onChange={(ward) => onChange({ ...value, ward })}
      />
      <div className="sm:col-span-3">
        <label className="mb-1 block font-sans text-[13px] font-medium text-gray-600">
          Địa chỉ cụ thể
        </label>
        <input
          value={value.addressLine}
          onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
          placeholder="Số nhà, đường, thôn/xóm..."
          className={`w-full rounded-lg border px-3 py-2.5 font-sans text-[14px] outline-none focus:border-primary500 ${
            errors?.address_line ? "border-rose-400" : "border-gray-200"
          }`}
        />
        {errors?.address_line && (
          <p className="mt-1 font-sans text-[12px] text-rose-500">{errors.address_line}</p>
        )}
      </div>
    </div>
  );
}
