import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withAuth,
  withPermission,
  AuthenticatedRequest,
} from "@/lib/middleware";
import { hasPermission } from "@/lib/auth";
import { z } from "zod";

const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional().default("open"),
});

// GET /api/todos - List todos based on user permissions
export async function GET(request: NextRequest) {
  return withAuth(request, async (authRequest: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(authRequest.url);
      const status = searchParams.get("status");
      const limit = parseInt(searchParams.get("limit") || "50");
      const offset = parseInt(searchParams.get("offset") || "0");

      const userPermissions = authRequest.user?.permissions || [];
      const userId = authRequest.user?.id || "";

      let whereClause: any = {};

      // Apply RBAC filtering
      if (hasPermission(userPermissions, "todo:read:any")) {
        // Admin can see all todos
        whereClause = {};
      } else if (hasPermission(userPermissions, "todo:read:own")) {
        // Standard user can only see their own todos
        whereClause = { userId };
      } else {
        // No read permission
        return NextResponse.json(
          { error: "Insufficient permissions to read todos" },
          { status: 403 }
        );
      }

      // Apply status filter if provided
      if (status) {
        whereClause.status = status;
      }

      const [todos, total] = await Promise.all([
        prisma.todo.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.todo.count({ where: whereClause }),
      ]);

      return NextResponse.json({
        todos,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Get todos error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

// POST /api/todos - Create a new todo
export async function POST(request: NextRequest) {
  return withPermission(
    request,
    ["todo:create"],
    async (authRequest: AuthenticatedRequest) => {
      try {
        const body = await request.json();
        const { title, description, dueDate, status } =
          createTodoSchema.parse(body);

        const userId = authRequest.user?.id || "";

        const todo = await prisma.todo.create({
          data: {
            title,
            description,
            status,
            dueDate: dueDate ? new Date(dueDate) : null,
            userId,
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

        return NextResponse.json({ todo }, { status: 201 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: error.errors[0].message },
            { status: 400 }
          );
        }

        console.error("Create todo error:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }
  );
}
