export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
export const isGatewayId = (value) => /^[a-zA-Z0-9_-]{1,64}$/.test(value.trim());
export const isSuperuser = (user) => user?.is_superuser === true || user?.role?.toLowerCase() === 'sudo';
export const canManage = (user) => isSuperuser(user) || ['owner', 'manager'].includes(user?.role?.toLowerCase());
export const canCreateBranch = (user) => isSuperuser(user) || user?.role?.toLowerCase() === 'owner';
