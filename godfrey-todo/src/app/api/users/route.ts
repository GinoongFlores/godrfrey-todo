import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission, AuthenticatedRequest } from "@/lib/middleware";

// GET /api/users - List all users (Admin only)
export async function GET(request: NextRequest) {
  return withPermission(
    request,
    ["user:manage"],
    async (authRequest: AuthenticatedRequest) => {
      try {
        const users = await prisma.user.findMany({
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ users });
      } catch (error) {
        console.error("Get users error:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }
  );
}
