FROM alpine:latest

RUN apk add --no-cache bash openssh openssh-server rsync shadow

RUN chsh root -s /bin/bash

RUN mkdir -p /var/run/sshd

RUN mkdir -p /var/www/html

COPY root/.ssh /root/.ssh

RUN chmod 700 /root/.ssh
RUN chmod 600 /root/.ssh/authorized_keys

RUN ssh-keygen -A

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]

VOLUME [ "/var/www/html", "/var/www/example.after" ]
