import { fetchFor } from "./deps.ts";

const fetchForJson = fetchFor("json", true);

type Config = {
  username: string;
  password: string;
  url: string;
  website?: string;
  unit?: string;
};

export async function createUmami(config: Config, isProduction = true) {
  const umami = new Umami(config);
  if (isProduction) await umami.auth();
  return umami;
}

export class Umami {
  username: string;
  password: string;
  url: string;
  token!: string;
  website: string;
  unit?: string;
  endAt: number;
  startAt: number;
  constructor(config: Config) {
    this.username = config.username;
    this.password = config.password;
    this.url = config.url;
    this.website = config.website ?? "";
    this.unit = config.unit ?? "day";
    const today = new Date();
    this.endAt = today.getTime();
    this.startAt = today.setDate(today.getDate() - 30);
  }

  async auth() {
    const body = (await fetchForJson(`${this.url}/api/auth/login`, {
      headers: {
        accept: "application/json",
        "content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
      method: "POST",
    })) as { token: string };
    this.token = body?.token;

    return this;
  }

  async request(url: string): Promise<unknown> {
    const divider = url.includes("?") ? "&" : "?";
    const headers = new Headers({
      Accept: "*/*",
      Authorization: `Bearer ${this.token}`,
    });
    const stats = await fetchForJson(
      `${url}${divider}start_at=${this.startAt}&end_at=${this.endAt}`,
      {
        headers,
        method: "GET",
      },
    );

    return stats;
  }

  async createWebsite({
    domain,
    name,
    shareId,
  }: {
    domain: string;
    name: string;
    shareId?: string;
  }) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${this.token}`,
    };
    const url = `${this.url}/api/websites`;
    const body = JSON.stringify({ domain, name, shareId });
    const stats = (await fetchForJson(url, {
      body,
      headers,
      method: "POST",
      // deno-lint-ignore no-explicit-any
    })) as Record<string, any>;
    const shareUrl = stats.shareId
      ? new URL(`share/${stats.shareId}/{stats.name}`, this.url).href
      : null;
    return shareUrl ? { shareUrl, ...stats } : stats;
  }

  setTimerange(days: number) {
    const today = new Date();
    this.endAt = today.getTime();
    this.startAt = today.setDate(today.getDate() - days);

    return this;
  }

  unitDay() {
    // umami is using this for the charts, groups the dataset
    this.unit = "day";

    return this;
  }

  unitMonth() {
    // umami is using this for the charts, groups the dataset
    this.unit = "month";

    return this;
  }

  last90Days() {
    this.setTimerange(90);

    return this;
  }

  last30Days() {
    this.setTimerange(30);

    return this;
  }

  last7Days() {
    this.setTimerange(7);

    return this;
  }

  customRange(startAt: number, endAt: number) {
    this.startAt = startAt;
    this.endAt = endAt;

    return this;
  }

  setWebsite(website: string) {
    this.website = website;

    return this;
  }

  async deleteWebsite(id: string) {
    this.setWebsite(id);
    const headers = {
      Authorization: `Bearer ${this.token}`,
    };
    const url = `${this.url}/api/websites/${id}`;
    return await fetchForJson(url, {
      headers,
      method: "DELETE",
    });
  }

  async getStats() {
    return await this.request(`${this.url}/api/websites/${this.website}/stats`);
  }

  async getWebsites() {
    return await this.request(`${this.url}/api/websites`);
  }

  async getWebsiteByDomain(domain: string) {
    const websites = await this.request(`${this.url}/api/websites`);
    return Array.isArray(websites)
      ? websites.find((data) => data.domain === domain) ?? websites
      : websites;
  }

  async getChartPageviews() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/pageviews?unit=${this.unit}&tz=Europe/Berlin`,
    );
  }

  async getChartEvents() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/events?unit=${this.unit}&tz=Europe/Berlin`,
    );
  }

  async getEvents() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/metrics?type=event&tz=Etc%2FUTC`,
    );
  }

  async getUrls() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/metrics?type=url&tz=Etc%2FUTC`,
    );
  }

  async getReferrers() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/metrics?type=referrer&tz=Etc%2FUTC`,
    );
  }

  async getBrowsers() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/metrics?type=browser&tz=Etc%2FUTC`,
    );
  }

  async getOses() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/metrics?type=os&tz=Etc%2FUTC`,
    );
  }

  async getDevices() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/metrics?type=device&tz=Etc%2FUTC`,
    );
  }

  async getCountries() {
    return await this.request(
      `${this.url}/api/websites/${this.website}/metrics?type=country&tz=Etc%2FUTC`,
    );
  }
}
