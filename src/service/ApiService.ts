import axios, { AxiosError, Method } from "axios";
import { showToast } from "@/components/ui/toast";

// ===============================
// API SERVICE
// ===============================

const apiService = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ===============================
// REQUEST INTERCEPTOR
// ===============================

apiService.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ===============================
// RESPONSE INTERCEPTOR
// ===============================

apiService.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    let message = "Something went wrong. Please try again.";

    if (error.response) {
      const status = error.response.status;

      const responseData = error.response.data as {
        message?: string;
        error?: string;
      };

      message =
        responseData?.message ||
        responseData?.error ||
        "Something went wrong.";

      switch (status) {
        case 400:
          message =
            responseData?.message ||
            "Invalid request. Please check your details.";
          break;

        case 401:
          message =
            responseData?.message ||
            "Unauthorized. Please login again.";
          break;

        case 403:
          message =
            responseData?.message ||
            "You do not have permission.";
          break;

        case 404:
          message =
            responseData?.message ||
            "Requested resource not found.";
          break;

        case 409:
          message =
            responseData?.message ||
            "This record already exists.";
          break;

        case 422:
          message =
            responseData?.message ||
            "Please check the entered details.";
          break;

        case 500:
          message =
            responseData?.message ||
            "Internal server error. Please try again later.";
          break;
      }
    } else if (error.request) {
      message =
        "Unable to connect to server. Please check your internet connection.";
    } else {
      message = error.message;
    }

    // ===============================
    // GLOBAL ERROR TOAST
    // ===============================

    showToast({
      title: "Error",
      description: message,
      tone: "error",
    });

    return Promise.reject(error);
  },
);

// ===============================
// CALL API
// ===============================

interface CallApiParams {
  method: Method;
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export const callApi = async <T = unknown> ({
  method,
  url,
  data,
  params,
  headers,
}: CallApiParams): Promise<T> => {
  const response = await apiService({
    method,
    url,
    data,
    params,
    headers,
  });

  return response.data as T;
};

export default apiService;