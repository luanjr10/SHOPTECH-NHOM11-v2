import api from "../api/axios";
import { CategorySort } from "../types/categories.types";

export const getAllCategories = async (params?: {
  page?: number;
  per_page?: number;
  sort?: CategorySort;
  search?: string;
  parent_id?: number | "null";
}) => {
  try {
    const response = await api.get("categories", { params });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const getAllCategoriesFlat = async () => {
  try {
    const response = await api.get("categories", {
      params: { per_page: 200 },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const getCategoryById = async (id: number) => {
  try {
    const response = await api.get(`categories/${id}`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const createCategory = async (data: {
  code: string;
  name: string;
  parent_id?: number | null;
  description: string;
  display_type?: "icon" | "image";
  icon?: string;
  color?: string;
  status: number;
  brand_ids?: number[];
}) => {
  try {
    const response = await api.post("/categories", data);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const editCategory = async (
  data: {
    name: string;
    parent_id?: number | null;
    description: string;
    display_type?: "icon" | "image";
    icon?: string;
    color?: string;
    status: number;
    brand_ids?: number[];
  },
  id: number,
) => {
  try {
    const response = await api.patch(`/categories/${id}`, data);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteCategory = async (id: number) => {
  try {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const uploadCategoryImage = async (id: number, file: File) => {
  const formData = new FormData();
  formData.set("image", file);
  const response = await api.post(`/categories/${id}/image`, formData);
  return response.data;
};

export const deleteCategoryImage = async (id: number) => {
  const response = await api.delete(`/categories/${id}/image`);
  return response.data;
};
