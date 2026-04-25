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
  loginWithGoogle,
  logout,
  me,
  refresh,
  register,
  resetPassword,
} from "../../service/api/auth";

export const authApi = {
  login: authService.login,
  register: authService.register,
  loginWithGoogle: authService.loginWithGoogle,
  me: authService.me,
  refresh: authService.refresh,
  logout: authService.logout,
  getCsrf: authService.getCsrf,
  forgotPassword: authService.forgotPassword,
  resetPassword: authService.resetPassword,
};

