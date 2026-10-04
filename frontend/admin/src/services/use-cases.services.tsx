import api from "../api/axios";

export const getUseCasesByCategory = async (categoryId: number) => {
  try {
    const response = await api.get(`categories/${categoryId}/use-cases`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const createUseCase = async (categoryId: number, data: FormData) => {
  try {
    const response = await api.post(`categories/${categoryId}/use-cases`, data);
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const updateUseCase = async (
  categoryId: number,
  useCaseId: string,
  data: FormData,
) => {
  try {
    data.append("_method", "PUT");
    const response = await api.post(
      `categories/${categoryId}/use-cases/${useCaseId}`,
      data,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteUseCase = async (categoryId: number, useCaseId: string) => {
  try {
    const response = await api.delete(
      `categories/${categoryId}/use-cases/${useCaseId}`,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
