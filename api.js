// Compatibilidad temporal con imports existentes. Nuevos archivos usan src/services.
export { API_BASE_URL, apiRequest } from './src/services/http';
export { login, register } from './src/services/authService';
export { createBranch } from './src/services/branchService';
