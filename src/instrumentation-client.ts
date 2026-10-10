// Runs in the browser before the app hydrates (Next.js instrumentation-client).
// Its one job: BotID's client half. See src/lib/botid-routes.ts for why it
// exists and what broke without it.
import { initBotId } from "botid/client/core";
import { BOTID_PROTECTED } from "@/lib/botid-routes";

initBotId({ protect: BOTID_PROTECTED });
