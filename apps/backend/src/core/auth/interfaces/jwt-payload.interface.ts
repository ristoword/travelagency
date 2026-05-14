export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  type: 'access' | 'refresh';
}
