#!/bin/bash

SSHKEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAyzEOhza5cBIJz61+XhZy81IzSQT7DX+5j6GzlJbmTWSsXVsB
4YKo77bz5J5pPt+yti2O1ux8q76/GCXPn+rx88whoeB3fOPbMMbTBl/pSdG5Iiow
AvzQjZrdnUsm0exP1A3As31+N0ezol80snFskscF2PfIB40a9vYVPaz1R5l52IAb
/PY5KDLm9K61hpFC2kX3c3zpYY029Y3WxNjBpGig+jAgYZRQCXe82IsoHDDLN9BO
n4+eaAsbHQ1nK1rLyYn54o6wxeFi6mKcbAc0In+0eXkVCfaL3WCUF81PiTgvLD4x
pTCFE3NJDuJD0xSViRKaxB7vnrAT89yQIC7woQIDAQABAoIBAECILgMHgFF1iSQq
B64+FvfsLVmNeWZKIFbbljskybPeu1dS5gAHDTxEsKT1IpvTU+DEC097AAVTqUE0
EQLLDVjOhgfxUEGb5CtTmgW2RFMrhk6xc1ofjOTMQIIKMiQNlzTTwVXAD2vjG8v/
zK63kzHyf4ru9tpfGCdC9HAIFEZOiFpHEMdYeKKMJmMVZ9Xjnb2RRYH+rYnShOzp
0lwT+cDpCpUhDqE92k31iBD6cvuXv51WccVK5onPEVtbrc8FTemWOV5gzl3BwTTk
lATQQONqs8WkObDTYfVN1BwUpfDCr3s79dMIbqv5WsgerfErD1p4l9i4sL8hA+VY
JksP1KECgYEA/ReRYsGka+GxTsSLuBQBYF6pOSKY0bwyXeRXf09MQZaMnUo2yUin
j9d9mfJ67gzK1xRG29WaL0DaqXw9vzMhgPZXOrjSxofhI6/fC1UyeFsgWKHnBlDj
/erE4XUyif/UtblKVYkZs5w4tAhNgQbKo1k2Kte/SlKw707sMn2h7B0CgYEAzYa2
2Lzdvqz/+MW/0iM80arUX2w3ztPFq+Lb4EdyTfXEdHiOqHdzwTTCP1pvISpmFh78
QxhShKsXzlxKah6b33b5vU+KUIqy2OO1Eq7sFNrvAFSIWWRdkj55PfbMCvY7DjlG
cxwWApWoQk5qkrvYMdRz1s3XAXiMTZ8bwzaVx1UCgYEAjpv5D+yM+Tzy669UCyU6
oVK1h7w23/drafyAUPwdu9dY5EgtFr4ZrLN/0n8PRZNvuEF0q+pwNrAUheu730Cw
YDpubGg4XCW0dqdixr/68FZoo4iW5Lgvv6PJzEB9ecTt1nfRquDV2p7sVIVZJprt
E53xJ7Lp1rdBe5a9ALZJxwECgYBGP0U/z037XiYfYXeu21xuTXVJKDPq/XcSyPde
MQ1gmCANrycTbcCiyOWbwc06CMPby7ttM2MA9Xmtjt3gZ5XfS0sQ6Z7c6Is4lpvN
RvxqJGqMMlhoNWXGFpRaGYCkPoTw16K8tVzQhVZ9U1AZ1xqN7Y+qW7ChUBKkdT2H
+6A2AQKBgQCePNnRnpKYIuNzN+qbjC5z53hnNT6O1eR/FkI7WgJmmBK75lbJcYRw
ioH8I/Q4XrmO1X2WqyMs6uC4m2sCYbJ8BAv03kwsDJ9k5Id4ukmi7isEeCp5i8fD
c5TDNVLnT+NjePEi3ziCBQZRXBYuBvM3A6pEvEgcs7t564NR47tXaA==
-----END RSA PRIVATE KEY-----"

sudo apt-get install r-base-core
# Install R packages
# Warning: this might be brittle when versions change...
cd /tmp
wget http://cran.r-project.org/src/contrib/jsonlite_0.9.13.tar.gz
sudo R CMD INSTALL jsonlite_0.9.13.tar.gz
wget http://cran.r-project.org/src/contrib/signal_0.7-4.tar.gz
sudo R CMD INSTALL signal_0.7-4.tar.gz




echo "$SSHKEY" > /home/ubuntu/.ssh/id_rsa
chmod 700 /home/ubuntu/.ssh/id_rsa
chown ubuntu:ubuntu /home/ubuntu/.ssh/id_rsa
echo "Adding Bitbucket SSH Keys"
eval `ssh-agent`
ssh-add /home/ubuntu/.ssh/id_rsa

echo -e "Host bitbucket.org\n\tStrictHostKeyChecking no\n" >> /home/ubuntu/.ssh/config

# Create a place to put the RNCs
mkdir -p /home/ubuntu/RNC


# Get our repository
cd /home/ubuntu/
git clone git@bitbucket.org:rednine/server-core.git
cd /home/ubuntu/server-core/servers/api
npm install
grunt

