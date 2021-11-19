#!/bin/bash
git pull -f
npm i
tsc
npm stop
screen -x bot
