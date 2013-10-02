#!/bin/bash
cd /home/${USER}/dev-website
git pull
npm install
node server.js
