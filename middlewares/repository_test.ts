import { validatePayloadForCreateEvent } from "./repository.ts";
import { assertEquals } from "../test_deps.ts";

const webhookCreateEvent = JSON.parse(`{
  "ref": "v0.2.4",
  "ref_type": "tag",
  "master_branch": "main",
  "description": "Middlewares for composium",
  "pusher_type": "user",
  "repository": {
    "id": 473455135,
    "name": "portal",
    "full_name": "Zaubrik/portal",
    "private": false,
    "owner": {
      "login": "Zaubrik",
      "id": 86935243,
      "avatar_url": "https://avatars.githubusercontent.com/u/86935243?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/Zaubrik",
      "html_url": "https://github.com/Zaubrik",
      "followers_url": "https://api.github.com/users/Zaubrik/followers",
      "following_url": "https://api.github.com/users/Zaubrik/following{/other_user}",
      "gists_url": "https://api.github.com/users/Zaubrik/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/Zaubrik/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/Zaubrik/subscriptions",
      "organizations_url": "https://api.github.com/users/Zaubrik/orgs",
      "repos_url": "https://api.github.com/users/Zaubrik/repos",
      "events_url": "https://api.github.com/users/Zaubrik/events{/privacy}",
      "received_events_url": "https://api.github.com/users/Zaubrik/received_events",
      "type": "Organization",
      "site_admin": false
    }
}}`);

Deno.test("validatePayloadForCreateEvent", function () {
  assertEquals(validatePayloadForCreateEvent(webhookCreateEvent), {
    repository: webhookCreateEvent.repository,
    ref_type: webhookCreateEvent.ref_type,
    ref: webhookCreateEvent.ref,
  });
});
