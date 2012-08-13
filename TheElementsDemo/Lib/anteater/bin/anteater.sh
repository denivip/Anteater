# This file is part of Anteater.
#
# Anteater is free software: you can redistribute
# it under the terms of our license: http://www.redant.com/anteater/license
#
# Anteater is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
# See our license: http://www.redant.com/anteater/license for more details.
#
#
# anteater.sh
# Anteater
#
# Created by Peter Nash on 26/06/2011
# Copyright 2011 Red Ant Mobile. All rights reserved.

function quitAppInSimulator {
    simId=`ps -A | grep "/Library/Application Support/iPhone Simulator/.*.app*" | grep -v grep | awk '{print $1}'`
    if [[ $simId != "" ]]; then
        echo "Killing app: $simId"
        kill -9 $simId
        sleep 5
    fi
}
function buildIfNeeded {
    #build main as auto test
     find build -name *.app | xargs rm -rf
     xcodebuild -sdk iphonesimulator4.3 -configuration "Auto test" build
}
function appQuit {
ps -A | grep "/Library/Application Support/iPhone Simulator/.*.app*" | grep -v grep
return $?
}

function quitSimulator {
ps -A | grep "/Developer/Platforms/iPhoneSimulator.platform/Developer/Applications/iPhone Simulator.app/Contents/MacOS/iPhone Simulator" | grep -v grep | awk '{print $1}' | while read pid; do 
echo "Killing $pid"
kill -9 $pid
done
}

function startApp {
	if [[ $trace_memory_and_leaks != "" ]]; then
		echo "profiling with memory and leaks template - warning requires user to enter password.";
		template="/Developer/Applications/Instruments.app/Contents/Resources/templates/Leaks.tracetemplate"
 		instruments  -D "$outputDir/leaks.trace" -t "$template" -l $(((10+stability_test_length) * 1000 ))  "$BUILT_PRODUCTS_DIR/$EXECUTABLE_FOLDER_PATH" 2>/dev/null&
	else
        quitSimulator
		iphoneSimExecutable="${0%/*}/iphonesim"
        latestOSVersion=`echo $SDK_NAME | tr -d [a-zA-Z]`
        "${iphoneSimExecutable}" launch  "$BUILT_PRODUCTS_DIR/$EXECUTABLE_FOLDER_PATH" $latestOSVersion&
	fi

    instrumentPid=$!
    appUID=""
    
    # do startup
    while [[ $appUID == "" ]]; do
        sleep 1
        appUID=`ps -A | grep /Library/Application\ Support/iPhone\ Simulator/* | grep -v "grep" |sed 's/.*Applications\///g' | sed 's/\/.*//g'`
        appPID=`ps -A | grep /Library/Application\ Support/iPhone\ Simulator/* | grep -v "grep" | awk '{print $1}'`
        documentsDir=`ps -A | grep /Library/Application\ Support/iPhone\ Simulator/* | grep -v "grep"  | sed 's#.*/Users#/Users#g' | sed 's#/[^/]*.app.*#/Documents/#g'`
       
    done
}
    

function profileApp {
    echo "Profiling App Started"

    repetitionMemory=()
    repetitionLeaks=()
    memoryPeak=0
    leakPeak=0
    
    # PROFILE
    for (( j = 1; j < ${stability_test_length}; j++ )) 
    do
        
        echo "    Profiling app after $j seconds"
    
        simId=`ps -A | grep "/Library/Application Support/iPhone Simulator/.*.app*" | grep -v grep | awk '{print $1}'`
    
        if [[ $simId != "" ]]; then
            profile=`leaks -nocontext -nostacks $simId 2>/dev/null | head -n 15 | grep "Process $simId" | sed 's/.*malloced for//g' | sed 's/Process[^:]*://g' | sed 's/ total leaked bytes.//g' | sed 's/.* leaks for //g'`; 
    
            # build up stats
            mem=`echo $profile | awk '{print $1"000"}'`
            leak=`echo $profile | awk '{print $3}'`
    
            if [[ $leak == "" ]]; then
                leak=0
            fi
    
            if  [[ $(( mem < memoryPeak )) -eq 0 ]]; then
                memoryPeak=$mem
            fi
            if  [[ $(( leak < leakPeak  )) -eq 0 ]]; then
                leakPeak=$leak
            fi

            # add to test stats
            totalMem=totalMemory[${#repetitionMemory[*]}]
            totalMemory[${#repetitionMemory[*]}]=$((totalMem + mem))

            totalLeak=totalLeaks[${#repetitionMemory[*]}]
            totalLeaks[${#repetitionMemory[*]}]=$((totalLeak + leak))
            
            repetitionMemory[${#repetitionMemory[*]}]=$mem
            repetitionLeaks[${#repetitionLeaks[*]}]=$leak
                
            sleep 1
                
        else
            
            # app not running so stop profiling
            break; 
        fi
                
    done

    totalMemoryPeaks[${#totalMemoryPeaks[*]}]=$memoryPeak
    totalLeaksPeaks[${#totalLeaksPeaks[*]}]=$leakPeak

    count=0
    for mem in "${repetitionMemory[@]}"
    do
        echo "<property name=\"StabilityTest.rep${i}.memory${count}\" value=\"$mem\" />" >> properties.xml.tmp
        count=$(($count+1))
    done
    count=0
    for mem in "${repetitionLeaks[@]}"
    do
        echo "<property name=\"StabilityTest.rep${i}.leaks${count}\" value=\"$mem\" />" >> properties.xml.tmp
        count=$(($count+1))
    done
    echo "Profiling App Finished"
}
        
function waitForInstrumentsToEnd {
    echo "    Waiting for Instruments to end"                   
    simId=`ps -A | grep "$instrumentPid" | grep -v grep | awk '{print $1}'`

    while [[ $simId != "" ]]; do
        sleep 1
        simId=`ps -A | grep "$instrumentPid" | grep -v grep | awk '{print $1}'`
    
    done
    echo "    Instruments Ended" 
}
                                
function clean {
    timestampFileFriendly=`date +%Y-%m-%dT%H%M%S`
    timestamp=`date +%Y-%m-%dT%H:%M:%S`
    if [[ $output_path == "" ]]; then
        outputDir=$PROJECT_DIR/AntEaterResults/${PRODUCT_NAME}/${timestampFileFriendly}
    else
        outputDir=${output_path}/${PRODUCT_NAME}/${timestampFileFriendly}
    fi

    rm -rf "$outputDir"
    mkdir -p "$outputDir"
    
    # make sure reference to results is still in workspace for CI
    ls "$PROJECT_DIR/AntEaterResults/${PRODUCT_NAME}" 2>/dev/null 1>/dev/null
    if [[ ! $? -eq 0 ]]; then
        mkdir -p "$PROJECT_DIR/AntEaterResults/" 2>/dev/null 1>/dev/null
        ln -s "${output_path}/${PRODUCT_NAME}/" "$PROJECT_DIR/AntEaterResults/${PRODUCT_NAME}" 
    fi


    resourcesFolder="$outputDir/../resources"
    ls "$resourcesFolder"  2>/dev/null 1>/dev/null

    if [[ ! $? -eq 0 ]]; then
        # if resources found
        resourcesFolder="${0%/*}/../resources"
        ls "$resourcesFolder" 1>/dev/null

        if [[ $? -eq 0 ]]; then
            echo "Linking HTML resources from $resourcesFolder"
            ln -s "$resourcesFolder" "$outputDir/../resources" 2>/dev/null


            APP_ICON_NAME=`grep -A2 "CFBundleIconFiles" *nfo.plist | grep -v "<array>" | grep "<string>" | sed 's/.*<string>//g' | sed 's/<\/string>//g'`
            if [[ $APP_ICON_NAME = "" ]]; then
                APP_ICON_NAME="Icon.png"
            fi
            APP_ICON=`find . -name ${APP_ICON_NAME} | grep -v build | head -1`
            cp $APP_ICON "$outputDir/../resources"
        else
            echo "Warning: no resources folder found html output not enabled."
        fi
    fi


}

function getParams {
    output_path=

    stability_test_length=60
    stability_test_reps=3

    number_of_clicks_red_min=0
    number_of_clicks_amb_min=1
    number_of_clicks_grn_min=2

    number_of_windows_red_min=0
    number_of_windows_amb_min=1
    number_of_windows_grn_min=2

    max_memory_red_min=15000000
    max_memory_amb_min=10000000
    max_memory_grn_min=10000

    max_leaks_red_min=200000
    max_leaks_amb_min=100000
    max_leaks_grn_min=0

    propFile="${0%/*}/anteater.properties"
    ls $propFile 2>/dev/null  1>/dev/null
    if [[ $? -eq 0 ]]; then
        echo "Using config file $propFile"
        chmod +x $propFile
        . $propFile
    else
        echo "Using default config: - no general config file found at $propFile"
    fi

    # overriding with project specific file
    propFile="${0%/*}/${PRODUCT_NAME}-anteater.properties"
    ls $propFile 2>/dev/null  1>/dev/null
    if [[ $? -eq 0 ]]; then
        echo "Overriding parent config file: $propFile"
        chmod +x $propFile
        . $propFile
    else
        echo "Using default config: - no app specific config file found at $propFile"
    fi

    # overriding with command line params
    if [[ $anteater_stability_test_length != "" ]]; then
        stability_test_length=$anteater_stability_test_length
    fi
    if [[ $anteater_stability_test_reps != "" ]]; then
        stability_test_reps=$anteater_stability_test_reps
    fi
    if [[ $anteater_output_path != "" ]]; then
        output_path=$anteater_output_path
    fi
    echo "Using config::"
    echo "  Output Path: $output_path"
    echo "  Stability Test Length: ${stability_test_length}"
    echo "  Stability Test Repetitions: $stability_test_reps"
    echo "  Max Memory Test Limit: ${max_memory_red_min}"
    echo "  Max Leaks Test Limit: $max_leaks_red_min"
    echo "----------------------------------------------------"


}

function outputForTest {
    grep $appPID "/private/var/log/system.log" > "${documentsDir}AntEaterResults/console.txt"
    

    numberOfCrashLogsAfterTest=`ls ~/Library/Logs/DiagnosticReports/ | wc -l` 

    ls "${documentsDir}AntEaterResults/clicks.txt" 2>/dev/null 1>/dev/null

    if [[ $? -eq 0 ]]; then

        # SAVE PROFILING FOR REPETITION
         ls "${documentsDir}AntEaterResults/exception.txt" 2>/dev/null 1>/dev/null

        if [[ $numberOfCrashLogsBeforeTest != $numberOfCrashLogsAfterTest ]]; then
            # has produced crash log so store
            echo "New crash log found"
            cd ~/Library/Logs/DiagnosticReports/ 
            crashName=`ls -t | head -1`
	    chmod a+r $crashName
            mv "$crashName" "${documentsDir}AntEaterResults/app.crash" 
            cd -

        fi

        mv "${documentsDir}AntEaterResults/" "$outputDir/rep-$i"

    else
        echo "WARNING no AntEater output found - did you enable AntEater in the App Delegate? or is the stability_test_length too short?"
    fi

    
}

function statusForBigIsBad {
    value=$1
    red_min=$2
    amb_min=$3
    green_min=$4

    status="unknown";
    if  [[ $(( value >= green_min )) -eq 1 ]]; then
        status="green"
    fi
    if  [[ $(( value >= amb_min )) -eq 1 ]]; then
        status="amber"
    fi
    if  [[ $(( value >= red_min )) -eq 1 ]]; then
        status="red"
    fi
}

function statusForSmallIsBad {
    value=$1
    red_min=$2
    amb_min=$3
    green_min=$4

    status="unknown";

    if  [[ $(( value >= red_min )) -eq 1 ]]; then
        status="red"
    fi
    if  [[ $(( value >= amb_min )) -eq 1 ]]; then
        status="amber"
    fi
    if  [[ $(( value >= green_min )) -eq 1 ]]; then
        status="green"
    fi

}

function xmlOutputForTestSuite {


    numberOfFailures=0
    for (( i = 1; i<= ${stability_test_reps}; i++ )) 
    do
        ls "$outputDir/rep-$i/app.crash" 2>/dev/null 1>/dev/null
        if [[  $? -eq 0 ]]; then
                numberOfFailures=$(( numberOfFailures + 1 ))
        fi   
    done
    
	count=0
    for mem in "${totalMemoryPeaks[@]}"
    do
		 if  [[ $(( mem < max_memory_red_min )) -eq 0 ]]; then
              numberOfFailures=$(( numberOfFailures + 1 ))
        fi
        count=$(($count+1))
    done
	count=0
    for mem in "${totalLeaksPeaks[@]}"
    do
		 if  [[ $(( mem < max_leaks_red_min )) -eq 0 ]]; then
              numberOfFailures=$(( numberOfFailures + 1 ))
        fi
        count=$(($count+1))
    done
    



    # SAVE PROFILING FOR ALL stability_test_reps
    xmlFileName="$outputDir/TEST-AntEater.xml"
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>" > $xmlFileName
    echo "<testsuite errors=\"0\" failures=\"$numberOfFailures\" hostname=\"\" name=\"AntEater\" tests=\"$(( stability_test_reps * 3 ))\" time=\"$(( stability_test_length * stability_test_reps ))\" timestamp=\"$timestamp\">" >> $xmlFileName

   
    # SAVE PROPERTIES
    echo "<properties><property name=\"app.name\" value=\"${PRODUCT_NAME}\" />" >> $xmlFileName

    # save status criteria
    echo "<property name=\"StabilityTest.clicks.red.min\" value=\"${number_of_clicks_red_min}\" />" >> $xmlFileName
    echo "<property name=\"StabilityTest.clicks.amb.min\" value=\"${number_of_clicks_amb_min}\" />" >> $xmlFileName
    echo "<property name=\"StabilityTest.clicks.grn.min\" value=\"${number_of_clicks_grn_min}\" />" >> $xmlFileName

    echo "<property name=\"StabilityTest.windows.red.min\" value=\"${number_of_windows_red_min}\" />" >> $xmlFileName
    echo "<property name=\"StabilityTest.windows.amb.min\" value=\"${number_of_windows_amb_min}\" />" >> $xmlFileName
    echo "<property name=\"StabilityTest.windows.grn.min\" value=\"${number_of_windows_grn_min}\" />" >> $xmlFileName

    echo "<property name=\"StabilityTest.memory-peak.red.min\" value=\"${max_memory_red_min}\" />" >> $xmlFileName
    echo "<property name=\"StabilityTest.memory-peak.amb.min\" value=\"${max_memory_amb_min}\" />" >> $xmlFileName
    echo "<property name=\"StabilityTest.memory-peak.grn.min\" value=\"${max_memory_grn_min}\" />" >> $xmlFileName

    echo "<property name=\"StabilityTest.leaks-peak.red.min\" value=\"${max_leaks_red_min}\" />" >> $xmlFileName
    echo "<property name=\"StabilityTest.leaks-peak.amb.min\" value=\"${max_leaks_amb_min}\" />" >> $xmlFileName
    echo "<property name=\"StabilityTest.leaks-peak.grn.min\" value=\"${max_leaks_grn_min}\" />" >> $xmlFileName


    # save result breakdown 

    for (( count = 1; count<= ${stability_test_reps}; count++ )) 
    do
        i=$((count -1))
        clicks=`cat "$outputDir/rep-$count/clicks.txt"`
        views=`cat "$outputDir/rep-$count/views.txt"`

        echo "<property name=\"StabilityTest.rep${count}.clicks\" value=\"${clicks}\" />" >> $xmlFileName
        echo "<property name=\"StabilityTest.rep${count}.windows\" value=\"${views}\" />" >> $xmlFileName
        echo "<property name=\"StabilityTest.rep${count}.memory-peak\" value=\"${totalMemoryPeaks[i]}\" />" >> $xmlFileName
        echo "<property name=\"StabilityTest.rep${count}.leaks-peak\" value=\"${totalLeaksPeaks[i]}\" />" >> $xmlFileName


        statusForSmallIsBad $clicks $number_of_clicks_red_min $number_of_clicks_amb_min $number_of_clicks_grn_min

        echo "<property name=\"StabilityTest.rep${count}.clicks.status\" value=\"${status}\" />" >> $xmlFileName

        statusForSmallIsBad $views $number_of_windows_red_min $number_of_windows_amb_min $number_of_windows_grn_min
        echo "<property name=\"StabilityTest.rep${count}.windows.status\" value=\"${status}\" />" >> $xmlFileName

        statusForBigIsBad ${totalMemoryPeaks[i]} $max_memory_red_min $max_memory_amb_min $max_memory_grn_min
        echo "<property name=\"StabilityTest.rep${count}.memory-peak.status\" value=\"${status}\" />" >> $xmlFileName

        statusForBigIsBad ${totalLeaksPeaks[i]} $max_leaks_red_min $max_leaks_amb_min $max_leaks_grn_min
        echo "<property name=\"StabilityTest.rep${count}.leaks-peak.status\" value=\"${status}\" />" >> $xmlFileName

        rm "$outputDir/rep-$count/clicks.txt"
        rm "$outputDir/rep-$count/views.txt"
    done

    # save form output
 
    # go through all buttons and group
    numberOfViews=0
    numberOfUniqueIds=0
    ls "$outputDir/rep-"*/form*view.png  2>/dev/null | while read view
    do

        if [[ $numberOfViews > 0 ]]; then
            ls "$outputDir/rep-"*/form*view.png 2>/dev/null | head -${numberOfViews} | while read oldview
            do
                diff "$view" "$oldview"
                if [[ $? -eq 0 ]]; then
                    # is same as old view copy id
                    # echo "$view is $oldview"
                    cat "${oldview}.id" > "${view}.id"
                    break;
                fi
            done
        fi

        ls "${view}.id" 2>/dev/null 1>/dev/null
        if [[ !  $? -eq 0 ]]; then
            # no id set so set a new one
            numberOfUniqueIds=$(( numberOfUniqueIds + 1 ));
            echo $numberOfUniqueIds >  "${view}.id"

        fi
        numberOfViews=$(( numberOfViews + 1 ))

    done
  

    # save form output
    for (( count = 1; count<= ${stability_test_reps}; count++ )) 
    do
        ls "$outputDir/rep-$count/form"*.txt  2>/dev/null | grep -v "filltype" | while read line; do
            stub=${line%.txt}
            formId=`t=${stub#*.}; echo ${t%.*}`
            rep=${stub##*.}

            viewBefore="${stub}.before.png"
            viewAfter="${stub}.after.png"
            clickedView="${stub}.view.png"
            fillState=`cat "${stub}.filltype.txt"`
            buttonId=`cat "${stub}.view.png.id"`

            ls "$viewAfter" 2>/dev/null 1>/dev/null
            if [[ $? -eq 0 ]]; then
                # only compare if has second image.

                diff "$viewBefore" "$viewAfter"

                if [[ $? -eq 0 ]]; then
                    # is same so output to properties file
                    echo "<property name=\"FormTest.rep${count}.form${formId}.button${buttonId}.rep${rep}.status\" value=\"inactive-${fillState}\" />" >> $xmlFileName
                else
                    echo "<property name=\"FormTest.rep${count}.form${formId}.button${buttonId}.rep${rep}.status\" value=\"active-${fillState}\" />" >> $xmlFileName
                fi
            fi
        done
    done
    
    # save average memory profile

    count=0
    for mem in "${totalMemory[@]}"
    do
        average=$((mem / stability_test_reps))
        echo "<property name=\"StabilityTest.averagedresults.memory${count}\" value=\"$average\" />" >> $xmlFileName
        count=$(($count+1))
    done

    count=0
    for mem in "${totalLeaks[@]}"
    do
        average=$((mem / stability_test_reps))
        echo "<property name=\"StabilityTest.averagedresults.leaks${count}\" value=\"$average\" />" >> $xmlFileName
        count=$(($count+1))
    done

    cat properties.xml.tmp >> $xmlFileName
    rm properties.xml.tmp

    echo "</properties>" >> $xmlFileName

    # DO TEST OUTPUTS

    for (( count = 1; count<= ${stability_test_reps}; count++ )) 
    do
        echo "<testcase classname=\"StabilityTest\" name=\"Stability Test $count\" time=\"${stability_test_length}\">" >> $xmlFileName        
        status=`ls "$outputDir/rep-$count/app.crash" 2>/dev/null 1>/dev/null`
        
        if [[ $? -eq 0 ]]; then
            exception=`grep "\*\*\*" "$outputDir/rep-$count/app.crash"  | head -1 | sed 's/<//g' | sed 's/>//g'`
            echo "<failure message=\"$exception\" type=\"failure\" text=\"$exception\"></failure>"  >> $xmlFileName   
           
        fi
        echo "</testcase>" >> $xmlFileName  
    done

    count=0
    for mem in "${totalMemoryPeaks[@]}"
    do
       # average=$((mem / stability_test_reps))
        echo "<testcase classname=\"MemoryTest\" name=\"Max Memory Test $(($count+1))\" time=\"${stability_test_length}\">" >> $xmlFileName  
        if  [[ $(( mem < max_memory_red_min )) -eq 0 ]]; then
            echo "<failure message=\"Memory use $mem bytes, limit $max_memory_red_min bytes\" type=\"failure\" text=\"Memory use $mem bytes, limit $max_memory_red_min message bytes\"></failure>"  >> $xmlFileName   
        fi
        echo "</testcase>" >> $xmlFileName    
        count=$(($count+1))
    done

    count=0
    for mem in "${totalLeaksPeaks[@]}"
    do
       # average=$((mem / stability_test_reps))
        echo "<testcase classname=\"LeakTest\" name=\"Max Leaks Test $(($count+1))\" time=\"${stability_test_length}\">" >> $xmlFileName  
        if  [[ $(( mem < max_leaks_red_min )) -eq 0 ]]; then
            echo "<failure message=\"Leaks: $mem bytes, limit $max_leaks_red_min bytes\" type=\"failure\" text=\"Memory use $mem bytes, limit $max_leaks_red_min bytes\"></failure>"  >> $xmlFileName   
        fi
        echo "</testcase>" >> $xmlFileName    
        count=$(($count+1))
    done

    echo "<system-out><![CDATA[" >> $xmlFileName
    for (( i = 1; i<= ${stability_test_reps}; i++ )) 
    do
        ls "$outputDir/rep-$i/console.txt" 2>/dev/null 1>/dev/null
        if [[ $? -eq 0 ]]; then
            cat "$outputDir/rep-$i/console.txt" >> $xmlFileName
        fi
    done
    echo "]]></system-out>" >> $xmlFileName
    echo "</testsuite>" >> $xmlFileName

    cp "$outputDir/../resources/index.html" "$outputDir/index.html"

}
function updateOverview {

    cp "$outputDir/../resources/overview-index.html" "$outputDir/../index.html"
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>" > "$outputDir/../overview.xml"
    echo "<testresults>" >> "$outputDir/../overview.xml"
    find "$outputDir/../" -name "TEST-*.xml"  | sort -r | sed 's#.*\.\.\/\/##g' | while read line; do echo "<testresult src=\"$line\"/>"; done >> "$outputDir/../overview.xml"
    echo "</testresults>" >> "$outputDir/../overview.xml"

}
function main {
    echo "Starting AntEater Automated Testing"

     # CLEAN
    quitAppInSimulator
    
    getParams

    clean

    # RECORD

    totalMemory=()
    totalLeaks=()
    totalMemoryPeaks=()
    totalLeaksPeaks=()
    allRepetitionsLeak=()
    allRepetitionsMemory=()

    # save per repetition memory
    rm properties.xml.tmp 2>/dev/null

    if [[ $stability_test_reps > 0 ]]; then

        #START
        for (( i = 1; i<= ${stability_test_reps}; i++ )) 
        do
            echo
            echo "Starting Test Repetition $i"
       
            numberOfCrashLogsBeforeTest=`ls ~/Library/Logs/DiagnosticReports/ | wc -l` 

            startApp
            profileApp
        
            if [[ $trace_memory_and_leaks != "" ]]; then
            waitForInstrumentsToEnd
            else
            quitAppInSimulator
            fi
        
            outputForTest
        
            echo "Finished Test Repetition $i"

        done
    
        echo "Finished AntEater Automated Testing"
        echo "Publishing results at $outputDir/index.html"
      
        xmlOutputForTestSuite

        updateOverview

    
        open "$outputDir/index.html"
        

    else
        echo "Warning: Skipping AntEater as properties file set to 0 repetitions"

    fi


}


main


