import { Portal } from "../portal.ts";

const router = new Portal();
router.get({ pathname: "/" }, (_req) => new Response("Hello"));

router.listen({ port: 1234 });
