#!/bin/bash

# Make sure the system is up to date.
apt-get update

# Taken from here: http://askubuntu.com/a/147079/214729
# Needed because GRUB likes to ask you an interactive only question
DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" dist-upgrade

add-apt-repository -y ppa:chris-lea/node.js
apt-get update

apt-get -y --force-yes install iotop git nodejs htop tmux sysstat

sudo npm install -g grunt-cli
sudo npm install -g nodemon

# Make sure to clean up the mess that npm leaves
rm -rf /home/ubuntu/tmp

echo "RED9 RED9 RED9 RED9 RED9 All done setting up server."

