// ==UserScript==
// @name         Dragable Party Hats
// @namespace    http://tampermonkey.net/
// @version      1.01
// @description  Makes party hats dragable
// @author       Ghastly
// @match        https://passthepopcorn.me/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=passthepopcorn.me
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    async function main() {
        let PartyHats = document.querySelectorAll(".forum-post__avatar__partyhat")
        for(let i = 0; i < PartyHats.length; i++) {
            dragElement(PartyHats[i]);
        }

    }

    function dragElement(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.style.removeProperty("pointer-events");
        elmnt.style.zIndex = "2"
        elmnt.addEventListener("mousedown", dragMouseDown)

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    main()
    // Your code here...
})();
