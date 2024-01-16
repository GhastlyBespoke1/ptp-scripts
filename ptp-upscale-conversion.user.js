// ==UserScript==
// @name         PTP - Upscale Conversion
// @namespace    ree meow
// @version      1
// @description  Converts images to SD then back to HD and makes a comparison so you can check for upscales
// @author       coollachlan8 & vevv
// @match        https://passthepopcorn.me/torrents.php*id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const torrents = document.querySelectorAll('.torrent_info_row');

async function drawImage (canvas, image, width, height, text) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  if (text) {
    ctx.textBaseline = 'top';
    ctx.font = 'bold 32px Segoe UI';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.fillText(text, 15, 15);
    ctx.strokeText(text, 15, 15);
  }
}

async function getCanvasUrl (canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      const url = window.URL.createObjectURL(blob, { type: 'image/png' });
      resolve(url);
    });
  });
}

async function convertImage (imageUrl, width, height, target) {
  return new Promise(async (resolve, reject) => {
    const [w, h] = await getScale(width, height, target);

    const canvas = document.createElement('canvas');
    const img1 = new Image();
    let resized;
    img1.crossOrigin = 'Anonymous'; // cors support

    img1.onload = async function () {
      drawImage(canvas, img1, w, h);
      resized = await getCanvasUrl(canvas);

      const img2 = new Image();
      img2.crossOrigin = 'Anonymous'; // cors support

      img2.onload = async function () {
        drawImage(canvas, img2, width, height, `${target}p`);

        canvas.toBlob((blob) => {
          const url = window.URL.createObjectURL(blob, { type: 'image/png' });
          resolve(url);
        });
      };
      img2.src = resized;
    };
    img1.src = imageUrl;
  });
}

async function mod2 (val) {
  return Math.round(val / 2) * 2;
}

async function getScale (width, height, targetHeight) {
  const aspectRatio = (width / height);
  const targetWidth = await mod2(targetHeight * (16 / 9));

  const newWidth = await mod2(Math.min(targetHeight * aspectRatio, targetWidth));
  const newHeight = await mod2(newWidth / aspectRatio);

  return [newWidth, newHeight];
}

async function storeImageLocally (imageUrl) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    console.log(imageUrl);
    GM_xmlhttpRequest({
      method: 'GET',
      url: imageUrl,
      responseType: 'blob',
      onload: function (response) {
        console.log(Date.now() - start);
        if (response.status === 200) {
          const file = window.URL.createObjectURL(response.responseXML, { type: 'image/png' });
          resolve(file);
        } else {
          console.log('Failed to load url: ' + response.url);
        }
      },
      onerror: response => { console.log('An error has occured...'); },
      ontimeout: response => { console.log('An error has occured...'); }
    });
  });
}

async function getResolution(group) {
  let widthInfo = group.previousElementSibling.querySelector("a[href='#']")
  let resSection = widthInfo.innerText.split(" / ")[3]
  let height = resSection.indexOf("x") > -1 ? resSection.split('x')[1] : resSection.replace("p", "");

  if(height == "PAL") height = "576"
  if(height == "NTSC") height = "480"

  return height;
}

async function addBBcodeComp (bbcodeData, element, options) {
  const a = document.createElement('a');
  a.textContent = 'Show comparison';
  a.href = '#';

  a.addEventListener('click', () => {
    let sources = ["Source"]
    for(let i = 0; i < options.length; i++) {
      sources.push(`UpscaleCheck (${options[i].label})`)
    }
    BBCode.ScreenshotComparisonToggleShow(a, sources, bbcodeData);
    event.preventDefault();
  });
  element.appendChild(a);
}

async function handleConversion (img, options) {
  const local = await storeImageLocally(img.src);
  const promises = [];
  for(let i = 0; i < options.length; i++) {
      promises.push(convertImage(local, img.naturalWidth, img.naturalHeight, parseInt(options[i].value)));
  }
  const generatedImages = [local];
  await Promise.all(promises).then((values) => {
    generatedImages.push(...values);
  });
  return generatedImages;
}

async function handleConversions (element, status, options) {
  status.textContent = 'Generating conversions...';
  console.log(options)
  const parent = element.parentElement;

  const images = parent.querySelectorAll('.bbcode__image');
  const promises = [];
  const bbcodeComp = [];

  for (let i = 0; i < images.length; i++) {
    promises.push(handleConversion(images[i], options));
  }

  await Promise.all(promises).then((values) => {
    bbcodeComp.push(...values.flat(1));
  });

  status.textContent = '';
  await addBBcodeComp(bbcodeComp, status, options);
}
async function main() {
  console.log("ree")
    for (let j = 0; j < torrents.length; j++) {
      let height = await getResolution(torrents[j])
      if(parseInt(height) <= 576) continue;
      if(parseInt(height) == 720) options = [{value: "576", label: "576p", checked: true}, {value: "480", label: "480p", checked:true}]
      if(parseInt(height) == 1080) options = [{value: "720", label: "720p", checked:true}, {value: "576", label: "576p", checked:true}, {value: "480", label: "480p", checked:false}]
      if(parseInt(height) == 2160) options = [{value: "1080", label: "1080p", checked:true}, {value: "720", label: "720p", checked:true}, {value: "576", label: "576p", checked:false}, {value: "480", label: "480p", checked:false}]

      const optionsDiv = document.createElement("div")
      optionsDiv.style.cssText = "width: 100%;margin-top:5px;display:inline-flex;"

      for(let i = 0; i < options.length; i++) {
        let label = document.createElement("label")
        label.forHTML = "option_" + options[i].value
        label.textContent = options[i].label
        label.style.cssText = "margin-right: 5px;"

        let input = document.createElement('input')
        input.type = "checkbox"
        input.name = "option_" + options[i].value
        input.style.cssText = "margin-right: 10px;"
        input.value = options[i].value
        input.checked = options[i].checked

        input.addEventListener("click", () => { options[i].checked = !options[i].checked})
        optionsDiv.appendChild(label)
        optionsDiv.appendChild(input)
      }

      const subtitleManager = torrents[j].querySelector('#subtitle_manager');
      const upscaleChecker = subtitleManager.cloneNode(true);
      upscaleChecker.id = 'upscaleChecker';

      const status = document.createElement('span');
      status.textContent = '';
      status.id = 'status_upscale_check';

      upscaleChecker.innerHTML = '<span style="font-weight: bold;">Check for upscales:</span>';
      const container = document.createElement('div');
      container.style.cssText = 'width: 100%;';
      const button = document.createElement('button');
      button.textContent = 'Generate';
      button.addEventListener('click', () => { if (!status.textContent) { handleConversions(upscaleChecker, status, options); } });
      button.style.cssText = 'margin: 10px; margin-left: 0px; margin-bottom: 0px;';

      container.appendChild(optionsDiv)
      container.appendChild(button);
      container.appendChild(status);

      upscaleChecker.appendChild(container);
      subtitleManager.parentNode.insertBefore(upscaleChecker, subtitleManager);
    }
}

main()
