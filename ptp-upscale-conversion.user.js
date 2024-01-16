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
        ctx.font = '28px Inter sans'; // Font size and family
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#FFFFFF'; // White color for text
        ctx.strokeStyle = '#000000'; // Black color for outline
        ctx.lineWidth = 4; // Adjust outline width as needed
        ctx.shadowColor = '#000000'; // Black color for shadow
        ctx.shadowBlur = 2; // Adjust shadow blur as needed
        ctx.shadowOffsetX = 2; // Horizontal shadow offset
        ctx.shadowOffsetY = 2; // Vertical shadow offset
        ctx.strokeText(text, 15, height - 35); // Position text at bottom-left with a margin
        ctx.fillText(text, 15, height - 35); // Position text at bottom-left with a margin
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
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
        url = await getCanvasUrl(canvas)

        resolve({"type": target.toString(), link: url});
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

async function addBBcodeComp (bbcodeData, element, options, group) {
  console.log(group)
  if(group) {
    const a = document.createElement('a');
    a.textContent = 'Show comparison';
    a.href = '#';

    a.addEventListener('click', () => {
      let sources = ["Source"]
      for(let i = 0; i < options.length; i++) {
        if(options[i].checked) sources.push(`UpscaleCheck (${options[i].label})`)
        continue;
      }
      let links = [];
      for(let i = 0; i < bbcodeData.length; i++) {
        links.push(bbcodeData[i].link)
      }
      BBCode.ScreenshotComparisonToggleShow(a, sources, links);
      event.preventDefault();
    });
    element.appendChild(a);
  } else {
    for(let i = 0; i < options.length; i++) {
      let container = document.createElement("div");
      if(options[i].checked) {
        let a = document.createElement('a');
        a.textContent = 'Show comparison';
        a.href = '#';
        let sources = ["Source", `UpscaleCheck (${options[i].label})`]
        let data = []
        for(let j = 0; j < bbcodeData.length; j++) {
          if(bbcodeData[j].type == options[i].value || bbcodeData[j].type == "source") {
            data.push(bbcodeData[j].link)
          }
        }
        a.addEventListener('click', () => {
          BBCode.ScreenshotComparisonToggleShow(a, sources, data);
          event.preventDefault();
        });

        let compLabel = document.createElement("strong")
        compLabel.innerText = "Source, " + options[i].label + ": "
        container.appendChild(compLabel)
        container.appendChild(a);
        element.appendChild(container);

      }
    }
  }

}

async function handleConversion (img, options) {
  const local = await storeImageLocally(img.src);
  const promises = [];
  for(let i = 0; i < options.length; i++) {
    if(options[i].checked) {
      promises.push(convertImage(local, img.naturalWidth, img.naturalHeight, parseInt(options[i].value)));
    }
  }
  const generatedImages = [{"type": "source", link: local}];
  await Promise.all(promises).then((values) => {
    generatedImages.push(...values);
  });
  return generatedImages;
}

async function handleConversions (element, status, options, group) {
  status.textContent = 'Generating conversions...';
  const parent = element.parentElement;

  const images = parent.querySelectorAll('.bbcode__image');
  const promises = [];
  const bbcodeComp = [];

  for (let i = 0; i < images.length; i++) {
    promises.push(handleConversion(images[i], options));
  }

  await Promise.all(promises).then((values) => {
    let idkree = values.flat(1)
    console.log(idkree)
    bbcodeComp.push(... values.flat(1));
    // console.log(typeof bbcodeComp[idkree.type])
    // for(let i = 0; i < idkree.length; i++) {
    //   if(typeof bbcodeComp[idkree[i].type] === 'undefined') bbcodeComp[idkree[i].type] = [];
    //   bbcodeComp[idkree[i].type].push(idkree[i].link);
    // }

  });
  status.textContent = '';
  await addBBcodeComp(bbcodeComp, status, options, group);
}
async function main() {
  for (let j = 0; j < torrents.length; j++) {
    let height = await getResolution(torrents[j])
    let options = []
    if(parseInt(height) <= 576) continue;
    if(parseInt(height) == 720)  options = [{value: "576", label: "576p", checked: true}, {value: "480", label: "480p", checked:true}]
    if(parseInt(height) == 1080)  options = [{value: "720", label: "720p", checked:true}, {value: "576", label: "576p", checked:true}, {value: "480", label: "480p", checked:false}]
    if(parseInt(height) == 2160)  options = [{value: "1080", label: "1080p", checked:true}, {value: "720", label: "720p", checked:true}, {value: "576", label: "576p", checked:false}, {value: "480", label: "480p", checked:false}]

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

    let groupSelector = document.createElement("select")
    groupSelector.name = "group_selector"
    let labelGroup = document.createElement("label")
    labelGroup.forHTML = "group_selector"
    labelGroup.textContent = "Group Comps"
    let selectYes = document.createElement('option')
    selectYes.text = "Yes"
    selectYes.value = true;
    let groupOptions = true;
    groupSelector.addEventListener('change',e => {
      groupOptions = !groupOptions;
    });
    let selectNo = document.createElement('option')
    selectNo.text = "No"
    selectNo.value = false;

    groupSelector.options.add(selectYes, 1)
    groupSelector.options.add(selectNo, 2)
    optionsDiv.appendChild(labelGroup)
    optionsDiv.appendChild(groupSelector)

    const subtitleManager = torrents[j].querySelector('#subtitle_manager');
    const upscaleChecker = subtitleManager.cloneNode(true);
    upscaleChecker.id = 'upscaleChecker';

    const status = document.createElement('span');
    status.textContent = '';
    status.id = 'status_upscale_check';
    status.style.cssText = "display:inline-flex; flex-direction: column;"

    upscaleChecker.innerHTML = '<span style="font-weight: bold;">Check for upscales:</span>';
    const container = document.createElement('div');
    container.style.cssText = 'width: 100%;';
    const button = document.createElement('button');
    button.textContent = 'Generate';
    button.addEventListener('click', () => { if (!status.textContent ) { handleConversions(upscaleChecker, status, options, groupOptions); } });
    button.style.cssText = 'margin: 10px; margin-left: 0px; margin-bottom: 0px;';

    container.appendChild(optionsDiv)
    container.appendChild(button);
    container.appendChild(status);

    upscaleChecker.appendChild(container);
    subtitleManager.parentNode.insertBefore(upscaleChecker, subtitleManager);
  }
}

main()
