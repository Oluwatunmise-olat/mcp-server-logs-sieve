import { container } from "tsyringe";

import { Providers, Provider } from "../constants.js";
import { LogProvider } from "./types.js";
import "./gcp/auth.js";
import { GcpLogProvider } from "./gcp/index.js";
import { AwsLogProvider } from "./aws/index.js";

const registry: Record<Provider, () => LogProvider> = {
  [Providers.GCP]: () => container.resolve(GcpLogProvider),
  [Providers.AWS]: () => new AwsLogProvider(),
  azure: function (): LogProvider {
    throw new Error("Azure not implemented.");
  },
};

export function createProvider(provider: string): LogProvider {
  const factory = registry[provider as Provider];

  if (!factory) {
    const supported = Object.values(Providers).join(", ");

    throw new Error(`Unknown provider (${provider}). Supported: ${supported}`);
  }

  return factory();
}
