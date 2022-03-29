import { Portal } from "../portal.ts";

const router = new Portal();
router.get("/", (req) => new Response("Hello"));

router.listen({ port: 1234 });
