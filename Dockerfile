# Build de React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Passa la URL del backend via build-arg si vols
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN npm run build

# Serveix els estàtics amb 'serve'
FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=builder /app/build /app/build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
