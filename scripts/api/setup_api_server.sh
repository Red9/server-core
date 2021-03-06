#!/bin/bash

# TODO: Check for the required files before running script.
# Required files:
#  - redis.conf
#  - certificates/*

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

sudo apt-get -y --force-yes install r-base-core postgresql-client cmake
# Install R packages
# Warning: this might be brittle when versions change...
# TODO: either make sure that we can actually get this package and
# throw an error if we can't, or figure out where they keep the old
# stuff.
cd /tmp
wget http://cran.r-project.org/src/contrib/jsonlite_0.9.16.tar.gz
sudo R CMD INSTALL jsonlite_0.9.16.tar.gz
wget http://cran.r-project.org/src/contrib/signal_0.7-4.tar.gz
sudo R CMD INSTALL signal_0.7-4.tar.gz


echo "$SSHKEY" > /home/ubuntu/.ssh/id_rsa
chmod 700 /home/ubuntu/.ssh/id_rsa
chown ubuntu:ubuntu /home/ubuntu/.ssh/id_rsa
echo "Adding Bitbucket SSH Keys"
eval `ssh-agent`
ssh-add /home/ubuntu/.ssh/id_rsa

echo -e "Host bitbucket.org\n\tStrictHostKeyChecking no\n" >> /home/ubuntu/.ssh/config

cd /home/ubuntu/
mkdir -p log/apiserver

# Get our repository
git clone --recursive git@bitbucket.org:rednine/server-core.git
cd /home/ubuntu/server-core/
./init.sh

sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 8080
# TODO: This iptables-save doesn't actually save for reboot.
sudo iptables-save


# Install Redis
# taken from http://redis.io/topics/quickstart
cd /home/ubuntu
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
sudo make install
sudo mkdir /etc/redis
sudo mkdir /var/redis
sudo cp utils/redis_init_script /etc/init.d/redis_6379

# Assumes redis.conf is in the home dir
cd /home/ubuntu
sudo cp redis.conf /etc/redis/6379.conf
sudo mkdir /var/redis/6379
sudo update-rc.d redis_6379 defaults

# To start the service manually, run:
sudo /etc/init.d/redis_6379 start

echo "Don't forget to install phantomjs (2.0)! Is it in /home/clewis/bin/phantomjs? It should be installed in /usr/local/bin/phantomjs"
echo "Don't forget to install the server SSL certificates in /home/ubuntu/certificates/!"

# Format the attached EBS store
# But comment out since we only want to do that the first time...
#sudo mkfs -t ext4 /dev/xvdf
# Then mount. Again, we only want to do all this the first time.
#sudo mkdir /ebs0
#echo "/dev/xvdf /ebs0 ext4 defaults 1 2" | sudo tee -a /etc/fstab
#sudo mount /ebs0
#sudo chown -R ${USER}:${USER} /ebs0
#sudo mkdir -p /ebs0/data/rnc
#sudo chown -R ${USER}:${USER} /ebs0/data

