// ==UserScript==
// @name        PTP - RT Ratings on Posters
// @author      Ghastly
// @namespace   https://github.com/ghastlybespoke1/ptp-scripts
// @match       https://passthepopcorn.me/top10.php*
// @icon        https://passthepopcorn.me/favicon.ico
// @grant       GM.xmlHttpRequest
// @grant       GM_addStyle
// @version     0.1
// ==/UserScript==

const SETTING_DEBUG = false;
// Cache retrieved title data in localStorage for 14 days

/* -------------------------------
 * STYLES
 * ------------------------------- */
GM_addStyle(`
.poster-container {
  position: relative;
  display: inline-block;
}

.flags-container {
  position: absolute;
  bottom: 5px;
  right: 5px;
  display: flex;
}
`)
initializeDatabase();

main();

/* -------------------------------
 * DATABASE
 * ------------------------------- */
async function retrieveData(ptpId) {
  return await retrieveFromDatabase("ptpRt", ptpId);
}


async function retrieveFromDatabase(dbName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('movies', 'readonly');
      const objectStore = transaction.objectStore('movies');
      const getRequest = objectStore.get(id);

      getRequest.onsuccess = (event) => {
        const movie = event.target.result;
        if (movie) {
          console.debug(`[${dbName}] Data found:`, movie);
          resolve(movie);
        } else {
          console.debug(`[${dbName}] Data not found for ID:`, id);
          resolve(null);
        }
      };
      getRequest.onerror = (event) => {
        console.error(`[${dbName}] Error retrieving data (request):`, event.target.error);
        reject(event.target.error);
      };
      transaction.oncomplete = () => { db.close(); };
      transaction.onerror = (event) => {
        console.error(`[${dbName}] Error retrieving data (transaction):`, event.target.error);
        reject(event.target.error);
      };
    };
    request.onerror = (event) => {
      console.error(`Error opening ${dbName} database:`, event.target.error);
      reject(event.target.error);
    };
  });
}


async function storeData(id, data) {
  return await storeInDatabase("ptpRt", id, data);
}


async function storeInDatabase(dbName, ptpid, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('movies', 'readwrite');
      const objectStore = transaction.objectStore('movies');

      const putRequest = objectStore.put({"ptpId": ptpid, value: data});

      putRequest.onsuccess = () => {
        console.debug(`[${dbName}] Data stored successfully.`, ptpid);
        resolve();
      };
      putRequest.onerror = (event) => {
        console.error(`[${dbName}] Error storing data (request):`, event.target.error);
        reject(event.target.error);
      };
      transaction.oncomplete = () => { db.close(); };
      transaction.onerror = (event) => {
        console.error(`[${dbName}] Error storing data (transaction):`, event.target.error);
        reject(event.target.error);
      };
    };
    request.onerror = (event) => {
      console.error(`Error opening ${dbName} database:`, event.target.error);
      reject(event.target.error);
    };
  });
}


function initializeDatabase() {
  const dbName = "ptpRt";
  const dbId = "ptpId";

  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    db.createObjectStore('movies', { keyPath: dbId });
    console.info(`[${dbName}] Database created.`);
  };
}


function debug(...args) {
  if (!SETTING_DEBUG) return;
  console.log('[PTP Better Ratings Box]', ...args);
}

/* -------------------------------
 * DATA
 * ------------------------------- */
async function getDocument(url, isJson = true) {
  console.debug(`New request to: ${url}`);

  return new Promise((resolve, reject) => {
    GM.xmlHttpRequest({
      method: "GET",
      url: url,
      onload: function (response) {
        if (isJson) {
          const data = JSON.parse(response.responseText);
          resolve(data);
        } else {
          const html = response.responseText;
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          resolve(doc);
        }
      },
      onerror: function (error) {
        reject(error);
      }
    });
  });
}

function getRtLogo(status, isLarge = true) {
  switch (status) {
    case 'certified-fresh': {
      if (isLarge) {
        return 'https://www.rottentomatoes.com/assets/pizza-pie/images/icons/tomatometer/certified_fresh.75211285dbb.svg';
      }
      return 'https://www.rottentomatoes.com/assets/pizza-pie/images/icons/tomatometer/certified_fresh-notext.56a89734a59.svg';
    }
    case 'rotten':
      return 'https://www.rottentomatoes.com/assets/pizza-pie/images/icons/tomatometer/tomatometer-rotten.f1ef4f02ce3.svg';
    case 'fresh':
      return 'https://www.rottentomatoes.com/assets/pizza-pie/images/icons/tomatometer/tomatometer-fresh.149b5e8adc3.svg';
    case 'empty':
    default:
      return 'https://www.rottentomatoes.com/assets/pizza-pie/images/icons/tomatometer/tomatometer-empty.cd930dab34a.svg';
  }
}

/* -------------------------------
 * FLAGS
 * ------------------------------- */
function createFlagElement(rating, svgUrl) {
  const span = document.createElement("span");
  span.style = "display: flex; align-items: center; width: 60px; height: 30px; background-color: rgba(255, 255, 255, 0.8); padding: 5px; margin-left: 5px;";
  span.innerHTML = (`
    <svg viewBox="0 0 24 24" style="margin-right: 5px;">
    <image xlink:href="${svgUrl}" width="24" height="24"></image>
    </svg>
    <span style="font-size: 12px; color: black; text-align: center">${rating}%</span>
  `);

  return span;
}
function processRottenTomatoes(page, data, url) {
  const jsonElem = page.getElementById('scoreDetails');
  try {
    const json = JSON.parse(jsonElem.textContent);
    const userUrl = new URL(data.url);
    userUrl.pathname += '/reviews';
    userUrl.search = 'type=user';
    const criticUrl = new URL(data.url);
    criticUrl.pathname += '/reviews';
    return {
      name: 'Rotten Tomatoes',
      // eslint-disable-next-line no-use-before-define
      icon: getRtLogo(json.scoreboard.tomatometerScore.state),
      url: data.url.toString(),
      user: {
        score: parseInt(json.scoreboard.audienceScore.value || 0, 10),
        count: json.scoreboard.audienceScore.ratingCount,
        url: userUrl.toString(),
        display: 'Users',
        countType: 'vote',
      },
      critic: {
        score: parseInt(json.scoreboard.tomatometerScore.value || 0, 10),
        count: json.scoreboard.tomatometerScore.ratingCount,
        url: criticUrl.toString(),
        display: 'Critics',
        countType: 'vote',
      },
    }
  }
  catch (e) {
    debug('[Rotten Tomatoes]', e);
    return null;
  }
}

function createBox(poster, parent) {
  const targetDiv = document.createElement("div");
  targetDiv.className = "poster-container";
  targetDiv.append(poster);
  const flagsDiv = document.createElement("div");
  flagsDiv.className = "flags-container";
  targetDiv.append(flagsDiv);
  parent.prepend(targetDiv);

  return flagsDiv;
}

function queryJSON(url) {
  let resolver;
  let rejecter;
  const p = new Promise((resolveFn, rejectFn) => {
    resolver = resolveFn;
    rejecter = rejectFn;
  });

  GM.xmlHttpRequest({
    method: 'get',
    url,
    timeout: 10000,
    onloadstart: () => {},
    onload: (result) => {
      if (result.status !== 200) {
        rejecter(
          new Error(
            `[PTP Better Ratings Box] Error received from remote call: ${url}`
          )
        );
        return;
      }

      if (typeof result.response === 'undefined') {
        rejecter(
          new Error(`[PTP Better Ratings Box] No result received from ${url}`)
        );
        return;
      }

      resolver(JSON.parse(result.response));
    },
    onerror: (result) => {
      rejecter(result);
    },
    ontimeout: (result) => {
      rejecter(result);
    },
  });

  return p;
}
function query(url) {
  let resolver;
  let rejecter;
  const p = new Promise((resolveFn, rejectFn) => {
    resolver = resolveFn;
    rejecter = rejectFn;
  });

  GM.xmlHttpRequest({
    method: 'get',
    url,
    timeout: 10000,
    onloadstart: () => {},
    onload: (result) => {
      if (result.status !== 200) {
        rejecter(
          new Error(
            `[PTP Better Ratings Box] Error received from remote call: ${url}`
          )
        );
        return;
      }

      if (typeof result.response === 'undefined') {
        rejecter(
          new Error(`[PTP Better Ratings Box] No result received from ${url}`)
        );
        return;
      }

      resolver([htmlToElement(result.response), result.finalUrl]);
    },
    onerror: (result) => {
      rejecter([result, result.finalUrl]);
    },
    ontimeout: (result) => {
      rejecter([result, result.finalUrl]);
    },
  });

  return p;
}

async function addFlags(poster, movieDiv, rtTomatometer) {
  if (rtTomatometer) {
    const flagsDiv = createBox(poster, movieDiv);
    const flagElement = createFlagElement(rtTomatometer.critic.score, rtTomatometer.icon);
    flagsDiv.append(flagElement);
  }

}
async function fetchRottenTomatoesFromWikidata(imdbId) {
  try {
    const wikiUrl = new URL(`https://query.wikidata.org/sparql?format=json&query=SELECT%20*%20WHERE%20{?s%20wdt:P345%20%22${imdbId}%22.%20OPTIONAL%20{%20?s%20wdt:P1258%20?Rotten_Tomatoes_ID.%20}}`);
    const wikiInfo = await queryJSON(wikiUrl);

    const rtId = wikiInfo.results.bindings[0].Rotten_Tomatoes_ID.value;
    if (rtId === undefined) {
      return null;
    }
    return {
        name: 'rottentomatoes',
        url: `https://www.rottentomatoes.com/${rtId}`,
        imdbId,
      };

  } catch (e) {
    debug('[RottenTomatoes Search]', e);
    return null;
  }
}
function htmlToElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}
async function getDetails(links) {
    return new Promise((resolve, reject) => {
      query(links.url.toString())
      .then(async ([page, url]) => {
      let c = await processRottenTomatoes(page, links, url)
      resolve(c)
      })

      // log error and return null so we can filter it out below
      // This is to catch errors in `query` - the processors should catch their own and return null
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        resolve(null);
      })
  })
}
/* -------------------------------
 * MAIN
 * ------------------------------- */
async function main() {
  if(window.location.href.includes("top10")) {
      let c = document.querySelectorAll(".cover-movie-list__movie")

      for(let i = 0; i < c.length; i++) {
        let PTP_ID = c[i].querySelector(".cover-movie-list__movie__cover-link").href?.split("=")[1] || null
        let imdbId = c[i].querySelector(".cover-movie-list__movie__rating")?.href?.match(/tt[\d]+/)?.[0] || null;

        var details = await retrieveData(PTP_ID);
        if (!details) {
          const links = await fetchRottenTomatoesFromWikidata(imdbId);
          if(links == null) continue;
          details = await getDetails(links);
          storeData(PTP_ID, details);
        } else {
          details = details.value
        }

        let posterLink = c[i].querySelector("a.cover-movie-list__movie__cover-link");

        await addFlags(posterLink, c[i], details);
      }
  }
}
