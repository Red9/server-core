#!/bin/bash

echo "RED9 RED9 RED9 RED9 RED9 Beginning setup process."

# Make sure the system is up to date.
apt-get update

# Taken from here: http://askubuntu.com/a/147079/214729
# Needed because GRUB likes to ask you an interactive only question
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" dist-upgrade

add-apt-repository -y ppa:chris-lea/node.js
apt-get update

apt-get -y --force-yes install iotop git nodejs htop tmux upstart
apt-get -y --force-yes install cmake g++

npm install -g grunt
npm install -g grunt-cli
# Make sure to clean up the mess that npm leaves
#rm -rf /home/ubuntu/tmp
chown ubuntu:ubuntu /home/ubuntu/.npm

cd /home/ubuntu

# Make sure that the redirection is set up on every boot.
COMMAND="iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to 8080"
sed -i '2i\'"${COMMAND}"'\' /etc/rc.local

echo "RED9 RED9 RED9 RED9 RED9 All done setting up server."

shutdown -r now

