// ==UserScript==
// @name         PTP - Upscale Checker
// @namespace    ree meow
// @version      1.1
// @description  Converts images to SD then back to HD and makes a comparison so you can check for upscales
// @author       Ghastly & vevv
// @match        https://passthepopcorn.me/torrents.php?id=*
// @match        https://passthepopcorn.me/torrents.php*&id=*
// @connet       ptpimg.me
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const torrents = document.querySelectorAll('.torrent_info_row');

let hosts = ["imgbb"]

async function drawImage (canvas, image, width, height, text) {
  canvas.width = width;
  canvas.height = height;
  let ctx = canvas.getContext('2d');
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
      let url = window.URL.createObjectURL(blob, { type: 'image/png' });
      resolve(url);
    });
  });
}

async function convertImage (imageUrl, width, height, target) {
  return new Promise(async (resolve, reject) => {
    let [w, h] = await getScale(width, height, target);

    let canvas = document.createElement('canvas');
    let img1 = new Image();
    let resized;
    img1.crossOrigin = 'Anonymous'; // cors support

    img1.onload = async function () {
      drawImage(canvas, img1, w, h);
      resized = await getCanvasUrl(canvas);

      let img2 = new Image();
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

async function storeImageLocally (imageUrl, type, raw) {
  return new Promise((resolve, reject) => {
    let start = Date.now();
    GM_xmlhttpRequest({
      method: 'GET',
      url: imageUrl,
      responseType: !raw ? 'blob' : "text",
      onload: async function (response) {
        console.log(Date.now() - start);
        if (response.status === 200) {
          if(raw) {
            //console.log(response.responseText)
            resolve(response.responseText)
          } else {
            const file = window.URL.createObjectURL(response.responseXML, { type: 'image/png' });
            resolve(file);
          }
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
  let widthInfo = group.previousElementSibling.querySelector("a[href='#']:not(.sendtoclient)")
  let resSection = widthInfo.innerText.split(" / ")[3];

  let height = resSection.includes("x") ? resSection.split('x')[1] : resSection.replace("p", "");

  if(height == "PAL") height = "576"
  if(height == "NTSC") height = "480"

  return height;
}

async function addBBcodeComp (bbcodeData, element, options, group) {
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
  let local = typeof hosts.find(a => img.src.includes(a)) == "undefined" ? await storeImageLocally(img.src, "image/png", false) : img.src
  let promises = [];
  for(let i = 0; i < options.length; i++) {
    if(options[i].checked) {
      promises.push(convertImage(local, img.naturalWidth, img.naturalHeight, parseInt(options[i].value)));
    }
  }
  let generatedImages = [{"type": "source", link: local}];
  await Promise.all(promises).then((values) => {
    generatedImages.push(...values);
  });
  return generatedImages;
}

async function handleConversions (element, status, options, group) {
  status.textContent = 'Generating conversions...';
  let parent = element.parentElement;

  let images = parent.querySelectorAll('.bbcode__image');
  let promises = [];
  let bbcodeComp = [];

  for (let i = 0; i < images.length; i++) {
    promises.push(handleConversion(images[i], options));
  }

  await Promise.all(promises).then((values) => {
    let idkree = values.flat(1)
    bbcodeComp.push(... values.flat(1));
  });
  status.textContent = '';
  await addBBcodeComp(bbcodeComp, status, options, group);
}
function setInnerHtml(el, html) {
  el.innerHTML = html;
  // Get all the scripts from the new HTML
  const scripts = el.querySelectorAll('script');

  // Loop through all the scripts
  for (let i = 0; i < scripts.length; i++)
  {
    // Create a new script
    const s = document.createElement('script');

    // Go through all the attributes on the script
    for (let j = 0; j < scripts[i].attributes.length; j++) {
      const a = scripts[i].attributes[j];
      // Add each attribute to the new script
      s.setAttribute(a.name, a.value);
    }

    // Incase there is code inside the script tag
    // Example: <script>alert</script>
    s.innerHTML = scripts[i].innerHTML;

    // Append the new script to the head (you could change this to the end of the body as well)
    document.head.appendChild(s);
  }
}

async function ree() {
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
    let grouped = true;
    let groupLabel = document.createElement("label")
    groupLabel.forHTML = "option_group";
    groupLabel.textContent = "Group:"
    groupLabel.style.cssText = "margin-right: 5px;"

    let groupInput = document.createElement('input')
    groupInput.type = "checkbox"
    groupInput.name = "option_group";
    groupInput.style.cssText = "margin-right: 10px;"
    groupInput.checked = grouped
    groupInput.addEventListener("click", () => { grouped = !grouped})

    let subtitleManager = torrents[j].querySelector('#subtitle_manager');
    let upscaleChecker = subtitleManager.cloneNode(true);
    upscaleChecker.id = 'upscaleChecker';

    let status = document.createElement('span');
    status.textContent = '';
    status.id = 'status_upscale_check';
    status.style.cssText = "display:inline-flex; flex-direction: column;"

    upscaleChecker.innerHTML = '<span style="font-weight: bold;">Check for upscales:</span>';
    let container = document.createElement('div');
    container.style.cssText = 'width: 100%;';
    let button = document.createElement('button');
    button.textContent = 'Generate';
    button.addEventListener('click', () => { if (!status.textContent && !status.innerHTML.startsWith("<div")) { handleConversions(upscaleChecker, status, options, grouped); } });
    button.style.cssText = 'margin: 10px; margin-left: 0px; margin-bottom: 0px;';

    container.appendChild(optionsDiv)
    container.appendChild(button);
    container.appendChild(groupLabel)
    container.appendChild(groupInput)
    container.appendChild(status);

    upscaleChecker.appendChild(container);
    subtitleManager.parentNode.insertBefore(upscaleChecker, subtitleManager);
  }
}

ree()
