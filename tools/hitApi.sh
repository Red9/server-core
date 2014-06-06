#!/bin/bash

url="http://api.redninesensor.com/event/"
#url="http://api.localdev.redninesensor.com/panel/57a1ee7e-2267-fa50-358f-0d3e03f3936d/body/?format=csv"
#url="http://api.redninesensor.com/dataset/?expand=headPanel,owner"
#url="http://api.redninesensor.com/panel/ec5db3c7-cab5-eddb-186d-9c08f087e15a/body?buckets=1000&format=csv&nocache"
#url="http://api.localdev.redninesensor.com/dataset/"
#url="http://api.localdev.redninesensor.com/panel/"

temporaryFile="apiTimeFile.txt"
#command="ping -c 2 -i 0.2 'redninesensor.com'"
command="wget --quiet --output-document - '$url'"

for run in {1..20}
do
	eval "/usr/bin/time --output " $temporaryFile " --append -f \"%e\" " $command " > /dev/null"
	tail -n 1 ${temporaryFile}
done


#taken from http://unix.stackexchange.com/a/13779
cat ${temporaryFile} | sort -n |
awk 'BEGIN{c=0;sum=0;}\
/^[^#]/{a[c++]=$1;sum+=$1;}\
END{ave=sum/c;\
if((c%2)==1){median=a[int(c/2)];}\
else{median=(a[c/2]+a[c/2-1])/2;}\
print "sum: ",sum," seconds\ncnt: ",c," hits\navg: ",ave," seconds\nmed: ",median,"\nmin: ",a[0],"\nmax: ",a[c-1]}'

rm ${temporaryFile}


