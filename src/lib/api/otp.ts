import axiosClient from '../axios';
import { AxiosRequestConfig } from 'axios';

/**
 * Internal helper to try multiple endpoints with axios
 * Useful for backward compatibility when API endpoints might have moved
 */
async function axiosFetchWithFallback(endpoints: string[], config?: AxiosRequestConfig) {
  let lastErr: any;
  console.log(`🔄 Trying ${endpoints.length} endpoints:`, endpoints);

  for (const endpoint of endpoints) {
    try {
      const response = await axiosClient.request({
        ...config,
        url: endpoint,
      });
      console.log(`✅ Success with endpoint: ${endpoint}`);
      return response.data;
    } catch (e: any) {
      const status = e.response?.status;
      console.warn(`⚠️ Failed: ${endpoint} - Status ${status}`);

      // Only continue on 404 errors, throw others immediately
      if (status === 404) {
        lastErr = e;
        continue;
      }

      // For other errors, throw immediately
      throw e;
    }
  }

  console.error("❌ All endpoints failed");
  throw lastErr || new Error("All API endpoints are unavailable. Please contact support.");
}

/**
 * Send OTP to email
 * @param email - User's email address
 * @returns Promise with OTP send response
 */
export async function sendOtp(email: string) {
  const body = { email };
  return axiosFetchWithFallback(
    ["/otp/send", "/api/otp/send", "/auth/otp/send"],
    { method: "POST", data: body }
  );
}

/**
 * Verify OTP code
 * @param email - User's email address
 * @param otp - OTP code to verify
 * @returns Promise with verification response
 */
export async function verifyOtp(email: string, otp: string) {
  const body = { email, otp };
  return axiosFetchWithFallback(
    ["/otp/verify", "/api/otp/verify", "/auth/otp/verify"],
    { method: "POST", data: body }
  );
}

/**
 * Resend OTP to email
 * @param email - User's email address
 * @returns Promise with resend response
 */
export async function resendOtp(email: string) {
  const body = { email };
  return axiosFetchWithFallback(
    ["/otp/resend", "/api/otp/resend", "/auth/otp/resend"],
    { method: "POST", data: body }
  );
}

/**
 * Get OTP status for email
 * @param email - User's email address
 * @returns Promise with OTP status
 */
export async function getOtpStatus(email: string) {
  return axiosFetchWithFallback(
    [`/otp/status?email=${encodeURIComponent(email)}`, `/api/otp/status?email=${encodeURIComponent(email)}`],
    { method: "GET" }
  );
}
