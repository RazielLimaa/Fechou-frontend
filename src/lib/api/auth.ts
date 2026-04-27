import * as authService from "../../service/api/auth";

export type {
  AuthMessageResponse,
  AuthResponse,
  AuthUser,
  CsrfResponse,
} from "../../service/api/auth";

export {
  forgotPassword,
  getCsrf,
  login,
  logout,
  me,
  register,
  resetPassword,
} from "../../service/api/auth";

export const authApi = {
  login: authService.login,
  register: authService.register,
  me: authService.me,
  logout: authService.logout,
  getCsrf: authService.getCsrf,
  forgotPassword: authService.forgotPassword,
  resetPassword: authService.resetPassword,
};

