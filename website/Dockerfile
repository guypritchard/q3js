FROM node:20-trixie AS builder
WORKDIR /app

COPY . .

WORKDIR /app/website
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
RUN npm run build

FROM nginx:stable-alpine AS runner

RUN mkdir -p /usr/share/nginx/html/data

ARG BUILD_DIR=website/dist

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/${BUILD_DIR} /usr/share/nginx/html

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
  '' \
  '  # Serve mounted game data' \
  '  location /data/ {' \
  '    alias /usr/share/nginx/html/data/;' \
  '    autoindex on;' \
  '  }' \
  '' \
  '  location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {' \
  '    expires 6M;' \
  '    add_header Cache-Control "public";' \
  '    access_log off;' \
  '  }' \
  '}' \
  > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
