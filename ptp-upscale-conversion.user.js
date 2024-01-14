// ==UserScript==
// @name         PTP - Upscale Conversion
// @namespace    ree
// @version      1
// @description  Converts images to SD then back to HD and makes a comparison so you can check for Upscales
// @author       coollachlan8 & vevv
// @match        https://passthepopcorn.me/torrents.php*
// @icon         https://passthepopcorn.me/favicon.ico
// @require      https://raw.githubusercontent.com/viliusle/Hermite-resize/master/src/hermite.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==
var HERMITE = new Hermite_class();

let torrents = document.querySelectorAll(".torrent_info_row");

async function draw_image(img, ctx, canvas) {
  img_w = img.width;
  img_h = img.height;

  canvas.width = img_w;
  canvas.height = img_h;
  ctx.clearRect(0, 0, img_w, img_h);

  ctx.drawImage(img, 0, 0);
}

async function getResolution(group) {
  let videoMediaInfo = group.querySelectorAll(".mediainfo__section")
  let correctionSection;
  let resSection = videoMediaInfo[1].querySelectorAll("tr")[1]
  resSection = resSection.querySelectorAll('td')[1].textContent.split('x');
  return [resSection[0], resSection[1]]
}

async function resizeImage(imageurl, w, h, idk, ctx) {
  return new Promise((resolve, reject) => {
      HERMITE.resample_single(idk, w, h, true);
      idk.toBlob((blob) => {
          const newImg = document.createElement("img");
          const url = window.URL.createObjectURL(blob, { type: "image/png" });
          resolve(url)
      });
  })
}

async function convertImage(imageUrl, width, height, torrentGroupData) {
  return new Promise(async (resolve, reject) => {
      let [w, h] = await get_scale(width, height, 576)

      let idk = document.createElement("canvas")
      idk.id = "reeee"
      let ctx = idk.getContext('2d')
      let img1 = new Image()
      let c = "";
      img1.crossOrigin = "Anonymous"; //cors support

      img1.onload = async function () {
          draw_image(img1, ctx, idk);
          c = await resizeImage(imageUrl, w, h, idk, ctx);

          let img2 = new Image()
          img2.crossOrigin = "Anonymous"; //cors support

          img2.onload = async function () {
              draw_image(img2, ctx, idk);
              r = await resizeImage(imageUrl, width, height, idk, ctx);
              resolve({ "source": imageUrl, "converted": r })
          }
          img2.src = c
      }
      img1.src = imageUrl;
  })
}

async function mod_2(val) {
  return Math.round(val / 2) * 2
}


async function get_scale(width, height, target_height) {
  let aspect_ratio = (width / height)
  let target_width = await mod_2(target_height * (16 / 9))

  let new_width = await mod_2(Math.min(target_height * aspect_ratio, target_width))
  let new_height = await mod_2(new_width / aspect_ratio)

  return [new_width, new_height]
}

async function storeImageLocally(imageUrl) {
  return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
          method: "GET", url: imageUrl, responseType: "blob",
          onload: function (response) {
              if (response.status == 200) {
                  let file = window.URL.createObjectURL(response.responseXML, { type: "image/png" });
                  resolve(file);
              } else {
                  console.log("Failed to load url: " + utils[i].url)
              }
          },
          onerror: response => { console.log("An Error has occured...") },
          ontimeout: response => { console.log("An Error has occured...") },
      });
  })
}

async function addBBcodeComp(bbcodeData, element) {
  let ree2 = document.createElement(`a`)
  ree2.textContent = "Show Comparison"
  ree2.addEventListener("click", () => {
      BBCode.ScreenshotComparisonToggleShow(this, ["Source", "UpscaleCheck"], bbcodeData);
      return false;
  })
  element.appendChild(ree2)
}

async function handleConversion(maxQual, element) {
  let status = element.querySelector("#status_upscale_check")
  status.textContent = "Status: Generating Conversions"

  let parent = element.parentElement;
  let [width, height] = await getResolution(parent)

  let images = parent.querySelectorAll(".bbcode__image")
  let bbcode_comp = [];
  for (let i = 0; i < images.length; i++) {
      let imageSource = images[i].src
      let local = await storeImageLocally(imageSource)
      let response = await convertImage(local, width, height, parent)
      bbcode_comp.push(response['source'])
      bbcode_comp.push(response['converted'])
  }

  await addBBcodeComp(bbcode_comp, element)
  status.textContent = "Status: Comparisons Generated..."

  console.log(bbcode_comp)
}


for (let j = 0; j < torrents.length; j++) {
  let subtitle_manager = torrents[j].querySelector("#subtitle_manager")
  let upscale_checker = subtitle_manager.cloneNode(true);
  upscale_checker.id = "upscale_checker"

  upscale_checker.innerHTML = ""
  upscale_checker.textContent = "Check for Upscales:"
  let container = document.createElement("div")
  container.style.cssText = "width:100%;"
  let button480 = document.createElement("button")
  button480.textContent = "480p"
  button480.addEventListener('click', () => { handleConversion(480, upscale_checker) })
  button480.style.cssText = "margin: 10px;"
  container.appendChild(button480)
  let button576 = document.createElement("button")
  button576.textContent = "576p"
  button576.addEventListener('click', () => { handleConversion(576, upscale_checker) })
  button576.style.cssText = "margin: 10px;"

  let status = document.createElement("p")
  status.textContent = "Status: Standing By"
  status.id = "status_upscale_check"
  container.appendChild(button576)
  container.appendChild(status)

  upscale_checker.appendChild(container)
  subtitle_manager.parentNode.insertBefore(upscale_checker, subtitle_manager)
}
