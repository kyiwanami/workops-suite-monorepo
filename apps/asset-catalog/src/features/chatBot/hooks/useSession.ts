import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@workops/data-schema";
import type { Session } from "../types";
import packageJson from "../../../../package.json";

const client = generateClient<Schema>();
const CHAT_PROJECT_ID = packageJson.name;

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setSession(null);
        return;
      }

      const { data, errors } = await client.queries.getSession({
        projectId: CHAT_PROJECT_ID,
        sessionId,
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
        id: data.sessionId,
        name: data.name ?? "無題の会話",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    };

    void fetchSession();
  }, [sessionId]);

  return session;
}
