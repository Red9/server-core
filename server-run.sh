#!/bin/bash
cd /home/${user}/dev-website
git pull
npm install
node server.js
