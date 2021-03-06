// ==UserScript==
// @name          MemriseUtilities
// @version       2.0.0
// @grant         none
// @description   Extract a word list from memrise.com
// @icon          https://cdnjs.cloudflare.com/ajax/libs/foundicons/3.0.0/svgs/fi-annotate.svg
// @homepageURL   https://github.com/aaron13100/MemriseUtilities
// @updateURL     https://github.com/aaron13100/MemriseUtilities/raw/master/MemriseUtilities.user.js
// @downloadURL   https://github.com/aaron13100/MemriseUtilities/raw/master/MemriseUtilities.user.js
// @match         https://*.memrise.com/course/*
// @match         https://*.memrise.com/course/*
// @copyright     2012+, ScytaleZero
// ==/UserScript==

"use strict";
var Wordlist, Promises, CourseTag;
function Main() {
    if (document.domain.indexOf("memrise.com") > -1 || document.domain.indexOf("memrise.com") > -1) {
        Out("Processing for Memrise");
        if ( ($("li.active > a.tab").length === 0) || ($(".container > h2").length > 0) || location.href.match(/\/edit\//) ) {
            //This isn't a course levels page
            Out("Not a course levels page.");
            return;
        }

        Wordlist = {};
        Promises = [];
        CourseTag = SanitizeTag($("h1.course-name").text().trim());

        //Insert the terms extractor button
        $("ul.nav-pills").append("<li><select id='WordFilter' style='width: 150px'>" +
                                 "<option value='all' selected>All</option>" +
                                 "<option value='no-ignored'>Exclude ignored</option>" +
                                 "<option value='ignored-only'>Ignored only</option>" +
                                 "<option value='seeds-only'>Seeds only</option><option value='learned-only'>Learned only</option></select></li>");
        $("ul.nav-pills").append("<li><a id='WordListButton'>Word list</a></li>");
        $("#WordListButton").click(SpiderLevels);
    } else {
        Out("Page not recognized.");
    }
}

/* Memrise Functions */
//Iterate through the levels and kick off the retrieves.
function SpiderLevels() {
    //Add our UI
    $('#WordListContainer').remove();
    $("div.container-main").prepend("<div id='WordListContainer'><h2>Working</h2></div>");
    var urls = [];
    if ($("a.level").length > 0) {
        $("a.level").each(function(Index) {
            urls.push(window.location.protocol + "//" + window.location.hostname + $(this).attr("href"));
        });
    } else {
        urls.push(window.location.href);
    }
    Out(urls);
    for (var levelOrder = 0; levelOrder < urls.length; levelOrder++) {
        var url = urls[levelOrder];
        Out("Dispatching URL: " + url);
        //if (Index > 0) return; //Debug
        Promises.push($.ajax({
            dataType: "html",
            url: url,
            levelOrder: levelOrder
        }).done(function(data){ExtractTerms(data, this.levelOrder + 1)}));
    }
    $.when.apply($, Promises).done(SpiderDone);
}

//All levels have been parsed and the wordlist is done.
function SpiderDone() {
    var WordlistText = "";
    var BareWordlistText = "";

    WordlistText += "Word" + "\t" + "Translation" + "\t" + "Level Name" + "\t" + "Status" + "\n\n";
    BareWordlistText = BareWordlistText += "Word" + "\t" + "Translation" + "\n\n";

    Out("Wordlist parsed.");
    //Add the wordlist text area.
    $("#WordListContainer").empty().append("<div><h2>Course Wordlist, tab separated values</h2><textarea id='Wordlist' style='width:800px; height:400px;'></textarea><p>&nbsp;</p><h2>Bare Wordlist, tab separated values</h2><textarea id='BareWordlist' style='width:800px; height:400px;'></textarea></div>");
    for (var level = 1; level <= Object.keys(Wordlist).length; level++) {
        var levelDataPacket = Wordlist[level];
        for (var wordPacketIndex = 0; wordPacketIndex < levelDataPacket['words'].length; wordPacketIndex++) {
            var wordPacket = levelDataPacket['words'][wordPacketIndex];
            WordlistText += wordPacket.Word + "\t" + wordPacket.Translation + "\t" +
                levelDataPacket["levelName"] + "\t" + wordPacket.Status + "\n";
            BareWordlistText = BareWordlistText += wordPacket.Word + "\t" + wordPacket.Translation + "\n";
        }
    }
    $("#Wordlist").val(WordlistText.trimRight());
    $("#BareWordlist").val(BareWordlistText.trimRight());
}

function htmlEncode( html ) {
    return document.createElement( 'a' ).appendChild(
        document.createTextNode( html ) ).parentNode.innerHTML;
};

//Pull words and definitions from a level page.
function ExtractTerms(data, levelOrder) {
    var LevelName = $(data).find('.progress-box-title').text().trim();
    var WordFilter = $('#WordFilter option:selected').val();
    Out("Level: " + LevelName);
    var levelDataPacket = {};
    var wordsInThisLevel = [];
    levelDataPacket["words"] = wordsInThisLevel;
    levelDataPacket["order"] = levelOrder;
    levelDataPacket["levelName"] = LevelName;
    $(data).find("div.text-text").each(function() {
        var ignored;
        if ($(this).find("div.status").length && $(this).find("div.status").text() === "Ignored") {
            ignored = true;
        }
        else {
            ignored = false;
        }
        if ((WordFilter === "no-ignored" && ignored === false) ||
            (WordFilter === "ignored-only" && ignored === true) ||
            (WordFilter === "seeds-only" && $(this).find("i.ico-seed").length) ||
            (WordFilter === "learned-only" && $(this).find("i.ico-water").length) ||
            WordFilter === "all") {
            wordsInThisLevel.push({
                "Word": $(this).find("div.col_a").text(),
                "Translation": $(this).find("div.col_b").text(),
                "Status": $(this).find("div.status").text()
            });
        }
    });
    Wordlist[levelOrder] = levelDataPacket;
    $("#WordListContainer h2").append(".");
}

//Format text appropriately for LWT tags.
function SanitizeTag(Buffer) {
    var Tag = Buffer.replace(/[^\w]/g, "");
    if (Tag.length > 20) Tag = Tag.substring(0, 20);
    return Tag;
}

/* Utility Functions */
function Out(Buffer) {
    if (console.log)
        console.log("[MUtils] " + Buffer);
}

Main();
