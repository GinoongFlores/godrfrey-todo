import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Define permissions based on backend.md specifications
  const permissions = [
    { name: "todo:create", description: "Create new todos" },
    { name: "todo:read:own", description: "Read own todos" },
    { name: "todo:read:any", description: "Read any todos" },
    { name: "todo:update:own", description: "Update own todos" },
    { name: "todo:update:any", description: "Update any todos" },
    { name: "todo:delete:own", description: "Delete own todos" },
    { name: "todo:delete:any", description: "Delete any todos" },
    { name: "user:manage", description: "Manage users and roles" },
    { name: "role:manage", description: "Manage roles and permissions" },
  ];

  // Create permissions
  console.log("Creating permissions...");
  const createdPermissions = await Promise.all(
    permissions.map(async (permission) => {
      return await prisma.permission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission,
      });
    })
  );

  // Define roles
  const roles = [
    {
      name: "admin",
      description: "Administrator with full access",
      permissions: [
        "todo:create",
        "todo:read:any",
        "todo:update:any",
        "todo:delete:any",
        "user:manage",
        "role:manage",
      ],
    },
    {
      name: "standard_user",
      description: "Standard user with access to own todos",
      permissions: [
        "todo:create",
        "todo:read:own",
        "todo:update:own",
        "todo:delete:own",
      ],
    },
    {
      name: "viewer",
      description: "Read-only access to own todos",
      permissions: ["todo:read:own"],
    },
  ];

  // Create roles and assign permissions
  console.log("Creating roles...");
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    // Clear existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Assign permissions to role
    for (const permissionName of roleData.permissions) {
      const permission = createdPermissions.find(
        (p) => p.name === permissionName
      );
      if (permission) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  // Create a default admin user
  console.log("Creating default admin user...");
  const adminRole = await prisma.role.findUnique({
    where: { name: "admin" },
  });

  if (adminRole) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        username: "admin",
        email: "admin@example.com",
        passwordHash: hashedPassword,
        roleId: adminRole.id,
      },
    });
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
