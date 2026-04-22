import { Providers, Provider } from "../constants.js";
import { Credentials, LogProvider } from "./types.js";
import { GcpLogProvider } from "./gcp/index.js";
import { AwsLogProvider } from "./aws/index.js";
import { AzureLogProvider } from "./azure/index.js";
import { LokiLogProvider } from "./loki/index.js";
import { ElasticsearchProvider } from "./elasticsearch/index.js";

export function createProvider(provider: string, creds?: Credentials): LogProvider {
  switch (provider as Provider) {
    case Providers.GCP:
      return new GcpLogProvider(creds);
    case Providers.AWS:
      return new AwsLogProvider(creds);
    case Providers.AZURE:
      return new AzureLogProvider(creds);
    case Providers.LOKI:
      return new LokiLogProvider(creds);
    case Providers.ELASTICSEARCH:
      return new ElasticsearchProvider(creds);
    case Providers.DATADOG:
      throw new Error("Datadog not implemented yet.");
    default: {
      const supported = Object.values(Providers).join(", ");
      throw new Error(`Unknown provider (${provider}). Supported: ${supported}`);
    }
  }
}
