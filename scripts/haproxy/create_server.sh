# exit immediately if there is an error
set -e

# Make sure the system is up to date.
sudo apt-get update						# Fetches the list of available updates
sudo apt-get -y dist-upgrade	# Installs updates

#Create HAProxy
mkdir ~/haproxy
cd ~/haproxy
wget http://haproxy.1wt.eu/download/1.5/src/devel/haproxy-1.5-dev25.tar.gz
tar -xzf haproxy-1.5-dev25.tar.gz
cd haproxy-1.5-dev25/
make USE_OPENSSL=1 TARGET=linux2628
sudo make install PREFIX=/opt/haproxy



