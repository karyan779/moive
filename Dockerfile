FROM node:22-bookworm

# Install FFmpeg, Python3 + Pango/Cairo for Burmese subtitle rendering, and Burmese fonts
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-gi \
    python3-gi-cairo \
    gir1.2-pango-1.0 \
    fonts-sil-padauk \
    fontconfig \
    && fc-cache -fv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
