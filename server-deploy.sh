#!/bin/bash
git push origin
ssh -i ~/.ssh/dev_server.pem ubuntu@ec2-54-243-23-223.compute-1.amazonaws.com ./dev-website/server-run.sh
