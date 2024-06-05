// ==UserScript==
// @name         PTP Parental Guidance Helper
// @namespace    Prism16
// @version      1.5
// @description  Add IMDB Parental Guidance Notes Onto PTP
// @author       Prism16 - Modified by Ghastly
// @match        https://passthepopcorn.me/torrents.php*
// @icon        https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';
  ;

  let hidetext = false; // or false
  var isPanelVisible = true; // or true
  let style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
      .parentalspoiler {
          color: transparent;
      }
      .parentalspoiler:hover {
          color: inherit;
      }
  `;
  document.getElementsByTagName('head')[0].appendChild(style);

  var link = document.querySelector("a#imdb-title-link.rating");
  var imdbUrl = link.getAttribute("href");
  var advisoryDiv = document.createElement('div');
  imdbUrl += "parentalguide";

  var newPanel = document.createElement('div');
  newPanel.className = 'panel';
  newPanel.id = 'parents_guide';
  var panelHeading = document.createElement('div');
  panelHeading.className = 'panel__heading';
  var title = document.createElement('span');
  title.className = 'panel__heading__title';

  var imdb = document.createElement('span');
  imdb.style.color = '#F2DB83';
  imdb.textContent = 'iMDB';

  title.appendChild(imdb);
  title.appendChild(document.createTextNode(' Parental Notes'));

  var toggle = document.createElement('a');
  toggle.className = 'panel__heading__toggler';
  toggle.title = 'Toggle';
  toggle.href = '#';
  toggle.textContent = 'Toggle';

  toggle.onclick = function () {
    var panelBody = document.querySelector('#parents_guide .panel__body');
    panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
    return false;
  };

  panelHeading.appendChild(title);
  panelHeading.appendChild(toggle);
  newPanel.appendChild(panelHeading);
  var panelBody = document.createElement('div');
  panelBody.className = 'panel__body';
  panelBody.style.position = 'relative';
  panelBody.style.display = isPanelVisible ? 'block' : 'none';
  panelBody.appendChild(advisoryDiv);
  newPanel.appendChild(panelBody);
  var sidebar = document.querySelector('div.sidebar');
  sidebar.insertBefore(newPanel, sidebar.childNodes[4]);

  imdbUrl = imdbUrl.split("/")[4];

  console.log(imdbUrl);

  let graphQlReq = {
    query: `query {
     title(id: "${imdbUrl}") {
      parentsGuide {
       categories {
        category {
         text
        }
        guideItems(first: 10) {
         edges {
          node {
           text {
            plainText
           }
          }
         }
        }
        severity {
         text
        }
       }
      }
     }
    }`
  }

  GM_xmlhttpRequest({
    method: "POST",
    url: "https://api.graphql.imdb.com",
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(graphQlReq),
    onload: async function (response) {
      if (response.status >= 200 && response.status < 300) {
        let body = JSON.parse(response.response);
        let { categories } = body.data.title.parentsGuide;

        for (let i = 0; i < categories.length; i++) {
          let itemHeader = document.createElement("h4")
          itemHeader.className = "ipl-list-title"
          itemHeader.style.color = "#c5e197"
          itemHeader.style.marginTop = "0";
          itemHeader.style.marginBottom = "0";

          let severity = document.createElement("span")
          if (categories[i].severity.text == "None") {
            severity.style.color = "#c5e197"

          }
          if (categories[i].severity.text == "Mild") {
            severity.style.color = "#fbca8c"

          }
          if (categories[i].severity.text == "Severe") {
            severity.style.color = "#ffb3ad"
          }

          severity.innerHTML = categories[i].severity.text;

          itemHeader.innerHTML = categories[i].category.text + " - ";
          itemHeader.appendChild(severity)
          itemHeader.innerHTML += ` - (${categories[i].guideItems.edges.length})`
          advisoryDiv.appendChild(itemHeader)

          var listItems = document.createElement("ul")

          for (let j = 0; j < categories[i].guideItems.edges.length; j++) {
            let currentItem = categories[i].guideItems.edges[j];
            var item = document.createElement("li")

            var text = document.createElement('a');

            text.innerHTML = currentItem.node.text.plainText;
            if (hidetext) {
              text.classList.add('parentalspoiler');
            }
            item.appendChild(text);
            listItems.appendChild(item)
          }
          advisoryDiv.appendChild(listItems)

        }

      }
    }
  });
})();
