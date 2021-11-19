#!/bin/bash
git reset --hard HEAD
git pull
npm i
tsc
npm stop
screen -x bot
