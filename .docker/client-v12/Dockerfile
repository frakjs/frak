FROM node:12-alpine

RUN apk add --no-cache less openssh rsync tzdata

RUN mkdir -p /app

ENV TZ=America/New_York

COPY root/.ssh /root/.ssh

RUN chmod 700 /root/.ssh
RUN chmod 600 /root/.ssh/id_ed25519

WORKDIR /app

VOLUME [ "/app" ]

# Loop that immediately exits when it receives a SIGTERM or SIGINT
CMD ["sh", "-c", "trap 'exit 0' TERM INT; while true; do sleep 1; done"]
