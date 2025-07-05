import { create } from "zustand";

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (todoData: {
    title: string;
    description?: string;
    dueDate?: string;
  }) => Promise<void>;
  updateTodo: (id: string, todoData: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  clearError: () => void;
}

const getAuthToken = () => localStorage.getItem("authToken");

const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,

  fetchTodos: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch("/api/todos", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch todos");
      }

      const data = await response.json();
      set({ todos: data.todos, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addTodo: async (todoData) => {
    set({ isLoading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(todoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create todo");
      }

      const data = await response.json();
      set((state) => ({
        todos: [data.todo, ...state.todos],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateTodo: async (id, todoData) => {
    set({ isLoading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(todoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update todo");
      }

      const data = await response.json();
      set((state) => ({
        todos: state.todos.map((todo) => (todo.id === id ? data.todo : todo)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteTodo: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete todo");
      }

      set((state) => ({
        todos: state.todos.filter((todo) => todo.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useTodoStore;
