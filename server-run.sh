#!/usr/bin/screen -S /home/ubuntu/dev-website/server-run.sh /bin/bash

## #!/bin/bash
cd /home/${USER}/data-processing
git fetch origin
git reset --hard origin/master

cd /home/${USER}/downsampler
git fetch origin
git reset --hard origin/master

cd /home/${USER}/dev-website
git fetch origin
git reset --hard origin/master
npm install
node server.js --realm http://ec2-54-243-23-223.compute-1.amazonaws.com
