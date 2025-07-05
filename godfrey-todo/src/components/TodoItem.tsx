"use client";

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import useTodoStore, { Todo } from "@/store/todoStore";

interface TodoItemProps {
  todo: Todo;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo }) => {
  const { user, hasPermission } = useAuthStore();
  const { updateTodo, deleteTodo } = useTodoStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(
    todo.description || ""
  );

  const isOwner = user?.id === todo.userId;

  // Determine permissions based on ownership
  const canEdit =
    (isOwner && hasPermission("todo:update:own")) ||
    hasPermission("todo:update:any");
  const canDelete =
    (isOwner && hasPermission("todo:delete:own")) ||
    hasPermission("todo:delete:any");

  const handleToggleComplete = async () => {
    if (!canEdit) {
      alert("You don't have permission to update this todo.");
      return;
    }

    const newStatus = todo.status === "completed" ? "open" : "completed";
    await updateTodo(todo.id, { status: newStatus });
  };

  const handleEdit = () => {
    if (!canEdit) {
      alert("You don't have permission to edit this todo.");
      return;
    }
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      alert("Title is required");
      return;
    }

    await updateTodo(todo.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || "");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!canDelete) {
      alert("You don't have permission to delete this todo.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${todo.title}"?`)) {
      await deleteTodo(todo.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue =
    todo.dueDate &&
    new Date(todo.dueDate) < new Date() &&
    todo.status !== "completed";

  return (
    <div
      className={`border rounded-lg p-4 mb-4 ${
        todo.status === "completed"
          ? "bg-green-50 border-green-200"
          : "bg-white border-gray-200"
      } ${isOverdue ? "border-red-300 bg-red-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={todo.status === "completed"}
            onChange={handleToggleComplete}
            disabled={!canEdit}
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Description (optional)"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3
                  className={`font-medium ${
                    todo.status === "completed"
                      ? "line-through text-gray-500"
                      : "text-gray-900"
                  }`}
                >
                  {todo.title}
                </h3>
                {todo.description && (
                  <p
                    className={`text-sm mt-1 ${
                      todo.status === "completed"
                        ? "line-through text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    {todo.description}
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Owner: {todo.user.username}</span>
                  {todo.dueDate && (
                    <span
                      className={isOverdue ? "text-red-600 font-medium" : ""}
                    >
                      Due: {formatDate(todo.dueDate)}
                    </span>
                  )}
                  <span>Status: {todo.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="flex items-center space-x-2 ml-4">
            {canEdit && (
              <button
                onClick={handleEdit}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            )}
            {!canEdit && !canDelete && (
              <span className="text-gray-400 text-sm">View Only</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoItem;
