#!/bin/bash
git pull
npm i
tsc
npm stop
screen -x bot
