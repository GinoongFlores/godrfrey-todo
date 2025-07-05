import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/middleware";
import { canAccessResource } from "@/lib/auth";
import { z } from "zod";

const updateTodoSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
});

// GET /api/todos/[id] - Get a specific todo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const userPermissions = authRequest.user?.permissions || [];
      const currentUserId = authRequest.user?.id || "";

      const todo = await prisma.todo.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      if (!todo) {
        return NextResponse.json({ error: "Todo not found" }, { status: 404 });
      }

      // Check if user can access this resource
      if (
        !canAccessResource(
          userPermissions,
          todo.userId,
          currentUserId,
          "todo:read:own",
          "todo:read:any"
        )
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions to access this todo" },
          { status: 403 }
        );
      }

      return NextResponse.json({ todo });
    } catch (error) {
      console.error("Get todo error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

// PATCH /api/todos/[id] - Update a specific todo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const updateData = updateTodoSchema.parse(body);

      const userPermissions = authRequest.user?.permissions || [];
      const currentUserId = authRequest.user?.id || "";

      const todo = await prisma.todo.findUnique({
        where: { id },
      });

      if (!todo) {
        return NextResponse.json({ error: "Todo not found" }, { status: 404 });
      }

      // Check if user can update this resource
      if (
        !canAccessResource(
          userPermissions,
          todo.userId,
          currentUserId,
          "todo:update:own",
          "todo:update:any"
        )
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions to update this todo" },
          { status: 403 }
        );
      }

      const updatedTodo = await prisma.todo.update({
        where: { id },
        data: {
          ...updateData,
          dueDate: updateData.dueDate
            ? new Date(updateData.dueDate)
            : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({ todo: updatedTodo });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.errors[0].message },
          { status: 400 }
        );
      }

      console.error("Update todo error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/todos/[id] - Delete a specific todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const userPermissions = authRequest.user?.permissions || [];
      const currentUserId = authRequest.user?.id || "";

      const todo = await prisma.todo.findUnique({
        where: { id },
      });

      if (!todo) {
        return NextResponse.json({ error: "Todo not found" }, { status: 404 });
      }

      // Check if user can delete this resource
      if (
        !canAccessResource(
          userPermissions,
          todo.userId,
          currentUserId,
          "todo:delete:own",
          "todo:delete:any"
        )
      ) {
        return NextResponse.json(
          { error: "Insufficient permissions to delete this todo" },
          { status: 403 }
        );
      }

      await prisma.todo.delete({
        where: { id },
      });

      return NextResponse.json({ message: "Todo deleted successfully" });
    } catch (error) {
      console.error("Delete todo error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
