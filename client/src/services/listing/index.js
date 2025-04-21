import { AxiosInstance } from "../../config/axios";
import store from "store/redux";
import { setAlldata } from "store/redux/slices/listing";
import { getAuthHeader } from "utils/auth-header";

export const create = async (payload) => {
  await AxiosInstance.post(`/listing`, payload, {
    headers: getAuthHeader(),
  })
    .then(async (response) => {})
    .catch(async () => {});
};

export const findAll = async () => {
  await AxiosInstance.get(`/listing`, {
    headers: getAuthHeader(),
  })
    .then(async (response) => {
      await store.dispatch(setAlldata(response.data));
    })
    .catch(async () => {});
};

export const findOne = async (id) => {
  try {
    const response = await AxiosInstance.get(`/listing/${id}`, {
      headers: getAuthHeader(),
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching:", error);
    throw error; 
  }
};

export const update = async (id, payload) => {
  await AxiosInstance.patch(`/listing/${id}`, payload, {
    headers: getAuthHeader(),
  })
    .then(async (response) => {})
    .catch(async () => {});
};



export const remove = async (id) => {
  await AxiosInstance.delete(`/listing/${id}`, {
    headers: getAuthHeader(),
  })
    .then(async (response) => {})
    .catch(async () => {});
};