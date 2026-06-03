import createClient from "openapi-fetch";
import type { paths } from "./types";
import { env } from "@/lib/env";

export const api = createClient<paths>({ baseUrl: env.apiBase });
