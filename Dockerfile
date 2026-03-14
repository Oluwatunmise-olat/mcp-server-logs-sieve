FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g mcp-proxy@6.4.3 pnpm@10.14.0 \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

COPY . .

RUN pnpm install && pnpm run build

CMD ["mcp-proxy", "node", "bin/mcp-server-logs-sieve.js", "--provider", "gcp"]
