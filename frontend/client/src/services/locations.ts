import { apiGet } from "../libs/api";
import { type District, type Province, type Ward } from "../types/location";

interface RawProvince {
  ProvinceID: number;
  ProvinceName: string;
}

interface RawDistrict {
  DistrictID: number;
  DistrictName: string;
}

interface RawWard {
  WardCode: string;
  WardName: string;
}

let provincesPromise: Promise<Province[]> | null = null;
const districtsPromiseByProvince = new Map<number, Promise<District[]>>();
const wardsPromiseByDistrict = new Map<number, Promise<Ward[]>>();

export function getProvinces(): Promise<Province[]> {
  if (!provincesPromise) {
    provincesPromise = apiGet<{ data: RawProvince[] }>("/locations/provinces")
      .then((res) => res.data.map((p) => ({ code: p.ProvinceID, name: p.ProvinceName })))
      .catch((err) => {
        provincesPromise = null;
        throw err;
      });
  }
  return provincesPromise;
}

export function getDistricts(provinceCode: number): Promise<District[]> {
  if (!districtsPromiseByProvince.has(provinceCode)) {
    const promise = apiGet<{ data: RawDistrict[] }>(
      `/locations/provinces/${provinceCode}/districts`,
    )
      .then((res) => res.data.map((d) => ({ code: d.DistrictID, name: d.DistrictName })))
      .catch((err) => {
        districtsPromiseByProvince.delete(provinceCode);
        throw err;
      });
    districtsPromiseByProvince.set(provinceCode, promise);
  }
  return districtsPromiseByProvince.get(provinceCode)!;
}

export function getWards(districtCode: number): Promise<Ward[]> {
  if (!wardsPromiseByDistrict.has(districtCode)) {
    const promise = apiGet<{ data: RawWard[] }>(`/locations/districts/${districtCode}/wards`)
      .then((res) => res.data.map((w) => ({ code: w.WardCode, name: w.WardName })))
      .catch((err) => {
        wardsPromiseByDistrict.delete(districtCode);
        throw err;
      });
    wardsPromiseByDistrict.set(districtCode, promise);
  }
  return wardsPromiseByDistrict.get(districtCode)!;
}
