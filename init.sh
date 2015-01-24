#!/bin/bash

# This file will download all the packages, compile code, etc.
# Run this file immediately after cloning this repository.
# After running this you're good to go.

cp git-hooks/* .git/hooks/

# Just in case we forgot when we git cloned...
git submodule update --init --recursive

npm install

pushd servers/api
npm install
popd

pushd servers/html
npm install
popd

pushd rnctools
npm install
grunt build
popd

grunt
