import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission, AuthenticatedRequest } from "@/lib/middleware";
import { z } from "zod";

const updateRoleSchema = z.object({
  roleId: z.string().min(1, "Role ID is required"),
});

// PATCH /api/users/[id]/role - Update user's role (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(
    request,
    ["user:manage"],
    async (authRequest: AuthenticatedRequest) => {
      try {
        const { id } = await params;
        const body = await request.json();
        const { roleId } = updateRoleSchema.parse(body);

        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { id },
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Check if role exists
        const role = await prisma.role.findUnique({
          where: { id: roleId },
        });

        if (!role) {
          return NextResponse.json(
            { error: "Role not found" },
            { status: 404 }
          );
        }

        // Update user's role
        const updatedUser = await prisma.user.update({
          where: { id },
          data: { roleId },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        });

        return NextResponse.json({
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: error.errors[0].message },
            { status: 400 }
          );
        }

        console.error("Update user role error:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }
  );
}
