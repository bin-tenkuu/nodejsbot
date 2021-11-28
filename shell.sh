#!/bin/bash
npm stop
git reset --hard HEAD
git pull
chmod u+x ./shell.sh
npm i
tsc
screen -x bot
