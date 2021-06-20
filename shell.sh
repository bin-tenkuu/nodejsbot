#!/bin/bash
redStr=$"\033[31m"
voidStr=$"\033[0m"
cd ../
tar -zxvf nodejsbot-1.0.0.tgz
cd ./package || echo -e "${redStr}package目录不存在${voidStr}"
npm i
