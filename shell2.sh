#!/bin/bash
echoYellow() {
	echo -e "\033[33m$1\033[0m"
}
echoRed() {
	echo -e "\033[31m$1\033[0m"
}
if [ $# != 1 ]; then
	echoRed "need 1 file"
	exit 1
fi
echoYellow "> read line <$1"
while read -r line; do
	cmd="ipset ${line}"
	echoYellow "> $cmd"
	${cmd}
done <"$1"
echoYellow "> ipset save banip >$1"
ipset save banip >"$1"
