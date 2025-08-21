FROM node:20-alpine

RUN apk add --no-cache less openssh rsync tzdata

RUN mkdir -p /app

ENV TZ=America/New_York

COPY root/.ssh /root/.ssh

RUN chmod 700 /root/.ssh
RUN chmod 600 /root/.ssh/id_ed25519

WORKDIR /app

VOLUME [ "/app" ]

ENTRYPOINT ["tail", "-f", "/dev/null"]
