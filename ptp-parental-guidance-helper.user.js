// ==UserScript==
// @name         PTP Parental Guidance Helper
// @namespace    Prism16
// @version      1.7
// @description  Add IMDB Parental Guidance Notes Onto PTP
// @author       Prism16 - Modified by Ghastly
// @match        https://passthepopcorn.me/torrents.php*
// @icon        https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';
  let hidetext = false; // or false
  var isPanelVisible = true; // or
  var isToggleableSections = true; // or true

  let style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
      .parentalspoiler {
          color: transparent;
      }
      .parentalspoiler:hover {
          color: inherit;
      }
      .parentalHeader {
        color: #F2DB83;
        margin-top: 12px;
        margin-bottom: 5px;
      }

      .parentalHeader:hover {
        cursor: pointer;
      }
      .hide {
        display: none;
      }
  `;
  document.getElementsByTagName('head')[0].appendChild(style);

  var link = document.querySelector("a#imdb-title-link.rating");
  var imdbUrl = link.getAttribute("href");
  var advisoryDiv = document.createElement('div');

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
  imdbUrl += "parentalguide";

  title.appendChild(imdb);
  title.appendChild(document.createTextNode(' Parental Notes'));

  var toggle = document.createElement('a');
  toggle.className = 'panel__heading__toggler';
  toggle.title = 'Toggle';
  toggle.href = '#';
  toggle.textContent = 'Toggle';

  var imdbDisplay = document.createElement('a');
  imdbDisplay.title = 'IMDB Url';
  imdbDisplay.href = imdbUrl;
  imdbDisplay.target = "_blank"
  imdbDisplay.textContent = 'IMDB Url';
  imdbDisplay.style.cssText = "margin-left: 5px;";

  toggle.onclick = function () {
    var panelBody = document.querySelector('#parents_guide .panel__body');
    panelBody.style.display = (panelBody.style.display === 'none') ? 'block' : 'none';
    return false;
  };

  panelHeading.appendChild(title);
  panelHeading.appendChild(imdbDisplay);
  panelHeading.appendChild(toggle);
  newPanel.appendChild(panelHeading);
  var panelBody = document.createElement('div');
  panelBody.className = 'panel__body';
  panelBody.style.position = 'relative';
  panelBody.style.display = isPanelVisible ? 'block' : 'none';
  panelBody.style.paddingTop = "0px";
  panelBody.appendChild(advisoryDiv);
  newPanel.appendChild(panelBody);
  var sidebar = document.querySelector('div.sidebar');
  sidebar.insertBefore(newPanel, sidebar.childNodes[4]);

  let imdbId = imdbUrl.split("/")[4];

  let graphQlReq = {
    query: `query {
     title(id: "${imdbId}") {
      parentsGuide {
       categories {
        category {
         text
        }
        guideItems(first: 100) {
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
        console.log(categories)
        if(await checkIfAllNull(categories)) {
          categories = await scrapeAndReturn();

          console.log(categories)
          console.log("its all ogre")
        }

        for (let i = 0; i < categories.length; i++) {
          let container = document.createElement("div");

          let itemHeader = document.createElement("h4")
          itemHeader.className = "parentalHeader"

          let severity = document.createElement("span")
          if(categories[i].severity != null) {
            if (categories[i].severity.text == "None") {
              severity.style.color = "#F2DB83"

            }
            if (categories[i].severity.text == "Mild") {
              severity.style.color = "#c5e197"
            }
            if (categories[i].severity.text == "Moderate") {
              severity.style.color = "#fbca8c"
            }
            if (categories[i].severity.text == "Severe") {
              severity.style.color = "#ffb3ad"
            }

            severity.innerHTML = categories[i].severity.text;
          } else {
            severity.innerHTML = "Unknown";
          }

          itemHeader.innerHTML = categories[i].category.text + " - ";
          itemHeader.appendChild(severity)
          itemHeader.innerHTML += ` - (${categories[i].guideItems.edges.length})`
          container.appendChild(itemHeader)

          var listItems = document.createElement("ul")
          listItems.style.paddingLeft = "0px"
          listItems.style.margin = "0px 15px"
          listItems.style.marginLeft = "10px"

          if(isToggleableSections) {
            listItems.classList.add("hide")
          }

          for (let j = 0; j < categories[i].guideItems.edges.length; j++) {
            let currentItem = categories[i].guideItems.edges[j];
            var item = document.createElement("li")
            item.style.padding = "3px 0px"
            var text = document.createElement('a');
            text.style.color = "#FFF"
            text.innerHTML = currentItem.node.text.plainText;
            if (hidetext) {
              text.classList.add('parentalspoiler');
            }
            item.appendChild(text);
            listItems.appendChild(item)
          }
          container.appendChild(listItems)
          advisoryDiv.appendChild(container)
          if(isToggleableSections) {
            itemHeader.onclick = () => {
              let list = itemHeader.parentElement.querySelector("ul");
              console.log(list)
              list.classList.toggle("hide")
            }
          }
        }
      }
    }
  });
  async function checkIfAllNull(categories) {
    let count = 0;
    for(let i = 0; i < categories.length; i++) {
      if(categories[i].guideItems.edges.length == 0 && categories[i].severity == null) {
        count++
      }
    }
    console.log(count)
    if(count == 5) {
      return true;
    }
    return false;
  }

  async function generateCategoryData(title, status, textItems) {
    let categoryData = {
        category: {
          text: null
        },
        severity: {
          text: null
        },
        guideItems: {
          edges: [

          ]
        }
      }
      if (title) {
        categoryData.category.text = title.innerHTML;
      }
      if (status) {
        categoryData.severity.text = status.innerHTML;
      }
      if (textItems) {
        for(let i = 0; i < textItems.length; i++) {
          guideItems.edges.push({
            node: {
              text: {
                plainText: textItems[i].innerHTML
              }
            }
          })
        }
      }
    return categoryData;
  }
  async function scrapeAndReturn() {
      return new Promise((resolve, reject) => {

        GM_xmlhttpRequest({
      method: "GET",
      url: imdbUrl,
      onload: async function (response) {
        let category = [];
        var parser = new DOMParser();
        var doc = parser.parseFromString(response.responseText, "text/html");

        var sexnudityTitle = doc.querySelector('#advisory-nudity h4');
        var sexnudityStatus = doc.querySelector('#advisory-nudity > ul > li > div > label > div.ipl-swapper__content.ipl-swapper__content-primary > div > span');
        var sexnudityText = doc.querySelectorAll('#advisory-nudity > ul > li.ipl-zebra-list__item');
        category.push(await generateCategoryData(sexnudityTitle, sexnudityStatus, sexnudityText))

        var violencegoreTitle = doc.querySelector('#advisory-violence h4');
        var violencegoreStatus = doc.querySelector('#advisory-violence > ul > li > div > label > div.ipl-swapper__content.ipl-swapper__content-primary > div > span');
        var violencegoreText = doc.querySelectorAll('#advisory-violence > ul > li.ipl-zebra-list__item');
        category.push(await generateCategoryData(violencegoreTitle, violencegoreStatus, violencegoreText))

        var profanityTitle = doc.querySelector('#advisory-profanity h4');
        var profanityStatus = doc.querySelector('#advisory-profanity > ul > li > div > label > div.ipl-swapper__content.ipl-swapper__content-primary > div > span');
        var profanityText = doc.querySelectorAll('#advisory-profanity > ul > li.ipl-zebra-list__item');
        category.push(await generateCategoryData(profanityTitle, profanityStatus, profanityText))

        var alcoholdrugsTitle = doc.querySelector('#advisory-alcohol h4');
        var alcoholdrugsStatus = doc.querySelector('#advisory-alcohol > ul > li > div > label > div.ipl-swapper__content.ipl-swapper__content-primary > div > span');
        var alcoholdrugsText = doc.querySelectorAll('#advisory-alcohol > ul > li.ipl-zebra-list__item');
        category.push(await generateCategoryData(alcoholdrugsTitle, alcoholdrugsStatus, alcoholdrugsText))

        var frighteningTitle = doc.querySelector('#advisory-frightening h4');
        var frighteningStatus = doc.querySelector('#advisory-frightening > ul > li > div > label > div.ipl-swapper__content.ipl-swapper__content-primary > div > span');
        var frighteningText = doc.querySelectorAll('#advisory-frightening > ul > li.ipl-zebra-list__item');
        category.push(await generateCategoryData(frighteningTitle, frighteningStatus, frighteningText))

        resolve(category);
      }
    });
  });

  }
})();
