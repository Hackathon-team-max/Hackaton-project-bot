FROM ubuntu:24.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libsqlite3-dev \
    libcurl4-openssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /build-src

COPY . .

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --config Release


FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    libcurl4 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --home-dir /var/lib/max-bot --shell /usr/sbin/nologin max-bot

RUN mkdir -p /opt/max-bot /var/lib/max-bot && \
    chown -R max-bot:max-bot /var/lib/max-bot

COPY --from=builder /build-src/build/max_bot /opt/max-bot/max_bot
RUN chmod +x /opt/max-bot/max_bot

USER max-bot
WORKDIR /var/lib/max-bot

# api_client.cpp задаёт CURLOPT_CAINFO="russiantrustedca.pem" (путь относительно
# рабочего каталога процесса) — без файла long polling к MAX API не работает.
COPY --chown=max-bot:max-bot russiantrustedca.pem /var/lib/max-bot/

EXPOSE 8080

CMD ["/opt/max-bot/max_bot"]
