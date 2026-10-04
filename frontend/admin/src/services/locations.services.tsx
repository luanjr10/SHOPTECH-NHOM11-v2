import api from "../api/axios";

export interface LocationOption {
  code: number | string;
  name: string;
}

export const getProvinces = async (): Promise<LocationOption[]> => {
  const res = await api.get("locations/provinces");
  return (res.data.data as { ProvinceID: number; ProvinceName: string }[]).map((p) => ({
    code: p.ProvinceID,
    name: p.ProvinceName,
  }));
};

export const getDistricts = async (provinceId: number): Promise<LocationOption[]> => {
  const res = await api.get(`locations/provinces/${provinceId}/districts`);
  return (res.data.data as { DistrictID: number; DistrictName: string }[]).map((d) => ({
    code: d.DistrictID,
    name: d.DistrictName,
  }));
};

export const getWards = async (districtId: number): Promise<LocationOption[]> => {
  const res = await api.get(`locations/districts/${districtId}/wards`);
  return (res.data.data as { WardCode: string; WardName: string }[]).map((w) => ({
    code: w.WardCode,
    name: w.WardName,
  }));
};
