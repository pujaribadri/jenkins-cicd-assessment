FROM node:22-alpine

WORKDIR /app

COPY app/package*.json ./

RUN npm install --omit=dev

COPY app/ ./

RUN mkdir -p /app/data

ENV PORT=3000
ENV DATA_DIR=/app/data
ENV APP_VERSION=1.0.0

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]