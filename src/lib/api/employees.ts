/**
 * Employees API Service
 * Handles all API calls related to employees/DSPs
 */

import axiosClient from '../axios';
import { UserProfile } from './users';

/**
 * Employee interface
 * Represents an employee/DSP in the system
 */
export interface Employee {
  id: string;
  uid: string; // Links to the user account
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other" | string;
  profilePicture?: string;
  agencyId?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
  // Optional user profile reference
  user?: UserProfile;
}

/**
 * Employee Response
 */
export interface EmployeeResponse {
  success: boolean;
  employee: Employee;
}

/**
 * List Employees Response
 */
export interface ListEmployeesResponse {
  success: boolean;
  count: number;
  total: number;
  employees: Employee[];
}

/**
 * List Employees Query Parameters
 */
export interface ListEmployeesParams {
  agencyId?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  search?: string;
  limit?: number;
  page?: number;
}

/**
 * Create Employee Request
 */
export interface CreateEmployeeRequest {
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other" | string;
  agencyId?: string;
}

/**
 * Update Employee Request
 */
export interface UpdateEmployeeRequest {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other" | string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
}

/**
 * Employee Training interface
 */
export interface EmployeeTraining {
  id: string;
  employeeId: string;
  trainingType: string;
  trainingName: string;
  completedAt?: string;
  expiresAt?: string;
  status: 'completed' | 'pending' | 'expired';
  certificateUrl?: string;
}

/**
 * Employee Trainings Response
 */
export interface EmployeeTrainingsResponse {
  success: boolean;
  trainings: EmployeeTraining[];
}

// ==================== API Functions ====================

/**
 * ✅ Create a new employee
 * Endpoint: POST /employees/
 */
export async function createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
  try {
    const response = await axiosClient.post<EmployeeResponse>('/employees/', data);
    
    if (!response.data.success) {
      throw new Error('Failed to create employee');
    }
    
    return response.data.employee;
  } catch (err: any) {
    console.error('createEmployee error:', err);
    throw new Error(err.message || 'Failed to create employee');
  }
}

/**
 * ✅ List employees
 * Endpoint: GET /employees/
 */
export async function listEmployees(params?: ListEmployeesParams): Promise<ListEmployeesResponse> {
  try {
    const response = await axiosClient.get<ListEmployeesResponse>('/employees/', {
      params: {
        agencyId: params?.agencyId,
        status: params?.status,
        search: params?.search,
        limit: params?.limit,
        page: params?.page,
      },
    });
    
    if (!response.data.success) {
      throw new Error('Failed to list employees');
    }
    
    return response.data;
  } catch (err: any) {
    console.error('listEmployees error:', err);
    throw new Error(err.message || 'Failed to list employees');
  }
}

/**
 * ✅ Get current employee
 * Endpoint: GET /employees/me
 */
export async function getCurrentEmployee(): Promise<Employee> {
  try {
    const response = await axiosClient.get<EmployeeResponse>('/employees/me');
    
    if (!response.data.success) {
      throw new Error('Employee not found');
    }
    
    return response.data.employee;
  } catch (err: any) {
    console.error('getCurrentEmployee error:', err);
    throw new Error(err.message || 'Failed to get current employee');
  }
}

/**
 * ✅ Get employee by ID
 * Endpoint: GET /employees/:employeeId
 */
export async function getEmployeeById(employeeId: string): Promise<Employee> {
  try {
    const response = await axiosClient.get<EmployeeResponse>(`/employees/${employeeId}`);
    
    if (!response.data.success) {
      throw new Error('Employee not found');
    }
    
    return response.data.employee;
  } catch (err: any) {
    console.error('getEmployeeById error:', err);
    throw new Error(err.message || 'Failed to get employee');
  }
}

/**
 * ✅ Update employee
 * Endpoint: PUT /employees/:employeeId
 */
export async function updateEmployee(employeeId: string, data: UpdateEmployeeRequest): Promise<Employee> {
  try {
    const response = await axiosClient.put<EmployeeResponse>(`/employees/${employeeId}`, data);
    
    if (!response.data.success) {
      throw new Error('Failed to update employee');
    }
    
    return response.data.employee;
  } catch (err: any) {
    console.error('updateEmployee error:', err);
    throw new Error(err.message || 'Failed to update employee');
  }
}

/**
 * ✅ Delete employee
 * Endpoint: DELETE /employees/:employeeId
 */
export async function deleteEmployee(employeeId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await axiosClient.delete<{ success: boolean; message: string }>(`/employees/${employeeId}`);
    
    if (!response.data.success) {
      throw new Error('Failed to delete employee');
    }
    
    return response.data;
  } catch (err: any) {
    console.error('deleteEmployee error:', err);
    throw new Error(err.message || 'Failed to delete employee');
  }
}

/**
 * ✅ Get employee trainings
 * Endpoint: GET /employees/trainings
 */
export async function getEmployeeTrainings(employeeId?: string): Promise<EmployeeTraining[]> {
  try {
    const response = await axiosClient.get<EmployeeTrainingsResponse>('/employees/trainings', {
      params: employeeId ? { employeeId } : undefined,
    });
    
    if (!response.data.success) {
      throw new Error('Failed to fetch trainings');
    }
    
    return response.data.trainings;
  } catch (err: any) {
    console.error('getEmployeeTrainings error:', err);
    throw new Error(err.message || 'Failed to fetch trainings');
  }
}

/**
 * ✅ Search employees
 * Helper function that uses listEmployees with search parameter
 */
export async function searchEmployees(query: string, agencyId?: string): Promise<Employee[]> {
  try {
    const response = await listEmployees({
      search: query,
      agencyId,
      limit: 50,
    });
    
    return response.employees;
  } catch (err: any) {
    console.error('searchEmployees error:', err);
    throw new Error(err.message || 'Failed to search employees');
  }
}

