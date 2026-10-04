import api from "../api/axios";
import { BrandSort } from "../types/brands.types";

export const getAllBrands = async (params?: {
  page?: number;
  per_page?: number;
  sort?: BrandSort;
  search?: string;
}) => {
  try {
    const response = await api.get("brands", { params });
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getAllBrandsNoPagination = async () => {
  try {
    const response = await api.get("/brands/all");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getBrandById = async (id: number) => {
  try {
    const response = await api.get(`brands/${id}`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const createBrand = async (data: FormData) => {
  try {
    const response = await api.post("/brands", data);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const editBrand = async (id: number, data: FormData) => {
  try {
    data.append("_method", "PUT");
    const response = await api.patch(`/brands/${id}`, data);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteBrand = async (id: number) => {
  try {
    const response = await api.delete(`/brands/${id}`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
