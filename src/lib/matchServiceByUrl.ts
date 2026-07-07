import type { ServiceDefinition } from "../core/services";

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** `host` が `presetHost` 自身、またはそのサブドメインかを判定する（後方一致）。 */
function isHostOrSubdomain(host: string, presetHost: string): boolean {
  return host === presetHost || host.endsWith(`.${presetHost}`);
}

/**
 * `url` の hostname が `services` のいずれかの url と一致（サブドメイン含む後方一致）したら
 * その `ServiceDefinition` を返す。`url` が不正、または一致するサービスが無ければ null。
 */
export function matchServiceByUrl(
  url: string,
  services: readonly ServiceDefinition[],
): ServiceDefinition | null {
  const host = hostnameOf(url);
  if (!host) return null;

  return (
    services.find((service) => {
      const presetHost = hostnameOf(service.url);
      return presetHost !== null && isHostOrSubdomain(host, presetHost);
    }) ?? null
  );
}
