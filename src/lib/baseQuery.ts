import { BaseQueryFn, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import axiosClient, {axiosClientWithoutAuth} from "@/lib/axios";
const baseQueryWithAuth: BaseQueryFn<
  {
    url: string;
    method: string;
    data?: FormData | any;
    params?: any;
    headers?: any;
  },
  unknown,
  FetchBaseQueryError
> = async (args) => {
  try {
    const headers =
      args.data instanceof FormData
        ? { ...args.headers }
        : { "Content-Type": "application/json", ...args.headers };

    const result = await axiosClient({
      url: args.url,
      method: args.method,
      data: args.data,
      params: args.params,
      headers: headers,
    });

    return { data: result.data };
  } catch (error: any) {
    return {
      error: {
        status: error.response?.status,
        data: error.response?.data || error.message,
      },
    };
  }
};

const baseQueryWithoutAuth: BaseQueryFn<
  {
    url: string;
    method: string;
    data?: FormData | any;
    params?: any;
    headers?: any;
  },
  unknown,
  unknown
> = async (args) => {
  try {
    const headers =
      args.data instanceof FormData
        ? { ...args.headers }
        : { "Content-Type": "application/json", ...args.headers };

    const result = await axiosClientWithoutAuth({
      url: args.url,
      method: args.method,
      data: args.data,
      params: args.params,
      headers: headers,
    });

    return { data: result.data };
  } catch (error: any) {
    return {
      error: {
        status: error.response?.status,
        data: error.response?.data || error.message,
      },
    };
  }
};

type CustomQueryArgs = {
  url: string;
  method: string;
  data?: FormData | any;
  params?: any;
  headers?: any;
  requiresAuth?: boolean;
};

export const customBaseQuery: BaseQueryFn<string | CustomQueryArgs> = async (
  args,
  api,
  extraOptions
) => {
  if (typeof args === "string") {
    args = { url: args, method: "GET" };
  }

  const { requiresAuth, ...restArgs } = args as CustomQueryArgs;
  const baseQuery = requiresAuth ? baseQueryWithAuth : baseQueryWithoutAuth;

  return baseQuery(restArgs, api, extraOptions);
};
