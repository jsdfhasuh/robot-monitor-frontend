# 前端容器：构建 Vue 静态文件，然后用 Nginx 提供页面和 API 反向代理
FROM node:20-alpine AS build
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG VITE_USE_MOCK=false
ARG VITE_API_BASE_URL=/api
ENV npm_config_registry=${NPM_REGISTRY}
ENV npm_config_fetch_retries=2
ENV npm_config_fetch_retry_maxtimeout=20000
ENV npm_config_progress=true
ENV VITE_USE_MOCK=${VITE_USE_MOCK}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY package*.json ./
RUN npm ci --include=dev --verbose
COPY . .
RUN ./node_modules/.bin/vue-tsc --noEmit && ./node_modules/.bin/vite build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
