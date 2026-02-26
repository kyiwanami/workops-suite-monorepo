import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import type { Todo } from "../types/todo";

const client = generateClient<Schema>();

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const subscription = client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });

    return () => subscription.unsubscribe();
  }, []);

  async function createTodo() {
    const content = window.prompt("Todo content");
    if (!content) {
      return;
    }
    const { data, errors } = await client.models.Todo.create({ content });
    if (errors) {
      console.error("Todo create error", errors);
      return;
    }
    if (!data) {
      return;
    }
  }

  return { todos, createTodo };
}
