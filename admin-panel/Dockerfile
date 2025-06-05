FROM node:20-alpine as builder

WORKDIR /app

COPY package.json package-lock.json ./

# Install dependencies in package.json
RUN npm ci

COPY . .

# Build app with Vite in dist folder
RUN npm run build

# using Nginxa (reverse proxy)
FROM nginx:stable-alpine

# Copy a Vite files (/dist) to nginx folder 
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a special config for SPA routing
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]