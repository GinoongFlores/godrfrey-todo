import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function getUserWithPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    ...user,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.name),
  };
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<JWTPayload | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) return null;

  const permissions = user.role.rolePermissions.map((rp) => rp.permission.name);

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions,
  };
}

export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission);
}

export function canAccessResource(
  userPermissions: string[],
  resourceOwnerId: string,
  currentUserId: string,
  ownPermission: string,
  anyPermission: string
): boolean {
  // Check if user has "any" permission (admin-level access)
  if (hasPermission(userPermissions, anyPermission)) {
    return true;
  }

  // Check if user has "own" permission and owns the resource
  if (
    hasPermission(userPermissions, ownPermission) &&
    resourceOwnerId === currentUserId
  ) {
    return true;
  }

  return false;
}
