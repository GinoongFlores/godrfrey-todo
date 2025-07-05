import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserWithPermissions, hasPermission } from "./auth";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await getUserWithPermissions(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Attach user to request
    const authRequest = request as AuthenticatedRequest;
    authRequest.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      permissions: user.permissions,
    };

    return handler(authRequest);
  } catch (error) {
    console.error("Auth middleware error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function withPermission(
  request: NextRequest,
  requiredPermissions: string[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (authRequest) => {
    const userPermissions = authRequest.user?.permissions || [];

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      hasPermission(userPermissions, permission)
    );

    if (!hasAllPermissions) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return handler(authRequest);
  });
}

export async function withResourcePermission(
  request: NextRequest,
  resourceOwnerId: string,
  ownPermission: string,
  anyPermission: string,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (authRequest) => {
    const userPermissions = authRequest.user?.permissions || [];
    const currentUserId = authRequest.user?.id || "";

    // Check if user has "any" permission (admin-level access)
    if (hasPermission(userPermissions, anyPermission)) {
      return handler(authRequest);
    }

    // Check if user has "own" permission and owns the resource
    if (
      hasPermission(userPermissions, ownPermission) &&
      resourceOwnerId === currentUserId
    ) {
      return handler(authRequest);
    }

    return NextResponse.json(
      { error: "Insufficient permissions for this resource" },
      { status: 403 }
    );
  });
}
