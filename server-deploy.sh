#!/bin/bash
git push origin
ssh ubuntu@ec2-54-243-23-223.compute-1.amazonaws.com ./dev-website/server-run.sh
