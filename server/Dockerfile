FROM --platform=linux/arm64 node:22-slim AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json ./
# pnpm-workspace.yaml is needed so allowBuilds takes effect for tsx/esbuild
# in devDependencies. The workspace root lockfile is outside this build context.
RUN printf 'allowBuilds:\n  esbuild: true\n' > pnpm-workspace.yaml
RUN pnpm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

FROM --platform=linux/arm64 node:22-slim
WORKDIR /app
RUN npm install -g pnpm
COPY package.json ./
RUN pnpm install --prod
COPY --from=builder /app/dist ./dist
# AgentCore Runtime MCP contract: listen on port 8000 at /mcp
EXPOSE 8000
CMD ["node", "dist/server.js"]
