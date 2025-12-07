FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Allow passing base URLs at build time so Vite embeds them into the build
ARG ASP_NET_BASE_URL
ARG DJANGO_BASE_URL
ENV VITE_ASP_NET_BASE_URL=${ASP_NET_BASE_URL}
ENV VITE_DJANGO_BASE_URL=${DJANGO_BASE_URL}

COPY package.json package-lock.json ./

# Resolve deps on glibc (no musl lock)
RUN rm -f package-lock.json \
    && npm install --no-audit --no-fund

COPY . .

# Ensure native esbuild binary matches the JS package
RUN npm rebuild esbuild

# Build app with Vite in dist folder
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]