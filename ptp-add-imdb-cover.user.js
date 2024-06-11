// ==UserScript==
// @name         PTP - Add IMDB Cover
// @namespace    http://tampermonkey.net/
// @version      0.4
// @author       passthepopcorn_cc Modified by Ghastly
// @match        https://passthepopcorn.me/upload.php?*
// @match        https://passthepopcorn.me/upload.php
// @match        https://passthepopcorn.me/requests.php*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const insertCover = () => {
    let value = document.querySelector("#imdb").value
    let imdbID = (value.startsWith("http")) ? value = "tt" + value.split("/tt")[1].split("/")[0] : value;

    let graphQlReq = {
      query: `query {
       title(id: "${imdbID}") {
         primaryImage {
            url
        }
       }
      }`
    }

    GM_xmlhttpRequest({
        url: "https://api.graphql.imdb.com",
        method : "POST",
        data: JSON.stringify(graphQlReq),
        headers: {
          'Content-Type': 'application/json',
        },
        onload : function(response) {
            if (response.status >= 200 && response.status < 300) {
              let body = JSON.parse(response.response);
              let { url } = body.data.title.primaryImage;
              document.querySelector("#image").value = url;

          }
        }
    })
}

document.querySelector("#autofill").addEventListener("click", () => insertCover() )
