```markdown
# Backend Implementation Guide: RBAC Todo List App

**Version: 1.0**
**Date: July 5, 2025**

## 1. Document Header

This document provides a comprehensive implementation plan for the backend of a Todo List application featuring Role-Based Access Control (RBAC). It covers API design, data models, business logic, security considerations, performance optimizations, and provides practical code examples. The target audience is Backend Engineers responsible for building this application.

## 2. API Design

The API will follow RESTful principles. All endpoints will be prefixed with `/api/v1`. Authentication will be required for most endpoints except user registration and login.

| Endpoint             | Method | Description                                     | Authentication | Request Body                                  | Success Response (Status Code)      | Error Response (Status Code) |
| :------------------- | :----- | :---------------------------------------------- | :------------- | :-------------------------------------------- | :---------------------------------- | :--------------------------- |
| `/api/v1/auth/register` | POST   | Register a new user                             | None           | `{ username, email, password }`               | `{ user: { id, username, email } }` (201) | `{ error: string }` (400, 500) |
| `/api/v1/auth/login` | POST   | Login an existing user                          | None           | `{ username, password }` or `{ email, password }` | `{ token: string, user: { id, username, role } }` (200) | `{ error: string }` (401, 400, 500) |
| `/api/v1/users/me`   | GET    | Get authenticated user's profile                | Required       | None                                          | `{ user: { id, username, email, role } }` (200) | `{ error: string }` (401, 404) |
| `/api/v1/users`      | GET    | Get a list of all users (Admin only)            | Required (Admin) | Query Params: `?role=...`, `?search=...`      | `{ users: [...] }` (200)            | `{ error: string }` (401, 403, 500) |
| `/api/v1/users/:id`  | GET    | Get a specific user by ID (Admin/authorized)  | Required       | None                                          | `{ user: { id, username, email, role } }` (200) | `{ error: string }` (401, 403, 404) |
| `/api/v1/users/:id/role` | PATCH  | Update user's role (Admin only)               | Required (Admin) | `{ role_id: uuid }`                           | `{ user: { id, username, role } }` (200) | `{ error: string }` (401, 403, 404, 400) |
| `/api/v1/todos`      | POST   | Create a new todo                               | Required       | `{ title, description, status, dueDate }`     | `{ todo: { id, title, ... } }` (201) | `{ error: string }` (401, 400, 500) |
| `/api/v1/todos`      | GET    | Get list of todos (filtered by user/permissions)| Required       | Query Params: `?status=...`, `?dueDateBefore=...`, `?limit=...`, `?offset=...` | `{ todos: [...], total: number }` (200) | `{ error: string }` (401, 500) |
| `/api/v1/todos/:id`  | GET    | Get a specific todo by ID                       | Required       | None                                          | `{ todo: { id, title, ... } }` (200) | `{ error: string }` (401, 403, 404) |
| `/api/v1/todos/:id`  | PATCH  | Update a specific todo by ID                    | Required       | `{ title?, description?, status?, dueDate? }` | `{ todo: { id, title, ... } }` (200) | `{ error: string }` (401, 403, 404, 400) |
| `/api/v1/todos/:id`  | DELETE | Delete a specific todo by ID                    | Required       | None                                          | `{ message: "Todo deleted successfully" }` (200) | `{ error: string }` (401, 403, 404) |

**Notes:**
*   `id`s are assumed to be UUIDs for robustness.
*   `status` could be an enum (e.g., 'open', 'in-progress', 'completed').
*   `dueDate` is a standard date/time format (e.g., ISO 8601).
*   Role management endpoints (creating roles, permissions) are omitted for brevity but would exist for a full RBAC admin interface.

## 3. Data Models

Using a relational database (like PostgreSQL) is recommended for a clear representation of RBAC relationships.

**Table: `users`**

| Field         | Type    | Constraints                    | Description                       |
| :------------ | :------ | :----------------------------- | :-------------------------------- |
| `id`          | UUID    | PRIMARY KEY                    | Unique user identifier            |
| `username`    | VARCHAR | UNIQUE, NOT NULL               | User's chosen username            |
| `email`       | VARCHAR | UNIQUE, NOT NULL               | User's email address              |
| `password_hash`| VARCHAR | NOT NULL                       | Hashed password                   |
| `role_id`     | UUID    | NOT NULL, FOREIGN KEY to `roles.id` | User's assigned role              |
| `created_at`  | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp         |
| `updated_at`  | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp             |

**Table: `roles`**

| Field         | Type    | Constraints                    | Description                       |
| :------------ | :------ | :----------------------------- | :-------------------------------- |
| `id`          | UUID    | PRIMARY KEY                    | Unique role identifier            |
| `name`        | VARCHAR | UNIQUE, NOT NULL               | Role name (e.g., 'Admin', 'Standard User') |
| `description` | TEXT    |                                | Role description                  |
| `created_at`  | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp         |
| `updated_at`  | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp             |

**Table: `permissions`**

| Field         | Type    | Constraints                    | Description                       |
| :------------ | :------ | :----------------------------- | :-------------------------------- |
| `id`          | UUID    | PRIMARY KEY                    | Unique permission identifier      |
| `name`        | VARCHAR | UNIQUE, NOT NULL               | Permission name (e.g., 'todo:read:own', 'todo:read:any', 'user:manage') |
| `description` | TEXT    |                                | Permission description            |
| `created_at`  | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp         |
| `updated_at`  | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp             |

**Table: `role_permissions`** (Many-to-Many relationship between roles and permissions)

| Field           | Type    | Constraints                            | Description                       |
| :-------------- | :------ | :------------------------------------- | :-------------------------------- |
| `role_id`       | UUID    | PRIMARY KEY, FOREIGN KEY to `roles.id` | Role identifier                   |
| `permission_id` | UUID    | PRIMARY KEY, FOREIGN KEY to `permissions.id` | Permission identifier             |

**Table: `todos`**

| Field         | Type    | Constraints                    | Description                       |
| :------------ | :------ | :----------------------------- | :-------------------------------- |
| `id`          | UUID    | PRIMARY KEY                    | Unique todo identifier            |
| `user_id`     | UUID    | NOT NULL, FOREIGN KEY to `users.id` | The user who owns the todo        |
| `title`       | VARCHAR | NOT NULL                       | Todo title                        |
| `description` | TEXT    |                                | Todo details                      |
| `status`      | VARCHAR | NOT NULL                       | Todo status (e.g., 'open', 'completed') |
| `due_date`    | TIMESTAMP |                                | Optional due date                 |
| `created_at`  | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp         |
| `updated_at`  | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Last update timestamp             |

## 4. Business Logic

The core business logic involves managing users, todos, and crucially, enforcing RBAC rules.

1.  **Authentication:**
    *   **Registration:** Validate username, email, and password strength. Hash the password using a strong algorithm (bcrypt, Argon2). Create a new user record with a default role (e.g., 'Standard User').
    *   **Login:** Find the user by username or email. Compare the provided password with the stored hash. If valid, generate a JWT containing essential user information (e.g., user ID, username, role ID). The token should have an expiration. Return the token to the client.

2.  **Authorization (RBAC Enforcement):**
    *   **Permission Definitions:** Define granular permissions (e.g., `todo:read:own`, `todo:write:own`, `todo:read:any`, `user:manage`, `role:assign`).
    *   **Role-Permission Mapping:** Associate roles with sets of permissions in the `role_permissions` table.
    *   **Middleware:** Implement authorization middleware that runs after authentication. This middleware checks the authenticated user's role and its associated permissions against the required permissions for the requested endpoint and action.
        *   For operations on *specific* resources (e.g., GET `/todos/:id`, PATCH `/todos/:id`), the middleware must check if the user has permission for *that specific resource* (e.g., `todo:read:own` if the todo belongs to them, or `todo:read:any` if they can read any todo).
        *   For operations on *collections* (e.g., GET `/todos`), the query logic must filter results based on the user's permissions (e.g., only return todos owned by the user if they only have `todo:read:own`).
        *   For administrative tasks (e.g., GET `/users`, PATCH `/users/:id/role`), check for specific management permissions (e.g., `user:manage`).

3.  **Todo Management:**
    *   **Create:** Link the new todo to the authenticated user's ID.
    *   **Retrieve (List):** Query the `todos` table. If the user has `todo:read:any` permission, return all todos (with pagination). If they only have `todo:read:own`, filter the query to only include todos where `user_id` matches the authenticated user's ID.
    *   **Retrieve (Single):** Find the todo by ID. Check if the authenticated user is the owner OR has `todo:read:any` permission. Return the todo if authorized.
    *   **Update:** Find the todo by ID. Check if the authenticated user is the owner OR has `todo:write:any` permission. Apply updates if authorized.
    *   **Delete:** Find the todo by ID. Check if the authenticated user is the owner OR has `todo:delete:any` permission. Delete the todo if authorized.

4.  **User Management (Admin):**
    *   **List Users:** Requires `user:manage` permission. Query the `users` table.
    *   **Update User Role:** Requires `role:assign` permission. Update the `role_id` field for the target user. Ensure the assigned role ID is valid.

## 5. Security

*   **Authentication:**
    *   Use **JWT (JSON Web Tokens)** for stateless authentication. Store the token securely on the client-side (e.g., in HttpOnly cookies or Local Storage, with appropriate XSS precautions if using Local Storage).
    *   Sign tokens with a strong, secret key.
    *   Implement token expiration and potentially refresh tokens for a better user experience and security.
*   **Authorization:**
    *   Implement **RBAC logic strictly on the backend**. Never trust the client for permission checks.
    *   Use **middleware** to protect routes and verify permissions before executing the main handler logic.
    *   Define permissions granularly (`resource:action:scope`).
    *   Ensure that data retrieval (e.g., listing todos) *filters* results based on permissions, rather than just checking permission to access the endpoint and returning everything.
*   **Password Security:**
    *   Always **hash passwords** using a strong, slow hashing algorithm like bcrypt or Argon2. Never store plain text passwords.
    *   Use a salt during hashing.
*   **Input Validation:**
    *   Validate all incoming data on the backend to prevent injection attacks (SQL, NoSQL, XSS) and ensure data integrity.
    *   Sanitize user inputs where necessary.
*   **HTTPS:**
    *   All communication between the client and the backend must use HTTPS to encrypt data in transit, protecting JWTs and user credentials.
*   **Rate Limiting:**
    *   Implement rate limiting on authentication endpoints (login, registration) to mitigate brute-force attacks.
*   **CORS:**
    *   Configure CORS (Cross-Origin Resource Sharing) appropriately to allow requests only from trusted origins.

## 6. Performance

*   **Database Indexing:**
    *   Create indexes on frequently queried columns: `user_id` in the `todos` table, `role_id` in the `users` table, and both columns in the `role_permissions` join table. Indexes on `username`, `email` in `users` are also essential for login.
*   **Efficient Queries:**
    *   Write database queries that select only the necessary fields.
    *   Avoid N+1 query problems, especially when fetching related data (e.g., joining users with roles/permissions efficiently). Use joins or optimized ORM features.
*   **Pagination:**
    *   Implement pagination for endpoints returning lists of resources (e.g., `/todos`, `/users`) to avoid transferring excessively large amounts of data.
*   **Caching:**
    *   Cache user permissions in memory or a fast cache store (like Redis) after successful authentication or on the first authorization check, to avoid repeated database lookups for every request. Cache role-permission mappings as well.
*   **Optimized RBAC Checks:**
    *   The authorization middleware should be efficient. Loading user permissions should be fast (ideally from cache).
*   **Connection Pooling:**
    *   Use database connection pooling to manage database connections efficiently and reduce overhead.

## 7. Code Examples

Let's use a hypothetical Node.js backend with Express, a database ORM (like Sequelize or Mongoose), and `bcrypt` for password hashing, `jsonwebtoken` for JWT, and a custom RBAC middleware.

**Example 1: User Model (Conceptual using Sequelize-like syntax)**

```javascript
// Assuming using Sequelize ORM
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: { // Assuming role_id foreign key
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles', // name of the roles table
        key: 'id',
      },
    },
  }, {
    tableName: 'users',
    timestamps: true, // Adds createdAt and updatedAt
  });

  // Hook to hash password before saving
  User.beforeCreate(async (user) => {
    if (user.passwordHash) {
      const saltRounds = 10;
      user.passwordHash = await bcrypt.hash(user.passwordHash, saltRounds);
    }
  });

  // Instance method to compare password
  User.prototype.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  };

  // Define associations later: User.belongsTo(Role, { foreignKey: 'roleId' });

  return User;
};
```

**Example 2: Authentication Middleware (`authMiddleware.js`)**

```javascript
const jwt = require('jsonwebtoken');
// Assuming you have a function to find a user by ID and load their role/permissions
const { findUserByIdWithPermissions } = require('./userService');

// Secret key (ideally from environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer TOKEN"

  if (token == null) {
    return res.sendStatus(401); // No token
  }

  jwt.verify(token, JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.sendStatus(403); // Invalid token
    }

    try {
      // Find user and load their role and associated permissions
      const user = await findUserByIdWithPermissions(payload.userId);

      if (!user) {
        return res.sendStatus(401); // User not found (maybe deleted?)
      }

      req.user = user; // Attach user object with permissions to request
      next();
    } catch (dbError) {
      console.error('Error loading user in auth middleware:', dbError);
      res.sendStatus(500); // Internal server error
    }
  });
};

// Example service function (conceptual)
// async function findUserByIdWithPermissions(userId) {
//   // Fetch user by ID, join with Role and RolePermissions, then Permissions
//   const user = await User.findByPk(userId, {
//     include: {
//       model: Role,
//       include: {
//         model: Permission, // via RolePermission join table
//         attributes: ['name'],
//       },
//     },
//   });
//
//   if (user) {
//      // Flatten permissions into a simple array of strings like ['todo:read:own', 'user:manage']
//      user.permissions = user.Role.Permissions.map(p => p.name);
//      return user;
//   }
//   return null;
// }


module.exports = authMiddleware;
```

**Example 3: RBAC Authorization Middleware (`rbacMiddleware.js`)**

```javascript
// Assumes req.user object with 'permissions' array exists from authMiddleware
const rbacMiddleware = (requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];

    // Check if the user has ALL of the required permissions
    const hasPermission = requiredPermissions.every(requiredPerm =>
      userPermissions.includes(requiredPerm)
    );

    if (hasPermission) {
      next(); // User has required permissions, proceed
    } else {
      res.sendStatus(403); // Forbidden - User does not have permission
    }
  };
};

// Special middleware to check ownership OR general permission
const isOwnerOrHasPermission = (resourceModel, permissionAny) => {
  return async (req, res, next) => {
     const userPermissions = req.user.permissions || [];
     const resourceId = req.params.id; // Assuming ID is in params

     try {
        // 1. Check if user has the "any" permission
        if (userPermissions.includes(permissionAny)) {
           return next(); // Has general permission
        }

        // 2. If not, check if the user owns the resource
        const resource = await resourceModel.findByPk(resourceId); // Find resource

        if (!resource) {
            return res.sendStatus(404); // Resource not found
        }

        // Assuming resource has a 'userId' field linking to the owner
        if (resource.userId === req.user.id) {
            return next(); // User is the owner
        }

        // If neither condition met
        res.sendStatus(403); // Forbidden

     } catch (error) {
        console.error(`Error in isOwnerOrHasPermission for ${resourceModel.name}:`, error);
        res.sendStatus(500); // Internal server error
     }
  };
};


module.exports = {
  rbacMiddleware,
  isOwnerOrHasPermission,
};
```

**Example 4: Todo Route/Controller Usage**

```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { rbacMiddleware, isOwnerOrHasPermission } = require('../middleware/rbacMiddleware');
// Assuming you have a Todo model and service functions
const { Todo } = require('../models'); // Sequelize models

// Protect all todo routes with authentication
router.use(authMiddleware);

// Create Todo: Requires 'todo:write:own' permission (standard users create their own)
router.post('/', rbacMiddleware(['todo:write:own']), async (req, res) => {
  try {
    const { title, description, status, dueDate } = req.body;
    const userId = req.user.id; // Get user ID from authenticated user object

    if (!title || !status) {
        return res.status(400).json({ error: 'Title and status are required' });
    }

    const todo = await Todo.create({
      title,
      description,
      status,
      dueDate,
      userId,
    });

    res.status(201).json({ todo });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Get Todos: Handles 'todo:read:own' and 'todo:read:any'
router.get('/', async (req, res) => {
    try {
        const user = req.user; // Authenticated user with permissions

        let todos;
        const queryOptions = {
            where: {},
            limit: req.query.limit ? parseInt(req.query.limit) : 100, // Basic pagination
            offset: req.query.offset ? parseInt(req.query.offset) : 0,
            // Add ordering, filtering by status/dueDate from query params
        };

        if (user.permissions.includes('todo:read:any')) {
            // Admin or user with 'read any' permission can see all (potentially filtered by query params)
             // Add specific filters from req.query to queryOptions.where
        } else if (user.permissions.includes('todo:read:own')) {
            // Standard user can only see their own todos
            queryOptions.where.userId = user.id;
             // Add specific filters from req.query to queryOptions.where
        } else {
             // No permission to read todos
            return res.status(403).json({ error: 'Forbidden' });
        }

        const result = await Todo.findAndCountAll(queryOptions); // Get total count for pagination

        res.status(200).json({ todos: result.rows, total: result.count });

    } catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).json({ error: 'Failed to retrieve todos' });
    }
});


// Get Specific Todo: Use isOwnerOrHasPermission middleware
router.get('/:id', isOwnerOrHasPermission(Todo, 'todo:read:any'), async (req, res) => {
    try {
        // The middleware already fetched and checked the todo and attached it to the request
        // A better implementation of isOwnerOrHasPermission might pass the resource
        // Or, refetch here, knowing authz passed:
        const todoId = req.params.id;
        const todo = await Todo.findByPk(todoId); // Re-fetch or retrieve from middleware result

        if (!todo) {
             return res.status(404).json({ error: 'Todo not found' });
        }

        // At this point, the user is either the owner or has 'todo:read:any',
        // so we can return the todo.
        res.status(200).json({ todo });

    } catch (error) {
        console.error('Error fetching specific todo:', error);
        res.status(500).json({ error: 'Failed to retrieve todo' });
    }
});

// Update Specific Todo: Use isOwnerOrHasPermission middleware with 'todo:write:any' permission
router.patch('/:id', isOwnerOrHasPermission(Todo, 'todo:write:any'), async (req, res) => {
    try {
        const todoId = req.params.id;
        const updates = req.body;
        const userId = req.user.id; // For potential 'isOwner' check in middleware (already done)

        // Find the todo again to apply updates (or retrieve from middleware if available)
        const todo = await Todo.findByPk(todoId);

        if (!todo) {
             return res.status(404).json({ error: 'Todo not found' });
        }

        // Apply allowed updates - exclude 'userId' from direct update via PATCH body
        const allowedUpdates = ['title', 'description', 'status', 'dueDate'];
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                todo[key] = updates[key];
            }
        }

        await todo.save(); // Save changes

        res.status(200).json({ todo });

    } catch (error) {
        console.error('Error updating specific todo:', error);
        res.status(500).json({ error: 'Failed to update todo' });
    }
});

// Delete Specific Todo: Use isOwnerOrHasPermission middleware with 'todo:delete:any' permission
router.delete('/:id', isOwnerOrHasPermission(Todo, 'todo:delete:any'), async (req, res) => {
     try {
        const todoId = req.params.id;
        const userId = req.user.id; // For potential 'isOwner' check in middleware (already done)

        // Find the todo again to delete (or retrieve from middleware if available)
        const todo = await Todo.findByPk(todoId);

        if (!todo) {
             return res.status(404).json({ error: 'Todo not found' });
        }

        await todo.destroy(); // Delete the todo

        res.status(200).json({ message: "Todo deleted successfully" });

    } catch (error) {
        console.error('Error deleting specific todo:', error);
        res.status(500).json({ error: 'Failed to delete todo' });
    }
});


// Example Admin Route to List Users (requires 'user:manage' permission)
router.get('/admin/users', rbacMiddleware(['user:manage']), async (req, res) => {
    try {
        const users = await User.findAll({
             attributes: ['id', 'username', 'email', 'createdAt'], // Select specific fields
             include: [{ model: Role, attributes: ['name'] }] // Include role name
        }); // Add pagination/filtering as needed

        res.status(200).json({ users });
    } catch (error) {
        console.error('Error fetching users (admin):', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});


module.exports = router;
```

These examples provide a basic structure. A real-world application would require more robust error handling, request validation, logging, and potentially more sophisticated data fetching within the authorization middleware or service layer. The key is separating concerns: routes handle requests/responses, middleware handles authentication/authorization, and service layers/models handle database interaction and core business logic.
```
