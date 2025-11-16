# ---- Builder ----
FROM node:20-trixie AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y unzip

COPY . .

WORKDIR /app/website

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

RUN npm run build

# ---- Runner ----
FROM nginx:stable-alpine AS runner

# Where your static files are (Vite: dist, CRA: build)
ARG BUILD_DIR=website/dist

# Clean default site
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets (switch BUILD_DIR at build time if needed)
COPY --from=builder /app/${BUILD_DIR} /usr/share/nginx/html

# Write an SPA-friendly Nginx config (works with TanStack Router)
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / {' \
  '    try_files $uri /index.html;' \
  '  }' \
  '  error_page 404 /index.html;' \
  '  location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {' \
  '    expires 6M;' \
  '    add_header Cache-Control "public";' \
  '    access_log off;' \
  '  }' \
  '}' \
  > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
