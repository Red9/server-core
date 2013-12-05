#!/bin/bash
set -e

sudo yes | sudo apt-get install mdadm

# Get the local hard drives (ephemeral(s)) into a RAID1 configuration.
# http://www.liferay.com/web/neil.griffin/blog/-/blogs/utilizing-instance-storage-ephemeral-storage-with-rhel-on-amazon-ec2
# http://www.gabrielweinberg.com/blog/2011/05/raid0-ephemeral-storage-on-aws-ec2.html

sudo umount /dev/xvdb

# Make sure there isn't a RAID already. If there is delete it.
#sudo mdadm --stop /dev/md0
#sudo mdadm --remove /dev/md0
#sudo mdadm --zero-superblock /dev/xvdb /dev/xvdc

# m1.large
#sudo yes | sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/xvdb /dev/xvdc
#echo 'DEVICE /dev/xvdb /dev/xvdc' | sudo tee -a /etc/mdadm.conf
#sudo mdadm --detail --scan | sudo tee -a /etc/mdadm.conf

# m1.xlarge
# All 4 disks raided together
#sudo yes | sudo mdadm --create /dev/md0 --level=1 --raid-devices=4 /dev/xvdb /dev/xvdc /dev/xvdd /dev/xvde
#echo 'DEVICE /dev/xvdb /dev/xvdc /dev/xvdd /dev/xvde' | sudo tee -a /etc/mdadm.conf
#sudo mdadm --detail --scan | sudo tee -a /etc/mdadm.conf

# m1.xlarge
# 3 disks raided together, the last ( /dev/xvde ) on it's own.
sudo yes | sudo mdadm --create /dev/md0 --level=1 --raid-devices=3 /dev/xvdb /dev/xvdc /dev/xvdd
echo 'DEVICE /dev/xvdb /dev/xvdc /dev/xvdd' | sudo tee -a /etc/mdadm.conf
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm.conf


# Make sure the system is up to date.
sudo apt-get update						# Fetches the list of available updates
sudo yes | sudo apt-get dist-upgrade	# Installs updates

# Add packages, including multiverse.
sudo -e /etc/apt/sources.list
sudo add-apt-repository 'deb http://www.apache.org/dist/cassandra/debian 20x main'
sudo yes | sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo yes | sudo apt-get install python-software-properties python openjdk-7-jre gcc g++ jsvc cassandra iotop git make ec2-api-tools nodejs maven


cd /home/${USER}/

cd /home/${USER}/.ssh
rm -f ~/.ssh/id_rsa*
ssh-keygen -q -t rsa -P "" -f ~/.ssh/id_rsa
eval `ssh-agent`
ssh-add id_rsa
echo ""
echo ""
cat id_rsa.pub
echo ""
echo ""
echo "Please go to these repositories and add the key that is on the previous lines:"
echo "https://bitbucket.org/rednine/dev-website/admin/deploy-keys"
echo "https://bitbucket.org/rednine/data-processing/admin/deploy-keys"
echo "https://bitbucket.org/rednine/downsampler/admin/deploy-keys"


# NOTE: the IP redirection needs to be run on every boot!!!
# Source: http://www.debian-administration.org/articles/386
# Flush any existing firewall rules we might have
sudo iptables -F
sudo iptables -t nat -F
sudo iptables -t mangle -F
sudo iptables -X

# Perform the redirecton to port 80.
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to 8080



# You must manually wait for resync to finish.
# I think so at least, although the docs seem to disagree (http://www.dsm.fordham.edu/cgi-bin/man-cgi.pl?topic=mdadm).
# Maybe go ahead and see what happens.
cat /proc/mdstat

echo "Making RAID filesystem."

# Raid'd disks
sudo mkfs -t ext4 /dev/md0
sudo mkdir /ephemeral0
echo "/dev/md0 /ephemeral0 ext4 defaults 1 2" | sudo tee -a /etc/fstab
sudo mount /ephemeral0
sudo chown -R ${USER}:${USER} /ephemeral0
sudo mkdir /ephemeral0/cassandra
sudo chown -R cassandra:cassandra /ephemeral0/cassandra

# Extra (non-raid'd) disk
sudo mkfs -t ext4 /dev/xvde
sudo mkdir /ephemeral1
echo "/dev/xvde /ephemeral1 ext4 defaults 1 2" | sudo tee -a /etc/fstab
sudo mount /ephemeral1
sudo chown -R ${USER}:${USER} /ephemeral1
sudo mkdir /ephemeral1/cassandra
sudo chown -R cassandra:cassandra /ephemeral1/cassandra

echo "Don't forget to edit /etc/cassandra/cassandra.yaml for the correct (ephemeral0) directories!"
read -p "Press [Enter] key to continue after adding Git keys (see above), and after editing cassandra.yaml"

sudo service cassandra restart

cd /home/${USER}/
yes | git clone git@bitbucket.org:rednine/data-processing.git

cd /home/${USER}/
yes | git clone git@bitbucket.org:rednine/downsampler.git

cd /home/${USER}/
yes | git clone git@bitbucket.org:rednine/dev-website.git

cd dev-website/node/
ln -s /home/${USER}/data-processing/target/rnb2rnt-server.jar
ln -s /home/${USER}/downsampler/target/downsampler.jar
mkdir logs

cd ../
cqlsh -f cassandra_dev_website_create_database.txt
chmod +x /home/${USER}/dev-website/server_run.sh
/home/${USER}/dev-website/server_run.sh

echo "You still need to start the Node server, and remember to update the iptables on every boot!"



