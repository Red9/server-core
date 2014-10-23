# exit immediately if there is an error
set -e

# Get rid of old mount point...
sudo umount /dev/xvdb
sudo sed -i".bak" '/xvdb/d' /etc/fstab 

echo "Making filesystem."

sudo mkfs -t ext4 /dev/xvdb
sudo mkdir /ephemeral0
echo "/dev/xvdb /ephemeral0 ext4 defaults 1 2" | sudo tee -a /etc/fstab
sudo mount /ephemeral0
sudo chown -R ${USER}:${USER} /ephemeral0
sudo mkdir /ephemeral0/cassandra
sudo mkdir /ephemeral0/cassandra/commitlog
sudo mkdir /ephemeral0/cassandra/data
sudo mkdir /ephemeral0/cassandra/saved_caches


# Make sure the system is up to date.
sudo apt-get update				# Fetches the list of available updates
sudo apt-get -y --force-yes dist-upgrade	# Installs updates

# Add packages
sudo add-apt-repository -y 'deb http://www.apache.org/dist/cassandra/debian 21x main'

# Add the cassandra keys.
gpg --keyserver pgp.mit.edu --recv-keys F758CE318D77295D
gpg --export --armor F758CE318D77295D | sudo apt-key add -

sudo apt-get update

sudo apt-get -y --force-yes install jsvc cassandra iotop git htop


# We have to set this after we create the cassandra user
sudo chown -R cassandra:cassandra /ephemeral0/cassandra

