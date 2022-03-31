import { Portal } from "../portal.ts";

const router = new Portal();
router.get("http://localhost:1234/", (_req) => new Response("Hello"));

router.listen({ port: 1234 });
