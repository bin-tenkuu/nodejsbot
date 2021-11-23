#!/bin/bash
npm stop
git reset --hard HEAD
git pull
npm i
tsc
screen -x bot
