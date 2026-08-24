import { BaseQueryFn, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { AxiosRequestConfig } from "axios";
import axiosClient, {axiosClientWithoutAuth} from "@/lib/axios";

type AxiosBaseQueryArgs = {
  url: string;
  method: string;
  data?: FormData | unknown;
  params?: unknown;
  headers?: Record<string, string>;
  responseType?: AxiosRequestConfig["responseType"];
};

const baseQueryWithAuth: BaseQueryFn<
  AxiosBaseQueryArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api) => {
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
      responseType: args.responseType,
      signal: api.signal,
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
  AxiosBaseQueryArgs,
  unknown,
  unknown
> = async (args, api) => {
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
      responseType: args.responseType,
      signal: api.signal,
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

type CustomQueryArgs = AxiosBaseQueryArgs & {
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
