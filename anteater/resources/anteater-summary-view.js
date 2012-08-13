/* This file is part of Anteater.
 
 Anteater is free software: you can redistribute
 it under the terms of our license: http://www.redant.com/anteater/license
 
 Anteater is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
 See our license: http://www.redant.com/anteater/license for more details.
 
*/
//
//  anteater-summary-view.js
//  Anteater
//
//  Created by Peter Nash on 26/06/2011
//  Copyright 2011 Red Ant Mobile. All rights reserved.

if (window.XMLHttpRequest){xmlhttp=new XMLHttpRequest();}else{xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");}

xmlhttp.open("GET","overview.xml",false);xmlhttp.send();
var testresults = xmlhttp.responseXML.getElementsByTagName("testresult");
htmlResults="<table><tr><th>Test Results</th><th>Duration</th><th>Tests</th><th>Failures</th><th>Outcome</th><th  class='actions'></th></tr>";
var warnedAboutMissingTestResults=false;
var maxResults=10;
for(var i=0; i < testresults.length; i++) {
 	var testresultfile = testresults[i].getAttribute('src');
 	try{
 		htmlResults+="<tr>";
		if (window.XMLHttpRequest){xmlhttp2=new XMLHttpRequest();}else{xmlhttp2=new ActiveXObject("Microsoft.XMLHTTP");}
		xmlhttp2.open("GET",testresultfile,false);
		xmlhttp2.send();
		var testsuite = xmlhttp2.responseXML.getElementsByTagName("testsuite");
		if (testsuite.length > 0){
			
			var time= Date.parse(testsuite[0].getAttribute('timestamp'));
			timeStamp=time.getDate()+"/"+(time.getMonth()+1)+"/"+time.getFullYear()+" "+time.getHours()+":"+((time.getMinutes()<10)?"0":"")+time.getMinutes();
			testresultfolder=testresultfile.substring(0,testresultfile.indexOf("/"));	
			linkToDetails="<a href='"+testresultfolder+"/index.html'><img class='view-details' src='resources/arrow-right-icon-small.png'/></a>";
			
			if(i == 0){
				document.getElementById('last-run-value').innerHTML=timeStamp+linkToDetails;
				var propertyValues = xmlhttp2.responseXML.getElementsByTagName("property");
			
				for(var j=0; j < propertyValues.length; j++) {
					if(propertyValues[j].getAttribute('name') == "app.name"){
						document.getElementById('app-name-value').innerHTML=propertyValues[j].getAttribute('value');
					}
				}
			}
			
			htmlResults+="<td><a href='"+testresultfolder+"/index.html' class='overview-"+((testsuite[0].getAttribute('failures')==0)?"pass":"fail")+"'>"+timeStamp+"</a></td>";
			timeTesting=(testsuite[0].getAttribute('time')/60).toFixed(1);
			htmlResults+="<td><a href='"+testresultfolder+"/index.html'>"+timeTesting+((timeTesting==1)?" min":" mins")+"</a></td>";
			htmlResults+="<td><a href='"+testresultfolder+"/index.html'>"+testsuite[0].getAttribute('tests')+"</a></td>";
			htmlResults+="<td><a href='"+testresultfolder+"/index.html'>"+testsuite[0].getAttribute('failures')+"</a></td>";
			
			if (testsuite[0].getAttribute('failures') == 0){
				htmlResults+="<td><a href='"+testresultfolder+"/index.html'>Pass</a></td>";
				if(i == 0){
					document.getElementById('last-outcome-value').innerHTML="<span class='overview-pass'>Pass</span>";
				}
			} else{
				htmlResults+="<td><a href='"+testresultfolder+"/index.html'>Fail</a></td>";
				if(i == 0){
					document.getElementById('last-outcome-value').innerHTML="<span class='overview-fail'>Fail</span>";
				}
			}
	
			htmlResults+="<td class='actions'>"+linkToDetails+"</td>";
		}
		htmlResults+="</tr>";
	}
	catch(err)
	{
		if(!warnedAboutMissingTestResults){
			alert("Some test results were present in overview.xml, but missing from the file system. \nYou can run AntEater again to update the overview.xml file.");
			warnedAboutMissingTestResults=true;
		}
	}
    if(i+2 == maxResults){
        // add extra 'more..' row
        htmlResults+="<tr id='more-results-row'><td colspan='6'><a id='more-results'>View older results...</a></td></tr>";
    }
}
htmlResults+="</table>"
document.getElementById('results-table').innerHTML=htmlResults;

$("#results-table tr:gt("+maxResults+")").hide();
$("#more-results").click(function(){
		$("#results-table tr").show();
        $("#more-results-row").hide();
	});
