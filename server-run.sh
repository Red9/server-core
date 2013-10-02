#!/bin/bash
cd /home/${USER}/data-processing
git fetch origin
git reset --hard origin/master

cd /home/${USER}/dev-website
git fetch origin
git reset --hard origin/master
npm install
node server.js
