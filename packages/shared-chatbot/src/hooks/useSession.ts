import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import type { Session } from "../types";

const client = generateClient<Schema>();

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setSession(null);
        return;
      }

      const { data, errors } = await client.models.ChatSession.get({
        id: sessionId,
      });

      if (errors) {
        console.error("Session get error", errors);
        setSession(null);
        return;
      }

      if (!data) {
        setSession(null);
        return;
      }

      setSession({
        id: data.id,
        name: data.name ?? "無題の会話",
        createdAt: data.createdAt ?? "",
        updatedAt: data.updatedAt ?? "",
      });
    };

    void fetchSession();
  }, [sessionId]);

  return session;
}
