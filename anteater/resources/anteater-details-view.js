/* This file is part of Anteater.
 
 Anteater is free software: you can redistribute
 it under the terms of our license: http://www.redant.com/anteater/license
 
 Anteater is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
 See our license: http://www.redant.com/anteater/license for more details.
 
*/
//
//  anteater-details-view.js
//  Anteater
//
//  Created by Peter Nash on 26/06/2011
//  Copyright 2011 Red Ant Mobile. All rights reserved.
function failureChildNode(node1){
	for(var j=0; j < node1.childNodes.length; j++) {
		if(node1.childNodes[j].nodeName == "failure"){
			return node1.childNodes[j];
		}
	}
	return false;		
}
String.prototype.startsWith = function(str){
    return (this.indexOf(str) === 0);
}
function arrayContainingString(arr,str){
    var ar=new Array();
    for(var j=0; j < arr.length; j++) {					
				if(arr[j].getAttribute('name').indexOf(str) != -1){
					ar.push(arr[j]);
				}
	}	
	return ar;
}
function showTooltip(x, y, contents) {
    $('<div id="tooltip">' + contents + '</div>').css( {
position: 'absolute',
display: 'none',
top: y + 5,
left: x + 5,
border: '1px solid #fdd',
padding: '2px',
color: 'black',
        'background-color': '#fee',
opacity: 0.90
    }).appendTo("body").fadeIn(200);
}

if (window.XMLHttpRequest){xmlhttp=new XMLHttpRequest();}else{xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");}
testresultfile="TEST-AntEater.xml";
xmlhttp.open("GET",testresultfile,false);xmlhttp.send();

htmlResults="<table><tr><th class='actions'></th><th style='width:80%'>Test Name</th><th>Duration</th></tr>";


htmlResults+="<tr>";

var testsuite = xmlhttp.responseXML.getElementsByTagName("testsuite");

if (testsuite.length > 0){
    
    
    // get properties
    time= Date.parse(testsuite[0].getAttribute('timestamp'));
    timeStamp=time.getDate()+"/"+(time.getMonth()+1)+"/"+time.getFullYear()+" "+time.getHours()+":"+((time.getMinutes()<10)?"0":"")+time.getMinutes();
    testresultfolder=testresultfile.substring(0,testresultfile.indexOf("/"));		
    document.getElementById('last-run-value').innerHTML=timeStamp;
    
    var propertyValues = xmlhttp.responseXML.getElementsByTagName("property");
    
    for(var j=0; j < propertyValues.length; j++) {
        if(propertyValues[j].getAttribute('name') == "app.name"){
            document.getElementById('app-name-value').innerHTML="<a href='../index.html'>"+propertyValues[j].getAttribute('value')+"</a> | Tested: "+timeStamp;
            break;
        }
    }
    
    var leaks = [];
    var leaksCount=0;
    for(var j=0; j < propertyValues.length; j++) {
        if(propertyValues[j].getAttribute('name') == "StabilityTest.averagedresults.leaks"+leaksCount){
            leaks.push([leaksCount++,(propertyValues[j].getAttribute('value')/1000).toFixed(1)]);
        }
    }	
    var memory = [];
    var memoryCount=0;
    for(var j=0; j < propertyValues.length; j++) {
        if(propertyValues[j].getAttribute('name') == "StabilityTest.averagedresults.memory"+memoryCount){
            memory.push([memoryCount++,(propertyValues[j].getAttribute('value')/1000).toFixed(1)]);
        }
    }	
    
    $.plot($("#average-memory-use-graph"), [ {data:memory, label:"Memory Use", color:'#0000ff'},{data:leaks, label:"Leaks", color:'#ff0000'}],{series: {lines: { show: true },points: { show: true }}, grid: { hoverable: true, clickable: true },  
yaxes: [{tickFormatter: function(n){ return ''+n+'&nbsp;kb'; }} ],
legend: { position: 'nw' }
        
    });
	
    
    $("#average-memory-use-graph").bind("plothover", function (event, pos, item) {
        if (item) {
            if (previousPoint != item.dataIndex) {
                previousPoint = item.dataIndex;
                $("#tooltip").remove();
                var x = item.datapoint[0].toFixed(0),
                    y = item.datapoint[1].toFixed(1);
                
                showTooltip(item.pageX, item.pageY,
                            y + " kb at " + x + " seconds" );
            }
        } else {
            $("#tooltip").remove();
            previousPoint = null;            
        }
    });
    
    
    // do forms
    var formContent=document.getElementById('form-use').innerHTML;
	var formTests =  arrayContainingString(propertyValues, "FormTest");
	
    formContent+="<table id='forms-table'><tr><th class='actions'></th><th>Form Size</th><th>Number of Tests</th></tr>";
    $('#form-use-show').show();
   
    for(var formSizeCount=1; formSizeCount <= 20; formSizeCount++) {
    	var formTestsAtSize=arrayContainingString(formTests, ".form"+formSizeCount+".button");
    	if (formTestsAtSize.length == 0){
    		continue;
    	}
    	
        formContent+="<tr><td class='actions'><div class='arrow'></td><td>Forms with "+formSizeCount+" entries</td><td>"+formTestsAtSize.length+"</td></tr><tr><td colspan='3'>";
        formContent+="<div  class='form-test-results'>"
        
        
        var buttonIdsSeenBefore= new Array();
        for(var formTestIndex=0; formTestIndex < formTestsAtSize.length; formTestIndex++) {
            // FormTest.rep1.form12.button1.rep1.status -> rep-1/form.12.1.view.png
            var comps = formTestsAtSize[formTestIndex].getAttribute('name').split(".");
            var testRep=comps[1].substring(3);
            var formSize=comps[2].substring(4);
            var buttonId=comps[3].substring(6);
            var buttonTestCount=0;
            // find number of similar buttons
            for (var findDuplicateIndex = 0; findDuplicateIndex < formTestsAtSize.length; findDuplicateIndex++){
                var comps2 = formTestsAtSize[findDuplicateIndex].getAttribute('name').split(".");
                var dupButtonId=comps2[3].substring(6);
                if (dupButtonId == buttonId){
                    buttonTestCount++;
                }
            }
            
            var formRep=comps[4].substring(3);
            
            if(formTestIndex == 0){
                  formContent+="<img class='form-overview-window' src='rep-"+testRep+"/form."+formSize+"."+formRep+".before.png'/><div class='form-overview-button-summary'> Tested Buttons:<br/><ul>";
                
            }
            if($.inArray(buttonId, buttonIdsSeenBefore) == -1 ){
                buttonIdsSeenBefore.push(buttonId);
                formContent+="<li><a href='#tabs-"+buttonId+"'><img class='form-overview-control' src='rep-"+testRep+"/form."+formSize+"."+formRep+".view.png'/> x "+buttonTestCount+"<br/></a></li>";
            }
            
        }
        
        
         
       

        formContent+="</ul></div><br clear='all'/></div>";
       
          
        for(var formButtonCount=1; formButtonCount <= 20; formButtonCount++) {
            var formTestsAtSizeWithButton=arrayContainingString(formTests, ".form"+formSizeCount+".button"+formButtonCount+".rep");
            if (formTestsAtSizeWithButton.length == 0){
                continue;
            }
            
            
            var inactiveButtonContent=""
            for(var fillTypeCount=1; fillTypeCount < 5; fillTypeCount++) {  
                switch(fillTypeCount){
                    case 1:
                        var fillType="full";
                        break;
                    case 2:
                        var fillType="partial";
                        break;
                    case 3:
                        var fillType="random";
                        break;
                    case 4:
                        var fillType="empty";
                        break;
                }
               
					for(var formRepCount=1; formRepCount < 16; formRepCount++) {
                        
                        
                        for(var testRepCount=1; testRepCount < 4; testRepCount++) {	
                            for(var j=0; j < formTestsAtSizeWithButton.length; j++) {
							
							var formId="form."+formSizeCount+"."+formRepCount
                                
							if(formTestsAtSizeWithButton[j].getAttribute('name') == "FormTest.rep"+testRepCount+".form"+formSizeCount+".button"+formButtonCount+".rep"+formRepCount+".status"){
						
        						
								if(formTestsAtSizeWithButton[j].getAttribute('value') == "active-"+fillType){
									
									
									if (window.XMLHttpRequest){formxmlhttp=new XMLHttpRequest();}else{formxmlhttp=new ActiveXObject("Microsoft.XMLHTTP");}
									formxmlhttp.open("GET","rep-"+testRepCount+"/"+formId+".txt",false);formxmlhttp.send();
									alertMessage=formxmlhttp.responseText.replace(/\n/g,"\\n");
									
								  	formContent+="<div class='form-test-results'><div class='form-button'><img class='form-view-screenshot' src='rep-"+testRepCount+"/"+formId+".view.png'/><br clear='all'/>";
									formContent+="<a class='form-contents test-option' onclick='alert(\""+alertMessage+"\")'>View Input</a></div>";
									
									formContent+="<div class='form-detail'><img class='form-screenshot' src='rep-"+testRepCount+"/"+formId+".before-with-click.png'/>";
									formContent+="<img class='form-screenshot' src='rep-"+testRepCount+"/"+formId+".after.png'/></div>";
									  
									formContent+="<br clear='all'/></div>";
                                    
								} else if(formTestsAtSizeWithButton[j].getAttribute('value') == "inactive-"+fillType){	
								
                                    
									formContent+="<div class='form-test-results'>Inactive:<img class='inactive-form-view-screenshot' src='rep-"+testRepCount+"/"+formId+".view.png'/></div>";
                                    
								} 
							}
						}       
					}
					
				}
			
            }
            
        }
        	
		formContent+="</td></tr>";
			
        }
        formContent+="</table>";
        document.getElementById('form-use').innerHTML=formContent;
        
        
        
		var stabilityRep=1;
		
		// go through each test case for value
		var testcases = xmlhttp.responseXML.getElementsByTagName("testcase");
		for(var i=0; i < testcases.length; i++) {
            
			testcase=testcases[i];
			
			if(testcase.getAttribute('classname') == "StabilityTest"){
				
				
				var hasFailedStabilityTest = failureChildNode(testcase);
				var hasFailedMemoryTest = false;
				var hasFailedLeaksTest = false;
				
				// find corresponding stability test output.
				for(var memorytestindex=i; memorytestindex < testcases.length; memorytestindex++) {
					if(testcases[memorytestindex].getAttribute('name') == "Max Memory Test "+stabilityRep){
						hasFailedMemoryTest = failureChildNode(testcases[memorytestindex]);
					}
					if(testcases[memorytestindex].getAttribute('name') == "Max Leaks Test "+stabilityRep){
						hasFailedLeaksTest = failureChildNode(testcases[memorytestindex]);
					}
				}
                
				htmlResults+="<td class='actions'>";
                if(hasFailedStabilityTest || hasFailedMemoryTest || hasFailedLeaksTest){
                    htmlResults+="<div class='arrow up'></div>";
                } else{
                    htmlResults+="<div class='arrow'></div>";
                }
                
                htmlResults+="</td>";
				htmlResults+="<td><span class='overview-"+((hasFailedLeaksTest || hasFailedMemoryTest || hasFailedStabilityTest)?"fail":"pass") +"'></span>"+testcase.getAttribute('name')+"</td>";
                
				timeTesting=(testcase.getAttribute('time')/60).toFixed(1);
				htmlResults+="<td>"+timeTesting+((timeTesting==1)?" min ":" mins ")+"</td>";
				htmlResults+="</tr>";
				
				// Test Result Breakdown
                if(hasFailedStabilityTest || hasFailedMemoryTest || hasFailedLeaksTest){
                    htmlResults+="<tr class='test-failed'>";
                } else{
                    htmlResults+="<tr>";
                }
                htmlResults+="<td  class='actions'></td><td colspan=2><div class='test-results'><img src='../resources/anteater-watermark.png' class='test-watermark'/>";
				htmlResults+="<div class='test-results-breakdown'><ul>";
				
				if(hasFailedStabilityTest){	htmlResults+="<li class='fail'>";} else{htmlResults+="<li class='pass'>";}
				htmlResults+="Stability Test</li>";
				if(hasFailedMemoryTest){	htmlResults+="<li class='fail'>";} else{htmlResults+="<li class='pass'>";}
				htmlResults+="Memory Test</li>";
				if(hasFailedLeaksTest){	htmlResults+="<li class='fail'>";} else{htmlResults+="<li class='pass'>";}
				htmlResults+="Leaks Test</li></ul></div>";
				
				// Test Result Details
				var numberOfClicks = "unknown";
				var numberOfViews = "unknown";
				var peakMemory = "unknown";
				var maxLeaks = "unknown";
                
                var numberOfClicksStatus = "unknown";
				var numberOfViewsStatus = "unknown";
				var peakMemoryStatus = "unknown";
				var maxLeaksStatus = "unknown";
                
                var numberOfClicksRedMin = "unknown";
                var numberOfClicksAmberMin = "unknown";
                var numberOfClicksGreenMin = "unknown";
                
                var numberOfWindowsRedMin = "unknown";
                var numberOfWindowsAmberMin = "unknown";
                var numberOfWindowsGreenMin = "unknown";
                
                var peakMemoryRedMin = "unknown";
                var peakMemoryAmberMin = "unknown";
                var peakMemoryGreenMin = "unknown";
                
                var maxLeaksRedMin = "unknown";
                var maxLeaksAmberMin = "unknown";
                var maxLeaksGreenMin = "unknown";
                
				for(var j=0; j < propertyValues.length; j++) {
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+stabilityRep+".clicks"){
						numberOfClicks=propertyValues[j].getAttribute('value');
					}
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+stabilityRep+".windows"){
						numberOfViews=propertyValues[j].getAttribute('value');
					}
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+stabilityRep+".memory-peak"){
						peakMemory=propertyValues[j].getAttribute('value');
					}
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+stabilityRep+".leaks-peak"){
						maxLeaks=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+stabilityRep+".clicks.status"){
						numberOfClicksStatus=propertyValues[j].getAttribute('value');
					}
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+stabilityRep+".windows.status"){
						numberOfViewsStatus=propertyValues[j].getAttribute('value');
					}
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+stabilityRep+".memory-peak.status"){
						peakMemoryStatus=propertyValues[j].getAttribute('value');
					}
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+stabilityRep+".leaks-peak.status"){
						maxLeaksStatus=propertyValues[j].getAttribute('value');
					}
                    
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.clicks.red.min"){
						numberOfClicksRedMin=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.clicks.amb.min"){
						numberOfClicksAmberMin=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.clicks.grn.min"){
						numberOfClicksGreenMin=propertyValues[j].getAttribute('value');
					}
                    
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.windows.red.min"){
						numberOfWindowsRedMin=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.windows.amb.min"){
						numberOfWindowsAmberMin=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.windows.grn.min"){
						numberOfWindowsGreenMin=propertyValues[j].getAttribute('value');
					}
                    
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.memory-peak.red.min"){
						peakMemoryRedMin=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.memory-peak.amb.min"){
						peakMemoryAmberMin=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.memory-peak.grn.min"){
						peakMemoryGreenMin=propertyValues[j].getAttribute('value');
					}
                    
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.leaks-peak.red.min"){
						maxLeaksRedMin=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.leaks-peak.amb.min"){
						maxLeaksAmberMin=propertyValues[j].getAttribute('value');
					}
                    if(propertyValues[j].getAttribute('name') == "StabilityTest.leaks-peak.grn.min"){
						maxLeaksGreenMin=propertyValues[j].getAttribute('value');
					}
				}
				
				htmlResults+="<div class='test-results-detail'>";
                alertMessage="Actual Value: "+numberOfClicks+"\\nRed: "+numberOfClicksRedMin+"\\nAmber: "+numberOfClicksAmberMin+"\\nGreen:"+numberOfClicksGreenMin;
				htmlResults+="<div><span class='traffic-"+numberOfClicksStatus+"'><a href='#' onclick='alert(\""+alertMessage+"\")'>Number of Clicks: "+numberOfClicks+"</a></span>";
                
                alertMessage="Actual Value: "+numberOfViews+"\\nRed: "+numberOfWindowsRedMin+"\\nAmber: "+numberOfWindowsAmberMin+"\\nGreen:"+numberOfWindowsGreenMin;
				htmlResults+="<span class='traffic-"+numberOfViewsStatus+"'><a href='#' onclick='alert(\""+alertMessage+"\")'>Number of Windows: "+numberOfViews+"</a></span></div>";
                
                alertMessage="Actual Value: "+peakMemory+"\\nRed: "+peakMemoryRedMin+"\\nAmber: "+peakMemoryAmberMin+"\\nGreen:"+peakMemoryGreenMin;
				htmlResults+="<div><span class='traffic-"+peakMemoryStatus+"'><a href='#' onclick='alert(\""+alertMessage+"\")'>Peak Memory: "+(peakMemory/1000).toFixed(0)+" kb </a></span>";
                
                alertMessage="Actual Value: "+maxLeaks+"\\nRed: "+maxLeaksRedMin+"\\nAmber: "+maxLeaksAmberMin+"\\nGreen:"+maxLeaksGreenMin;
				htmlResults+="<span class='traffic-"+maxLeaksStatus+"'><a href='#' onclick='alert(\""+alertMessage+"\")'>Peak Leaks: "+(maxLeaks/1000).toFixed(1)+" kb </a></span></div>";
				htmlResults+="<br clear='all'/></div>";
				
				
				// Exceptions 
				
				if(hasFailedStabilityTest){
					htmlResults+="<div class='test-results-exception'>";
					htmlResults+="<div class='test-results-exception-detail'><h4>Stability Test Failure:</h4>"+hasFailedStabilityTest.getAttribute('message')+"<br/><a target='_blank' href='rep-"+stabilityRep+"/app.crash' class='test-option' style='float:right'>View Crash Log</a></div>";
                    if(numberOfClicks > 2){
                        htmlResults+="<img class='screenshot' src=\"rep-"+stabilityRep+"/window-1.png\"></img>";
                        htmlResults+="<img class='screenshot-button' src=\"rep-"+stabilityRep+"/view-1.png\"/>";
                    }
                    if(numberOfClicks > 1){
                        htmlResults+="<img class='screenshot' src=\"rep-"+stabilityRep+"/window-2.png\"/>";
                        htmlResults+="<img class='screenshot-button' src=\"rep-"+stabilityRep+"/view-2.png\"/>";
                    }
					htmlResults+="<img class='screenshot' src=\"rep-"+stabilityRep+"/window-3.png\"/>";
					htmlResults+="<img class='screenshot-button' src=\"rep-"+stabilityRep+"/view-3.png\"/>";
                    
					htmlResults+="<div class='crash'>Crash</div>";
					htmlResults+="<br clear='all'/></div>";
				}
				
				if(hasFailedMemoryTest){
					htmlResults+="<div class='test-results-exception'>";
					htmlResults+="<div class='test-results-exception-detail'><h4>Memory Test Failure:</h4>"+hasFailedMemoryTest.getAttribute('message')+"</div>";
					htmlResults+="<br clear='all'/></div>";
				}
				
				if(hasFailedLeaksTest){
					htmlResults+="<div class='test-results-exception'>";
					htmlResults+="<div class='test-results-exception-detail'><h2>Leak Test Failure:</h2>"+hasFailedLeaksTest.getAttribute('message')+"</div>";
					htmlResults+="<br clear='all'/></div>";
				}
                
				if(hasFailedMemoryTest || hasFailedLeaksTest){
					// embedd graph html
					//if (window.XMLHttpRequest){xmlhttp2=new XMLHttpRequest();}else{xmlhttp2=new ActiveXObject("Microsoft.XMLHTTP");}
					//xmlhttp2.open("GET","rep-"+stabilityRep+"/graph.html",false);xmlhttp2.send();
					//alert(xmlhttp2.responseText);
				}
				
				
				htmlResults+="<div class='memory-graph' style=\"width:600px;height:300px\"  id='memory-use-graph-"+stabilityRep+"'></div>"
                    
                    
                    // bottom buttons
                    
                    htmlResults+="<div class='test-options'><ul>";
				if(hasFailedStabilityTest){
					htmlResults+="<li><a target='_blank' href='rep-"+stabilityRep+"/app.crash' class='test-option'>Crash Log</a></li>";
				}
				htmlResults+="<li><a id='memory-use-graph-"+stabilityRep+"-link' class='test-option'>Memory Use</a></li>";
                
				//htmlResults+="<li><a target='_blank' href='leaks.trace' class='test-option'>Instruments Output</a></li>";
				htmlResults+="<li><a target='_blank' href='rep-"+stabilityRep+"/console.txt' class='test-option'>Console</a></li></ul></div>";
				
				if (testsuite[0].getAttribute('failures') == 0){
					document.getElementById('last-outcome-value').innerHTML="<span class='overview-pass'>Pass</span>";	
				} else{
					document.getElementById('last-outcome-value').innerHTML="<span class='overview-fail'>Fail</span>";	
				}
				
				htmlResults+="</div></td>";
				htmlResults+="</tr>";
				
				stabilityRep++; // is stability so inc count;
			}
		}
}



htmlResults+="</table>"
document.getElementById('results-table').innerHTML=htmlResults;

for(rep = 1; rep < stabilityRep; rep++){
				var leaks = [];
				var leaksCount=0;
				for(var j=0; j < propertyValues.length; j++) {
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+rep+".leaks"+leaksCount){
						leaks.push([leaksCount++,(propertyValues[j].getAttribute('value')/1000).toFixed(1)]);
                        
					}
				}	
				var memory = [];
				var memoryCount=0;
				for(var j=0; j < propertyValues.length; j++) {
					if(propertyValues[j].getAttribute('name') == "StabilityTest.rep"+rep+".memory"+memoryCount){
						memory.push([memoryCount++,(propertyValues[j].getAttribute('value')/1000).toFixed(1)]);
                        
					}
				}
				
                graphId="#memory-use-graph-"+rep
                    $.plot($(graphId), [ {data:memory,color:'#0000ff'},{data:leaks, color:'#ff0000'}],{series: {lines: { show: true },points: { show: true }}, grid: { hoverable: true, clickable: true }, yaxes: [{tickFormatter: function(n){ return ''+n+'&nbsp;kb'; }} ]});
        		$(graphId).bind("plothover", function (event, pos, item) {
                    if (item) {
                        if (previousPoint != item.dataIndex) {
                            previousPoint = item.dataIndex;
                            $("#tooltip").remove();
                            var x = item.datapoint[0].toFixed(0),
                                y = item.datapoint[1].toFixed(1);
                            
                            showTooltip(item.pageX, item.pageY,
                                        y + " kb at " + x + " seconds" );
                        }
                    } else {
                        $("#tooltip").remove();
                        previousPoint = null;            
                    }
                });
                
                $(graphId).hide();
                $("#memory-use-graph-"+rep+"-link").click(function() {
                    t="#"+this.id.substring(0,this.id.length-5);
                    $(t).toggle(400);
                    return false;
                });
}

$('a[rel*=facebox]').facebox({
loadingImage : '../resources/facebox/loading.gif',
closeImage   : '../resources/facebox/closelabel.png'
})
$("#results-table tr:odd").addClass("odd");
$("#results-table tr:not(.odd)").hide();
$("#results-table tr.test-failed").show();
$("#results-table tr:first-child").show();	
$("#results-table tr.odd").click(function(){
    $(this).next("tr").toggle();
    $(this).find(".arrow").toggleClass("up");
});

$("#forms-table tr:odd").addClass("odd");
$("#forms-table tr:not(.odd)").hide();
$("#forms-table tr.test-failed").show();
$("#forms-table tr:first-child").show();	
$("#forms-table tr.odd").click(function(){
    $(this).next("tr").toggle();
    $(this).find(".arrow").toggleClass("up");
});
