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

async function addBBcodeComp (bbcodeData, element) {
  const a = document.createElement('a');
  a.textContent = 'Show comparison';
  a.href = '#';

  a.addEventListener('click', () => {
    BBCode.ScreenshotComparisonToggleShow(a, ['Source', 'UpscaleCheck (480p)', 'UpscaleCheck (576p)'], bbcodeData);
    event.preventDefault();
  });
  element.appendChild(a);
}

async function handleConversion (img) {
  const local = await storeImageLocally(img.src);
  const promises = [];
  promises.push(convertImage(local, img.naturalWidth, img.naturalHeight, 480));
  promises.push(convertImage(local, img.naturalWidth, img.naturalHeight, 576));
  const generatedImages = [local];
  await Promise.all(promises).then((values) => {
    generatedImages.push(...values);
  });
  return generatedImages;
}

async function handleConversions (element, status) {
  status.textContent = 'Generating conversions...';

  const parent = element.parentElement;

  const images = parent.querySelectorAll('.bbcode__image');
  const promises = [];
  const bbcodeComp = [];

  for (let i = 0; i < images.length; i++) {
    promises.push(handleConversion(images[i]));
  }

  await Promise.all(promises).then((values) => {
    bbcodeComp.push(...values.flat(1));
  });

  status.textContent = '';
  await addBBcodeComp(bbcodeComp, status);
}

for (let j = 0; j < torrents.length; j++) {
  const subtitleManager = torrents[j].querySelector('#subtitleManager');
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
  button.addEventListener('click', () => { if (!status.textContent) { handleConversions(upscaleChecker, status); } });
  button.style.cssText = 'margin: 10px; margin-left: 0px; margin-bottom: 0px;';

  container.appendChild(button);
  container.appendChild(status);

  upscaleChecker.appendChild(container);
  subtitleManager.parentNode.insertBefore(upscaleChecker, subtitleManager);
}
