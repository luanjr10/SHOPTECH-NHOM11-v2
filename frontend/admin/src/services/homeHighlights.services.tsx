import api from "../api/axios";

export const getFlashSaleSetting = async () => {
  const res = await api.get("admin/home-highlights/flash-sale");
  return res.data;
};

export const updateFlashSaleSetting = async (endsAt: string | null) => {
  const res = await api.put("admin/home-highlights/flash-sale", {
    ends_at: endsAt,
  });
  return res.data;
};

export const getHighlightProducts = async (params?: {
  search?: string;
  highlight?: "featured" | "flash_sale";
  page?: number;
  per_page?: number;
}) => {
  const res = await api.get("admin/home-highlights/products", { params });
  return res.data;
};

export const updateProductHighlight = async (
  id: number,
  flags: { is_featured?: boolean; is_flash_sale?: boolean },
) => {
  const res = await api.patch(`admin/home-highlights/products/${id}`, flags);
  return res.data;
};
