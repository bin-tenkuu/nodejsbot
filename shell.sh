#!/bin/bash
npm stop
git reset --hard HEAD
git pull
chmod u+x ./shell.sh
npm i
tsc
screen -x bot -p 0 -X stuff $"npm start \n"
