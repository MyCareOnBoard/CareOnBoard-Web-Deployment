// Common API response types
export interface ApiResponse<T = any> {
    data: T;
    message?: string;
    error?: string;
    success: boolean;
}

export interface ApiError {
    message: string;
    code?: string;
    details?: any;
}

// You can extend this with specific response types as needed
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

